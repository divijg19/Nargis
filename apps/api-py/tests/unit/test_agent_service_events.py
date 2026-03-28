from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import cast
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from services.agent_service import run_agent_pipeline


class _FakeAgentApp:
    async def astream_events(
        self, _input_payload, config=None, version: str = "v1"
    ) -> AsyncGenerator[dict, None]:
        # Simulate a tool finishing and a model streaming output.
        yield {
            "event": "on_tool_end",
            "name": "test_tool",
            "data": {"output": {"ok": True}},
        }
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": {"content": "hello"}},
        }


class _DummyTx:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class _FakeDB:
    def in_transaction(self) -> bool:
        return False

    def begin(self):
        return _DummyTx()

    def begin_nested(self):
        return _DummyTx()


@pytest.mark.asyncio
async def test_run_agent_pipeline_emits_tool_result_with_result_key():
    fake_graph = SimpleNamespace(
        agent_app=_FakeAgentApp(),
        build_agent_runnable_config=lambda user_id, db: {
            "configurable": {"user_id": user_id, "db": db}
        },
    )

    with (
        patch("services.agent_service.agent_graph", fake_graph),
    ):
        chunks = []
        async for b in run_agent_pipeline(
            user_input="hi",
            user_id="u1",
            db=cast(Session, _FakeDB()),
            stream_events=True,
        ):
            chunks.append(b)

    lines = b"".join(chunks).decode().strip().split("\n")
    events = [json.loads(line) for line in lines if line.strip()]

    tool_results = [e for e in events if e.get("type") == "tool_result"]
    assert tool_results, "expected at least one tool_result event"

    evt = tool_results[0]
    assert evt.get("tool") == "test_tool"
    # Canonical key
    assert "result" in evt
    assert isinstance(evt.get("result"), str)
    # Backwards-compatible alias
    assert "output" in evt
    assert evt.get("output") == evt.get("result")
