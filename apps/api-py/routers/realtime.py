from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from typing import Any

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from agent import graph as agent_graph
from agent.tools import set_agent_runtime_context
from routers.auth import ALGORITHM, SECRET_KEY
from services.ai_clients import _get_transcription
from storage.database import SessionLocal
from storage.models import User

router = APIRouter(tags=["realtime"])


async def _safe_send_json(websocket: WebSocket, payload: dict[str, Any]) -> bool:
    try:
        await websocket.send_json(payload)
        return True
    except Exception:
        logging.exception("Failed to send websocket frame")
        return False


def _decode_user_id(token: str) -> str:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("Missing subject in token")
    return str(user_id)


def _extract_token_from_frame(frame_text: str) -> str | None:
    """Accept either raw token text or JSON payload with {"token": "..."}."""
    candidate = (frame_text or "").strip()
    if not candidate:
        return None

    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            token = parsed.get("token")
            if isinstance(token, str) and token.strip():
                return token.strip()
    except Exception:
        pass

    return candidate


def _extract_user_text_from_frame(frame: Mapping[str, Any]) -> str:
    text = frame.get("text")
    if isinstance(text, str) and text.strip():
        return text.strip()

    data = frame.get("bytes")
    if isinstance(data, (bytes, bytearray)) and len(data) > 0:
        return ""

    raise ValueError("Expected non-empty text or audio bytes")


async def _resolve_ws_user(websocket: WebSocket, db: Session) -> str:
    token = websocket.query_params.get("token")

    # If query token is not present, expect first frame to carry auth info.
    if not token:
        await websocket.send_json(
            {
                "type": "thought",
                "content": "Awaiting authentication token...",
            }
        )
        auth_frame = await websocket.receive()
        auth_text = auth_frame.get("text")
        if not isinstance(auth_text, str):
            raise ValueError("Missing auth token")
        token = _extract_token_from_frame(auth_text)

    if not token:
        raise ValueError("Missing auth token")

    user_id = _decode_user_id(token)
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise ValueError("User not found")

    return user_id


@router.websocket("/ws/v1/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()

    with SessionLocal() as db:
        try:
            user_id = await _resolve_ws_user(websocket, db)
            if not await _safe_send_json(
                websocket,
                {
                    "type": "thought",
                    "content": "Connected. Send text or audio.",
                },
            ):
                return

            while True:
                frame = await websocket.receive()
                msg_type = frame.get("type")
                if msg_type == "websocket.disconnect":
                    break

                user_text = ""
                audio_bytes = frame.get("bytes")

                if isinstance(audio_bytes, (bytes, bytearray)) and len(audio_bytes) > 0:
                    if not await _safe_send_json(
                        websocket,
                        {
                            "type": "thought",
                            "content": "Transcribing audio...",
                        },
                    ):
                        break
                    user_text = (await _get_transcription(bytes(audio_bytes))).strip()
                else:
                    user_text = _extract_user_text_from_frame(frame)

                if not user_text:
                    await _safe_send_json(
                        websocket,
                        {
                            "type": "error",
                            "content": "Empty input received.",
                        },
                    )
                    continue

                input_payload = {
                    "messages": [
                        {"role": "user", "content": user_text},
                    ]
                }

                if not getattr(agent_graph, "agent_app", None) or not hasattr(
                    agent_graph.agent_app, "astream_events"
                ):
                    await _safe_send_json(
                        websocket,
                        {
                            "type": "error",
                            "content": "Agent runtime unavailable.",
                        },
                    )
                    continue

                response_parts: list[str] = []
                tx_ctx = db.begin_nested() if db.in_transaction() else db.begin()
                agent_config = agent_graph.build_agent_runnable_config(user_id, db)

                try:
                    with tx_ctx:
                        with set_agent_runtime_context(user_id, db):
                            async for event in agent_graph.agent_app.astream_events(
                                input_payload,
                                config=agent_config,
                                version="v1",
                            ):
                                kind = event.get("event") if event else None
                                if kind == "on_tool_start":
                                    tool_name = str(event.get("name") or "tool")
                                    tool_input = event.get("data", {}).get("input")
                                    if isinstance(tool_input, (dict, list)):
                                        tool_input = json.dumps(tool_input)
                                    if not await _safe_send_json(
                                        websocket,
                                        {
                                            "type": "thought",
                                            "content": f"Using tool: {tool_name}",
                                        },
                                    ):
                                        break
                                    if not await _safe_send_json(
                                        websocket,
                                        {
                                            "type": "tool_use",
                                            "tool": tool_name,
                                            "input": str(tool_input)[:400],
                                        },
                                    ):
                                        break
                                elif kind == "on_chat_model_stream":
                                    chunk = event.get("data", {}).get("chunk", {})
                                    content = (
                                        chunk.get("content")
                                        if isinstance(chunk, dict)
                                        else None
                                    )
                                    if isinstance(content, str) and content:
                                        response_parts.append(content)
                except Exception:
                    logging.exception("Unhandled exception during agent astream_events")
                    await _safe_send_json(
                        websocket,
                        {
                            "type": "error",
                            "content": "Agent stream failed. Please retry.",
                        },
                    )
                    break

                if response_parts:
                    if not await _safe_send_json(
                        websocket,
                        {
                            "type": "response",
                            "content": "".join(response_parts),
                        },
                    ):
                        break
                else:
                    if not await _safe_send_json(
                        websocket,
                        {
                            "type": "response",
                            "content": "",
                        },
                    ):
                        break

        except WebSocketDisconnect:
            logging.info("WebSocket disconnected")
        except jwt.ExpiredSignatureError:
            await _safe_send_json(
                websocket,
                {
                    "type": "error",
                    "content": "Token has expired.",
                },
            )
        except Exception as exc:
            logging.exception("Realtime websocket error")
            await _safe_send_json(
                websocket,
                {
                    "type": "error",
                    "content": str(exc),
                },
            )
        finally:
            try:
                await websocket.close()
            except Exception:
                pass
