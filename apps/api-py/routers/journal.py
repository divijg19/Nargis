from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from storage.memory import journal_repo, idempotent_post
from routers.auth import get_current_user

router = APIRouter(prefix="/v1/journal", tags=["journal"])


class JournalEntryCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: str = Field(..., min_length=1)
    type: str = Field(default="text")  # "text" | "voice"
    mood: Optional[str] = None  # "great" | "good" | "neutral" | "bad" | "terrible"
    tags: Optional[List[str]] = Field(default_factory=list)
    audioUrl: Optional[str] = None


class JournalEntryUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    type: Optional[str] = None
    mood: Optional[str] = None
    tags: Optional[List[str]] = None
    audioUrl: Optional[str] = None
    aiSummary: Optional[str] = None


@router.get("", response_model=List[dict])
async def list_entries(current_user: dict = Depends(get_current_user)):
    """List all journal entries for the current user, sorted by creation date (newest first)"""
    entries = await journal_repo.list()
    # Filter by user ID
    user_entries = [e for e in entries if e.get("userId") == current_user["id"]]
    # Sort by createdAt descending
    return sorted(user_entries, key=lambda x: x.get("createdAt", ""), reverse=True)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_entry(
    payload: JournalEntryCreate,
    current_user: dict = Depends(get_current_user),
    Idempotency_Key: Optional[str] = Header(default=None, convert_underscores=False)
):
    """Create a new journal entry"""
    key = Idempotency_Key or None
    entry_data = payload.model_dump()
    
    # Add user ID to the entry
    entry_data["userId"] = current_user["id"]
    
    # Generate AI summary if content is provided
    if entry_data.get("content"):
        # Simple extractive summary: first sentence + note about length
        content = entry_data["content"]
        sentences = content.split(". ")
        first_sentence = sentences[0] if sentences else content[:100]
        entry_data["aiSummary"] = f"{first_sentence}..."
    
    if key:
        record, replay = await idempotent_post(key, journal_repo.create(entry_data))
        if replay:
            return record
        return record
    return await journal_repo.create(entry_data)


@router.get("/{entry_id}")
async def get_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific journal entry by ID"""
    entry = await journal_repo.get(entry_id)
    if not entry:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "ENTRY_NOT_FOUND", "message": f"No entry with id: {entry_id}"}}
        )
    
    # Verify ownership
    if entry.get("userId") != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "You do not have access to this entry"}}
        )
    
    return entry


@router.patch("/{entry_id}")
async def update_entry(entry_id: str, patch: JournalEntryUpdate, current_user: dict = Depends(get_current_user)):
    """Update a journal entry"""
    # Check if entry exists and user owns it
    entry = await journal_repo.get(entry_id)
    if not entry:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "ENTRY_NOT_FOUND", "message": f"No entry with id: {entry_id}"}}
        )
    
    # Verify ownership
    if entry.get("userId") != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "You do not have access to this entry"}}
        )
    
    updated = await journal_repo.update(entry_id, patch.model_dump(exclude_unset=True))
    return updated


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a journal entry"""
    # Check if entry exists and user owns it
    entry = await journal_repo.get(entry_id)
    if not entry:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "ENTRY_NOT_FOUND", "message": f"No entry with id: {entry_id}"}}
        )
    
    # Verify ownership
    if entry.get("userId") != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "You do not have access to this entry"}}
        )
    
    await journal_repo.delete(entry_id)
    return None


@router.post("/{entry_id}/summary")
async def generate_summary(entry_id: str, current_user: dict = Depends(get_current_user)):
    """Generate or regenerate AI summary for an entry"""
    entry = await journal_repo.get(entry_id)
    if not entry:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "ENTRY_NOT_FOUND", "message": f"No entry with id: {entry_id}"}}
        )
    
    # Verify ownership
    if entry.get("userId") != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "You do not have access to this entry"}}
        )
    
    content = entry.get("content", "")
    # Simple extractive summary
    sentences = content.split(". ")
    first_sentence = sentences[0] if sentences else content[:100]
    summary = f"{first_sentence}..."
    
    # Update entry with new summary
    updated = await journal_repo.update(entry_id, {"aiSummary": summary})
    return {"summary": summary, "entry": updated}
