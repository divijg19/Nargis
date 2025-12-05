from __future__ import annotations

from typing import List, Dict, Any
from datetime import datetime, timezone

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
    from pgvector import Vector as PgVector  # type: ignore
    PGVECTOR_VALUE_AVAILABLE = True
except Exception:
    PgVector = None
    PGVECTOR_VALUE_AVAILABLE = False


def _mem_to_dict(m: Memory) -> Dict[str, Any]:
    return {
        "id": m.id,
        "user_id": m.user_id,
        "content": m.content,
        "created_at": m.created_at.isoformat() if getattr(m, "created_at", None) else None,
    }


def create_memory(db: Session, user_id: str, content: str, embedding_vector: List[float]) -> Dict[str, Any]:
    m = Memory(user_id=user_id, content=content, created_at=datetime.now(timezone.utc))
    # Prefer using the pgvector runtime wrapper when available so the DB
    # receives a properly-typed parameter. If that's not possible we leave
    # the plain list which may map to JSON or trigger the fallback path.
    if PGVECTOR_VALUE_AVAILABLE and PGVECTOR_AVAILABLE:
        try:
            m.embedding = PgVector(embedding_vector)
        except Exception:
            m.embedding = embedding_vector
    else:
        m.embedding = embedding_vector
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
            f"INSERT INTO memories (user_id, content, embedding, created_at) VALUES (:user_id, :content, '{vec_literal}'::vector, :created_at) RETURNING id, created_at"
        )
        params = {
            "user_id": user_id,
            "content": content,
            "created_at": datetime.now(timezone.utc),
        }
        result = db.execute(sql, params)
        row = result.fetchone()
        db.commit()
        if row:
            return {"id": row[0], "user_id": user_id, "content": content, "created_at": row[1].isoformat()}
        # If that also fails, raise to surface the error
        raise


def search_memories(db: Session, user_id: str, query_vector: List[float], limit: int = 3) -> List[Dict[str, Any]]:
    if PGVECTOR_AVAILABLE:
        # Use SQLAlchemy + pgvector integration so the driver binds the vector
        # parameter with the correct type (avoids `vector <-> numeric[]` errors).
        try:
            # Wrap the query vector with the runtime PgVector wrapper when
            # available so the DB sees the correct type.
            qparam = query_vector
            if PGVECTOR_VALUE_AVAILABLE:
                try:
                    qparam = PgVector(query_vector)
                except Exception:
                    qparam = query_vector

            stmt = select(Memory).where(Memory.user_id == user_id).order_by(
                Memory.embedding.l2_distance(qparam)
            ).limit(limit)
            rows = db.scalars(stmt).all()
            return [_mem_to_dict(r) for r in rows]
        except Exception:
            # If the Vector expression isn't available or fails, fall back below.
            pass

    # Fallback: simple recency-based selection when pgvector unavailable
    stmt = select(Memory).where(Memory.user_id == user_id).order_by(Memory.created_at.desc()).limit(limit)
    rows = db.scalars(stmt).all()
    return [_mem_to_dict(r) for r in rows]
