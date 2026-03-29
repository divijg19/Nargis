from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from typing import Any, cast

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from routers.auth import get_optional_user
from services.agent_service import run_agent_pipeline
from storage.database import get_db

router = APIRouter()


@router.post("/api/v1/process-audio")
async def process_audio_pipeline(
    request: Request,
    audio_file: UploadFile = File(...),
    mode: str = Query("chat", description="chat (default) or agent"),
    current_user: dict | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Stream agent events and final response as NDJSON lines.
    Protocol:
      {"type": "thought", "content": "..."}
      {"type": "tool_use", "tool": "...", "input": "..."}
      {"type": "response", "content": "..."}
      {"type": "error", "content": "..."}
    """
    from services.ai_clients import _get_llm_response, _get_transcription

    mode_norm = (mode or "chat").strip().lower()
    if mode_norm not in {"chat", "agent"}:
        raise HTTPException(
            status_code=400,
            detail='Invalid mode. Must be either "chat" or "agent".',
        )
    if mode_norm == "agent" and current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    user_id: str | None = None
    if mode_norm == "agent":
        user = cast(dict[str, Any], current_user)
        user_id = str(user["id"])

    audio_bytes = await audio_file.read()
    try:
        transcribed_text = await _get_transcription(audio_bytes)
    except HTTPException as exc:
        logging.warning("STT failure treated as empty transcript: %s", exc.detail)
        transcribed_text = ""

    if not transcribed_text or not transcribed_text.strip():

        async def empty_stream() -> AsyncGenerator[bytes, None]:
            yield (
                json.dumps({"type": "response", "content": "I didn't catch that."})
                + "\n"
            ).encode()
            yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()

        return StreamingResponse(empty_stream(), media_type="application/x-ndjson")

    async def event_stream() -> AsyncGenerator[bytes, None]:
        try:
            yield (
                json.dumps({"type": "transcript", "content": transcribed_text}) + "\n"
            ).encode()

            if mode_norm == "chat":
                if current_user is None:
                    yield (
                        json.dumps(
                            {
                                "type": "thought",
                                "content": "Guest mode — sign in to save history.",
                            }
                        )
                        + "\n"
                    ).encode()

                llm_result = await _get_llm_response(transcribed_text)
                assistant_text = None
                if isinstance(llm_result, dict):
                    choices = llm_result.get("choices")
                    if (
                        isinstance(choices, list)
                        and len(choices) > 0
                        and isinstance(choices[0], dict)
                    ):
                        message = choices[0].get("message")
                        if isinstance(message, dict):
                            assistant_text = message.get("content")
                if not assistant_text:
                    assistant_text = (
                        llm_result.get("reply")
                        or llm_result.get("output")
                        or llm_result.get("text")
                    )
                if not assistant_text:
                    assistant_text = str(llm_result)
                yield (
                    json.dumps({"type": "response", "content": assistant_text}) + "\n"
                ).encode()
                yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()
                return

            assert user_id is not None
            async for chunk in run_agent_pipeline(transcribed_text, user_id, db):
                if await request.is_disconnected():
                    break
                yield chunk
        except Exception:
            logging.exception("Error in event stream")
            yield (
                json.dumps({"type": "error", "content": "Something went wrong."}) + "\n"
            ).encode()
            yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()
        return

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
