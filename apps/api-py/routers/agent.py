from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from routers.auth import get_current_user
from services.agent_service import run_agent_pipeline
from storage.database import get_db

router = APIRouter(prefix="/v1/agent", tags=["agent"])

class TriggerRequest(BaseModel):
    trigger_type: str # "morning_briefing", "evening_review"

@router.post("/trigger")
async def trigger_agent(
    payload: TriggerRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Triggers the agent to perform a proactive action.
    Returns a stream of events.
    """
    if payload.trigger_type == "morning_briefing":
        prompt = (
            "It is morning. Please provide a briefing of my day based on my tasks "
            "and habits. Be concise and motivating."
        )
    elif payload.trigger_type == "evening_review":
        prompt = (
            "It is evening. Please ask me how my day went and review my progress. "
            "Ask if I have any thoughts to journal."
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid trigger type")

    async def event_stream():
        async for chunk in run_agent_pipeline(prompt, current_user["id"], db):
            yield chunk

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
