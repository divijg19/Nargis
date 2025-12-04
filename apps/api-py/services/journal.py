from __future__ import annotations

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from storage.models import JournalEntry


def entry_to_dict(e: JournalEntry) -> dict:
    return {
        "id": e.id,
        "userId": e.user_id,
        "title": e.title,
        "content": e.content,
        "aiSummary": e.ai_summary,
        "createdAt": e.created_at.isoformat() if e.created_at else None,
        "updatedAt": e.updated_at.isoformat() if e.updated_at else None,
    }


def _extractive_summary(text: str, max_chars: int = 200) -> str:
    if not text:
        return ""
    # simple heuristic: first sentence or truncated start
    sentences = text.strip().split(".")
    if sentences and sentences[0].strip():
        s = sentences[0].strip()
        if len(s) <= max_chars:
            return s + ('.' if not s.endswith('.') else '')
    return (text.strip()[:max_chars]).rstrip()


def create_entry_service(payload: Dict[str, Any], user_id: str, db: Session) -> dict:
    ai_summary = payload.get("aiSummary")
    if not ai_summary:
        ai_summary = _extractive_summary(payload.get("content", ""))

    entry = JournalEntry(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=payload.get("title"),
        content=payload.get("content"),
        ai_summary=ai_summary,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry_to_dict(entry)


def list_entries_service(user_id: str, db: Session) -> List[dict]:
    results = db.query(JournalEntry).filter(JournalEntry.user_id == user_id).all()
    return [entry_to_dict(e) for e in results]


def get_entry_service(entry_id: str, user_id: str, db: Session) -> Optional[dict]:
    e = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not e:
        return None
    if e.user_id != user_id:
        return None
    return entry_to_dict(e)


def update_entry_service(
    entry_id: str, patch: Dict[str, Any], user_id: str, db: Session
) -> Optional[dict]:
    e = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not e:
        return None
    if e.user_id != user_id:
        return None
    if "title" in patch:
        e.title = patch["title"]
    if "content" in patch:
        e.content = patch["content"]
    if "aiSummary" in patch:
        e.ai_summary = patch["aiSummary"]
    else:
        # regenerate summary if content changed and aiSummary not explicitly set
        if "content" in patch:
            e.ai_summary = _extractive_summary(e.content)
    e.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(e)
    return entry_to_dict(e)


def delete_entry_service(entry_id: str, user_id: str, db: Session) -> bool:
    e = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not e:
        return False
    if e.user_id != user_id:
        return False
    db.delete(e)
    db.commit()
    return True


def generate_summary_service(entry_id: str, user_id: str, db: Session) -> Optional[dict]:
    e = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not e:
        return None
    if e.user_id != user_id:
        return None
    summary = _extractive_summary(e.content)
    e.ai_summary = summary
    e.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(e)
    return entry_to_dict(e)
