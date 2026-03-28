from services.memory_service import create_memory, search_memories
from storage.database import get_session_now
from storage.models import User


def ensure_user(db, uid: str):
    u = db.get(User, uid)
    if not u:
        u = User(id=uid, email=f"{uid}@example.com", password_hash="x")
        db.add(u)
        db.commit()
        db.refresh(u)
    return u


def test_create_and_search_memory():
    uid = "test-user"
    vec = [0.05] * 1536
    with get_session_now() as db:
        user = ensure_user(db, uid)
        created = create_memory(db, user.id, "Unit test memory", vec)
        assert created["user_id"] == user.id

        results = search_memories(db, user.id, vec, limit=5)
        assert isinstance(results, list)
        assert any(r["id"] == created["id"] for r in results)


def test_search_memories_uses_text_fallback_for_low_similarity():
    uid = "test-user-hybrid"
    with get_session_now() as db:
        user = ensure_user(db, uid)
        create_memory(db, user.id, "Prepare meeting slides for Monday", [0.12] * 1536)
        create_memory(db, user.id, "Buy groceries tonight", [0.87] * 1536)

        # Intentionally use a far query vector to force weak vector relevance,
        # then rely on query_text fallback against content.
        results = search_memories(
            db,
            user.id,
            [0.99] * 1536,
            limit=3,
            query_text="meeting",
        )

        assert isinstance(results, list)
        assert any("meeting" in r["content"].lower() for r in results)
