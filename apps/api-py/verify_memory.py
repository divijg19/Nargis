from __future__ import annotations

import uuid
from datetime import UTC, datetime

from services.memory import create_memory, search_memories
from storage.database import get_session_now
from storage.models import Memory, User

TEST_EMAIL = "memory-test@example.com"


def main() -> None:
    embedding: list[float] = [0.1] * 1536

    with get_session_now() as db:
        # Ensure test user
        user = db.query(User).filter(User.email == TEST_EMAIL).first()
        created_user = False
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email=TEST_EMAIL,
                password_hash="test",
                name="Memory Test",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_user = True
            print(f"Created test user: {user.id}")

        # Insert memory
        created = create_memory(db, user.id, "Integration test memory", embedding)
        mem_id = created.get("id")
        print(f"Inserted memory id: {mem_id}")

        # Query via vector search
        results = search_memories(db, user.id, embedding, limit=5)
        if results and any(r.get("id") == mem_id for r in results):
            print("SUCCESS: Memory retrieved")
        else:
            print("FAILURE: Memory not found in search results")

        # Cleanup
        try:
            if mem_id is not None:
                db.query(Memory).filter(Memory.id == mem_id).delete()
            if created_user:
                db.query(User).filter(User.id == user.id).delete()
            db.commit()
            print("Cleaned up test data")
        except Exception as e:
            db.rollback()
            print("Cleanup failed:", e)


if __name__ == "__main__":
    main()
