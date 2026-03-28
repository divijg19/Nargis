from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from storage.models import Memory

try:
    PGVECTOR_AVAILABLE = True
except Exception:
    PGVECTOR_AVAILABLE = False

# Try to import the runtime/value wrapper for pgvector so we can bind
# proper pgvector values when inserting/searching. This is optional.
try:
    from pgvector import Vector as PgVector

    PGVECTOR_VALUE_AVAILABLE = True
except Exception:
    PgVector: Any = None
    PGVECTOR_VALUE_AVAILABLE = False


def _mem_to_dict(m: Memory) -> dict[str, Any]:
    return {
        "id": m.id,
        "user_id": m.user_id,
        "content": m.content,
        "created_at": m.created_at.isoformat()
        if getattr(m, "created_at", None)
        else None,
    }


def create_memory(
    db: Session, user_id: str, content: str, embedding_vector: list[float]
) -> dict[str, Any]:
    m = Memory(user_id=user_id, content=content, created_at=datetime.now(UTC))
    m_any = cast(Any, m)
    # Prefer using the pgvector runtime wrapper when available so the DB
    # receives a properly-typed parameter. If that's not possible we leave
    # the plain list which may map to JSON or trigger the fallback path.
    if PGVECTOR_VALUE_AVAILABLE and PGVECTOR_AVAILABLE:
        try:
            m_any.embedding = cast(Any, PgVector)(embedding_vector)
        except Exception:
            m_any.embedding = embedding_vector
    else:
        m_any.embedding = embedding_vector
    db.add(m)
    try:
        db.commit()
        db.refresh(m)
        return _mem_to_dict(m)
    except Exception:
        # Roll back the failed ORM attempt and insert using raw SQL casting.
        # We try to keep the literal formatting tight to avoid driver-casting
        # issues encountered previously. This is a last-resort fallback.
        db.rollback()
        vec_literal = "[" + ",".join([str(float(x)) for x in embedding_vector]) + "]"
        sql = text(
            "INSERT INTO memories (user_id, content, embedding, created_at) "
            f"VALUES (:user_id, :content, '{vec_literal}'::vector, :created_at) "
            "RETURNING id, created_at"
        )
        params = {
            "user_id": user_id,
            "content": content,
            "created_at": datetime.now(UTC),
        }
        result = db.execute(sql, params)
        row = result.fetchone()
        db.commit()
        if row:
            return {
                "id": row[0],
                "user_id": user_id,
                "content": content,
                "created_at": row[1].isoformat(),
            }
        # If that also fails, raise to surface the error
        raise


def search_memories(
    db: Session,
    user_id: str,
    query_vector: list[float],
    limit: int = 3,
    query_text: str | None = None,
) -> list[dict[str, Any]]:
    min_similarity = 0.55
    vector_rows: list[tuple[Memory, float | None]] = []

    if PGVECTOR_AVAILABLE:
        # Vector-first retrieval: rank by cosine similarity.
        try:
            qparam = query_vector
            if PGVECTOR_VALUE_AVAILABLE:
                try:
                    qparam = cast(Any, PgVector)(query_vector)
                except Exception:
                    qparam = query_vector

            similarity = (1 - Memory.embedding.cosine_distance(qparam)).label(
                "similarity"
            )
            stmt = (
                select(Memory, similarity)
                .where(Memory.user_id == user_id)
                .order_by(similarity.desc(), Memory.created_at.desc(), Memory.id.desc())
                .limit(limit)
            )
            vector_rows = [
                (row[0], float(row[1]) if row[1] is not None else None)
                for row in db.execute(stmt).all()
            ]

            if vector_rows:
                top_similarity = vector_rows[0][1]
                if top_similarity is not None and top_similarity >= min_similarity:
                    return [_mem_to_dict(row[0]) for row in vector_rows]
        except Exception:
            vector_rows = []

    # Hybrid fallback: if vector retrieval is weak, run text search on content.
    text_query = (query_text or "").strip()
    if text_query:
        like_pattern = f"%{text_query}%"
        text_stmt = (
            select(Memory)
            .where(Memory.user_id == user_id, Memory.content.ilike(like_pattern))
            .order_by(Memory.created_at.desc(), Memory.id.desc())
            .limit(limit)
        )
        text_rows = db.scalars(text_stmt).all()
        if text_rows:
            return [_mem_to_dict(r) for r in text_rows]

    if vector_rows:
        return [_mem_to_dict(row[0]) for row in vector_rows]

    # Final fallback: simple recency-based retrieval.
    stmt = (
        select(Memory)
        .where(Memory.user_id == user_id)
        .order_by(Memory.created_at.desc())
        .limit(limit)
    )
    rows = db.scalars(stmt).all()
    return [_mem_to_dict(r) for r in rows]
