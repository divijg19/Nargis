import json
from collections.abc import AsyncGenerator

from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy.orm import Session

from agent import graph as agent_graph
from services.ai_clients import _get_llm_response
from services.context import get_system_context


async def run_agent_pipeline(
    user_input: str, user_id: str, db: Session, stream_events: bool = True
) -> AsyncGenerator[bytes, None]:
    """
    Runs the agent pipeline with system context injection.
    Yields NDJSON events.
    """
    # Emit thought
    yield (json.dumps({"type": "thought", "content": "Processing…"}) + "\n").encode()

    # Check agent availability
    if not getattr(agent_graph, "agent_app", None) or not hasattr(
        agent_graph.agent_app, "astream_events"
    ):
        # Fallback
        llm_result = await _get_llm_response(user_input)
        final_text = (
            llm_result.get("reply")
            or llm_result.get("output")
            or llm_result.get("text")
            or str(llm_result)
        )
        yield (json.dumps({"type": "response", "content": final_text}) + "\n").encode()
        yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()
        return

    # Inject context
    context_str = get_system_context(user_id, db)

    # Prepare payload
    if HumanMessage and SystemMessage:
        messages = [
            SystemMessage(content=f"System Context: {context_str}"),
            HumanMessage(content=user_input),
        ]
        input_payload = {"messages": messages}
    else:
        input_payload = {"input": f"Context: {context_str}\nUser: {user_input}"}

    # Stream events
    async for ev in agent_graph.agent_app.astream_events(input_payload, version="v1"):
        if ev is None:
            continue

        kind = ev.get("event")

        if kind == "on_chain_start":
            # Optional: emit thought about what chain is starting
            pass
        elif kind == "on_tool_start":
            tool_name = ev.get("name")
            tool_input = ev.get("data", {}).get("input")
            # Clean up input string if it's a dict
            if isinstance(tool_input, dict):
                tool_input = json.dumps(tool_input)
            yield (
                json.dumps(
                    {
                        "type": "tool_use",
                        "tool": tool_name,
                        "input": str(tool_input)[:200],
                    }
                )
                + "\n"
            ).encode()
        elif kind == "on_tool_end":
            # We don't always show tool output to user, but we could
            pass
        elif kind == "on_chat_model_stream":
            content = ev.get("data", {}).get("chunk", {}).get("content")
            if content:
                yield (
                    json.dumps({"type": "response", "content": content}) + "\n"
                ).encode()

    yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()
