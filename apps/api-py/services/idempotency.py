from __future__ import annotations

from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

from sqlalchemy.orm import Session

from storage.models import IdempotencyKey


def get_idempotent_response(db: Session, key: str, user_id: Optional[str], method: str, path: str) -> Optional[Dict[str, Any]]:
    if not key:
        return None
    rec = (
        db.query(IdempotencyKey)
        .filter(IdempotencyKey.key == key, IdempotencyKey.method == method, IdempotencyKey.path == path)
        .order_by(IdempotencyKey.created_at.desc())
        .first()
    )
    if not rec:
        return None
    # If stored but tied to another user, treat as absent
    if rec.user_id and user_id and rec.user_id != user_id:
        return None
    return {"status_code": rec.status_code, "response": rec.response}


def save_idempotent_response(db: Session, key: str, user_id: Optional[str], method: str, path: str, status_code: int, response: Dict[str, Any]) -> None:
    if not key:
        return
    rec = IdempotencyKey(
        id=str(uuid.uuid4()),
        key=key,
        user_id=user_id,
        method=method,
        path=path,
        status_code=int(status_code),
        response=response,
        created_at=datetime.now(timezone.utc),
    )
    db.add(rec)
    db.commit()


def prune_old_keys(db: Session, max_age_hours: int = 24) -> int:
    """Remove idempotency keys older than max_age_hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    deleted_count = (
        db.query(IdempotencyKey).filter(IdempotencyKey.created_at < cutoff).delete()
    )
    db.commit()
    return deleted_count
