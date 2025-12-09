"""Simple in-memory repositories for early Phase P2 before real DB.

Thread/process safety: Not guaranteed beyond single-process dev server.
Concurrency: Protected with basic locks for consistency.
Persistence: Ephemeral (resets on restart).
"""

from __future__ import annotations

import builtins
import threading
import uuid
from datetime import UTC, datetime
from typing import Any


class InMemoryRepo:
    def __init__(self):
        self._items: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    async def list(self) -> builtins.list[dict[str, Any]]:
        """Async-compatible list method for router compatibility"""
        with self._lock:
            return list(self._items.values())

    def list_all(self) -> builtins.list[dict[str, Any]]:
        """Sync list method (legacy)"""
        with self._lock:
            return list(self._items.values())

    async def get(self, item_id: str) -> dict[str, Any] | None:
        """Async-compatible get method"""
        with self._lock:
            return self._items.get(item_id)

    async def create(self, data: dict[str, Any]) -> dict[str, Any]:
        """Async-compatible create method"""
        with self._lock:
            now = datetime.now(UTC).isoformat()
            item_id = data.get("id") or str(uuid.uuid4())
            record = {
                **data,
                "id": item_id,
                "createdAt": data.get("createdAt", now),
                "updatedAt": data.get("updatedAt", now),
            }
            self._items[item_id] = record
            return record

    async def update(
        self, item_id: str, patch: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Async-compatible update method"""
        with self._lock:
            if item_id not in self._items:
                return None
            current = self._items[item_id]
            current.update({k: v for k, v in patch.items() if v is not None})
            current["updatedAt"] = datetime.now(UTC).isoformat()
            return current

    async def delete(self, item_id: str) -> bool:
        """Async-compatible delete method"""
        with self._lock:
            return self._items.pop(item_id, None) is not None


# Domain-specific repositories (can evolve with validation / indexing later)
tasks_repo = InMemoryRepo()
habits_repo = InMemoryRepo()
pomodoro_repo = InMemoryRepo()
goals_repo = InMemoryRepo()
journal_repo = InMemoryRepo()
users_repo = InMemoryRepo()  # User authentication


# Idempotency support for POST requests
_idempotency_cache: dict[str, dict[str, Any]] = {}
_idempotency_lock = threading.Lock()


async def idempotent_post(key: str, coro):
    """
    Simple idempotency: if key exists, return cached result
    instead of executing coro.
    """
    with _idempotency_lock:
        if key in _idempotency_cache:
            return _idempotency_cache[key], True  # (record, replay=True)

    # Execute the creation
    record = await coro

    with _idempotency_lock:
        _idempotency_cache[key] = record

    return record, False  # (record, replay=False)
