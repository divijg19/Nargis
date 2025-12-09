from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from routers.auth import get_current_user
from services.journal import (
    create_entry_service,
    delete_entry_service,
    generate_summary_service,
    get_entry_service,
    list_entries_service,
    update_entry_service,
)
from storage.database import get_db
from storage.models import JournalEntry

router = APIRouter(prefix="/v1/journal", tags=["journal"])


class JournalEntryCreate(BaseModel):
    title: str | None = Field(None, max_length=200)
    content: str = Field(..., min_length=1)
    type: Literal["text", "voice"] = Field(default="text")
    mood: Literal["great", "good", "neutral", "bad", "terrible"] | None = None
    tags: list[str] | None = Field(default_factory=list)
    audioUrl: str | None = None


class JournalEntryUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    type: Literal["text", "voice"] | None = None
    mood: Literal["great", "good", "neutral", "bad", "terrible"] | None = None
    tags: list[str] | None = None
    audioUrl: str | None = None
    aiSummary: str | None = None


@router.get("", response_model=list[dict[str, Any]])
async def list_entries(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int | None = None,
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
    Idempotency_Key: str | None = Header(default=None, convert_underscores=False),
    db: Session = Depends(get_db),
):
    entry_data = payload.model_dump()
    entry_data["userId"] = current_user["id"]
    from services.idempotency import get_idempotent_response, save_idempotent_response

    if Idempotency_Key:
        saved = get_idempotent_response(
            db, Idempotency_Key, current_user.get("id"), "POST", "/v1/journal"
        )
        if saved:
            return saved["response"]

    created = create_entry_service(entry_data, current_user["id"], db)

    if Idempotency_Key:
        save_idempotent_response(
            db,
            Idempotency_Key,
            current_user.get("id"),
            "POST",
            "/v1/journal",
            201,
            created,
        )

    return created


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
