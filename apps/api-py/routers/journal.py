from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from sqlalchemy.orm import Session

from storage.database import get_db
from storage.models import JournalEntry
from routers.auth import get_current_user

from services.journal import (
    create_entry_service,
    list_entries_service,
    get_entry_service,
    update_entry_service,
    delete_entry_service,
    generate_summary_service,
)

router = APIRouter(prefix="/v1/journal", tags=["journal"])


class JournalEntryCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: str = Field(..., min_length=1)
    type: Literal["text", "voice"] = Field(default="text")
    mood: Optional[Literal["great", "good", "neutral", "bad", "terrible"]] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    audioUrl: Optional[str] = None


class JournalEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[Literal["text", "voice"]] = None
    mood: Optional[Literal["great", "good", "neutral", "bad", "terrible"]] = None
    tags: Optional[List[str]] = None
    audioUrl: Optional[str] = None
    aiSummary: Optional[str] = None


@router.get("", response_model=List[Dict[str, Any]])
async def list_entries(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: Optional[int] = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
):
    return list_entries_service(
        current_user["id"],
        db,
        limit=limit,
        offset=offset,
        sort=sort,
        order=order,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_entry(
    payload: JournalEntryCreate,
    current_user: dict = Depends(get_current_user),
    Idempotency_Key: Optional[str] = Header(default=None, convert_underscores=False),
    db: Session = Depends(get_db),
):
    entry_data = payload.model_dump()
    entry_data["userId"] = current_user["id"]
    # idempotency handling can be added here; service will populate aiSummary if missing
    return create_entry_service(entry_data, current_user["id"], db)


@router.get("/{entry_id}")
async def get_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = get_entry_service(entry_id, current_user["id"], db)
    if not entry:
        e = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
        if not e:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "ENTRY_NOT_FOUND",
                        "message": f"No entry with id: {entry_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return entry


@router.patch("/{entry_id}")
async def update_entry(
    entry_id: str,
    patch: JournalEntryUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = update_entry_service(
        entry_id, patch.model_dump(exclude_unset=True), current_user["id"], db
    )
    if not updated:
        e = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
        if not e:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "ENTRY_NOT_FOUND",
                        "message": f"No entry with id: {entry_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return updated


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ok = delete_entry_service(entry_id, current_user["id"], db)
    if not ok:
        e = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
        if not e:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "ENTRY_NOT_FOUND",
                        "message": f"No entry with id: {entry_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return None


@router.post("/{entry_id}/summary")
async def generate_summary(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = generate_summary_service(entry_id, current_user["id"], db)
    if not result:
        e = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
        if not e:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "ENTRY_NOT_FOUND",
                        "message": f"No entry with id: {entry_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return {"summary": result.get("aiSummary"), "entry": result}
