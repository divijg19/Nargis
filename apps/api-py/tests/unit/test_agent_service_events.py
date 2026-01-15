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
        self, _input_payload, version: str = "v1"
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


@pytest.mark.asyncio
async def test_run_agent_pipeline_emits_tool_result_with_result_key():
    fake_graph = SimpleNamespace(agent_app=_FakeAgentApp())

    with (
        patch("services.agent_service.agent_graph", fake_graph),
        patch("services.agent_service.get_system_context", return_value="ctx"),
    ):
        chunks = []
        async for b in run_agent_pipeline(
            user_input="hi",
            user_id="u1",
            db=cast(
                Session, object()
            ),  # get_system_context is patched, so db is unused here
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


class _LargeResponseAgentApp:
    """Agent that generates a very long response to test size limits."""
    
    async def astream_events(
        self, _input_payload, version: str = "v1"
    ) -> AsyncGenerator[dict, None]:
        # Generate chunks that exceed MAX_RESPONSE_LENGTH (50000 chars)
        # Each chunk is 1000 chars, yield 60 chunks = 60000 chars total
        chunk = "x" * 1000
        for _ in range(60):
            yield {
                "event": "on_chat_model_stream",
                "data": {"chunk": {"content": chunk}},
            }


@pytest.mark.asyncio
async def test_run_agent_pipeline_enforces_response_size_limit():
    """Test that response parts are limited to prevent unbounded memory growth."""
    fake_graph = SimpleNamespace(agent_app=_LargeResponseAgentApp())

    with (
        patch("services.agent_service.agent_graph", fake_graph),
        patch("services.agent_service.get_system_context", return_value="ctx"),
    ):
        chunks = []
        async for b in run_agent_pipeline(
            user_input="hi",
            user_id="u1",
            db=cast(Session, object()),
            stream_events=True,
        ):
            chunks.append(b)

    lines = b"".join(chunks).decode().strip().split("\n")
    events = [json.loads(line) for line in lines if line.strip()]

    # Find the response event
    responses = [e for e in events if e.get("type") == "response"]
    assert responses, "expected a response event"
    
    response_content = responses[0].get("content", "")
    # Response should be limited to MAX_RESPONSE_LENGTH (50000)
    # The agent produces 60000 chars, so we should see exactly 50000
    assert len(response_content) == 50000, f"Expected 50000 chars, got {len(response_content)}"
    # Content should be all 'x' characters (from our test agent)
    assert response_content == "x" * 50000
