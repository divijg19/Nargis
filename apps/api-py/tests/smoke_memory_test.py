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


if __name__ == "__main__":
    uid = "smoke-user"
    with get_session_now() as db:
        user = ensure_user(db, uid)
        print("Using user id:", user.id)
        created = create_memory(
            db, user.id, "This is a test memory about AI and pizza.", [0.1] * 1536
        )
        print("Created memory:", created)
        matches = search_memories(db, user.id, [0.1] * 1536, limit=3)
        print("Matches:")
        for m in matches:
            print(m)
