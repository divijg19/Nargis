"""Simple in-memory repositories for early Phase P2 before real DB.

Thread/process safety: Not guaranteed beyond single-process dev server.
Concurrency: Protected with asyncio.Lock for basic async consistency.
Persistence: Ephemeral (resets on restart).
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Dict, Optional, Any, List
from datetime import datetime


class InMemoryRepo:
    def __init__(self):
        self._items: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def list(self) -> List[Dict[str, Any]]:
        async with self._lock:
            return list(self._items.values())

    async def get(self, item_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._items.get(item_id)

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            now = datetime.utcnow().isoformat()
            item_id = data.get("id") or str(uuid.uuid4())
            record = {
                **data,
                "id": item_id,
                "created_at": now,
                "updated_at": now,
            }
            self._items[item_id] = record
            return record

    async def update(self, item_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if item_id not in self._items:
                return None
            current = self._items[item_id]
            current.update({k: v for k, v in patch.items() if v is not None})
            current["updated_at"] = datetime.utcnow().isoformat()
            return current

    async def delete(self, item_id: str) -> bool:
        async with self._lock:
            return self._items.pop(item_id, None) is not None


# Domain-specific repositories (can evolve with validation / indexing later)
tasks_repo = InMemoryRepo()
habits_repo = InMemoryRepo()
pomodoro_repo = InMemoryRepo()

# Simple idempotency cache (POST) – clears on restart
_idempotency_cache: Dict[str, Dict[str, Any]] = {}
_idempotency_lock = asyncio.Lock()


async def idempotent_post(key: str, create_coro):
    async with _idempotency_lock:
        if key in _idempotency_cache:
            return _idempotency_cache[key], True
    created = await create_coro
    async with _idempotency_lock:
        _idempotency_cache[key] = created
    return created, False
