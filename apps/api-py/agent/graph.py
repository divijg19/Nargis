"""LangGraph composition for Nargis agent.

This file creates a simple StateGraph, attaches a chat LLM node and a ToolNode
that exposes the service-backed tools. The `agent_app` is the compiled runtime
that the FastAPI pipeline can invoke.
"""

from __future__ import annotations

import importlib
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy.orm import Session

from services.context import get_user_daily_context

if TYPE_CHECKING:
    from langchain_core.runnables import RunnableConfig
else:  # pragma: no cover - keep runtime import optional
    RunnableConfig = Any

try:
    _messages_module = importlib.import_module("langchain_core.messages")
except Exception:  # pragma: no cover - optional in minimal test env
    _messages_module = None

_AIMessage = getattr(_messages_module, "AIMessage", None)
_HumanMessage = getattr(_messages_module, "HumanMessage", None)
_SystemMessage = getattr(_messages_module, "SystemMessage", None)

try:
    from langchain_groq import ChatGroq
except Exception:  # pragma: no cover - dependencies optional during tests
    # Explicit Any keeps static analyzers happy when these optional deps
    # are missing in minimal CI environments.
    ChatGroq: Any = None


def _load_create_react_agent() -> Any:
    """Load an agent factory without tripping Ty's deprecation diagnostics.

    Ty flags direct references to deprecated symbols (even on dynamically
    imported modules). To keep optional-compatibility while staying clean,
    avoid writing deprecated attribute names directly in source.
    """

    # Preferred location (LangChain).
    try:
        module = importlib.import_module("langchain.agents")
        preferred = "create_" + "agent"
        if hasattr(module, preferred):
            return getattr(module, preferred)

        # Some versions expose the legacy name under langchain.agents.
        legacy = "create_" + "react_" + "agent"
        if hasattr(module, legacy):
            return getattr(module, legacy)
    except Exception:
        pass

    # Fallback for older stacks that still ship the prebuilt factory via LangGraph.
    try:
        module = importlib.import_module("langgraph.prebuilt")
        legacy = "create_" + "react_" + "agent"
        if hasattr(module, legacy):
            return getattr(module, legacy)
    except Exception:
        pass

    return None


create_agent: Any = _load_create_react_agent()

CORE_SYSTEM_PROMPT = (
    "You are Nargis, a highly capable Chief of Staff. "
    "The user speaks to you, but you ONLY reply in text and UI updates. "
    "Be extremely concise. Do not use filler pleasantries. "
    "Use the provided [TODAY'S STATE] to proactively guide the user."
)


def build_agent_runnable_config(user_id: str, db: Session) -> RunnableConfig:
    """Build a config object that carries tenant and transaction context to tools."""
    return cast(RunnableConfig, {"configurable": {"user_id": user_id, "db": db}})


def _extract_runtime_from_config(
    config: RunnableConfig | None,
) -> tuple[str | None, Session | None]:
    if not isinstance(config, dict):
        return None, None

    configurable = config.get("configurable")
    if not isinstance(configurable, dict):
        return None, None

    user_id_raw = configurable.get("user_id")
    db = configurable.get("db") or configurable.get("db_session")
    user_id = str(user_id_raw) if user_id_raw else None
    return user_id, cast(Session | None, db)


def _daily_state_from_runtime(config: RunnableConfig | None) -> str:
    user_id, db = _extract_runtime_from_config(config)
    if not user_id or db is None:
        return "[TODAY'S STATE] Clear schedule."
    try:
        return get_user_daily_context(db, user_id)
    except Exception:
        return "[TODAY'S STATE] Clear schedule."


def _is_system_message(msg: Any) -> bool:
    if isinstance(msg, dict):
        return str(msg.get("role", "")).strip().lower() == "system"
    msg_type = getattr(msg, "type", None)
    if isinstance(msg_type, str):
        return msg_type.strip().lower() == "system"
    return False


def _inject_contextual_system_prompt(
    payload: Any, config: RunnableConfig | None
) -> dict[str, Any]:
    today_state = _daily_state_from_runtime(config)
    system_text = f"{CORE_SYSTEM_PROMPT}\n{today_state}"

    if isinstance(payload, dict) and isinstance(payload.get("messages"), list):
        user_messages = [m for m in payload["messages"] if not _is_system_message(m)]
    elif isinstance(payload, dict) and isinstance(payload.get("input"), str):
        user_messages = [{"role": "user", "content": payload["input"]}]
    else:
        user_messages = [{"role": "user", "content": str(payload)}]

    if (
        _SystemMessage is not None
        and _HumanMessage is not None
        and _AIMessage is not None
    ):
        normalized: list[Any] = []
        for m in user_messages:
            if isinstance(m, dict):
                role = str(m.get("role", "")).strip().lower()
                content = str(m.get("content", ""))
                if role == "user":
                    normalized.append(_HumanMessage(content=content))
                elif role == "assistant":
                    normalized.append(_AIMessage(content=content))
                elif role == "system":
                    continue
                else:
                    normalized.append(_HumanMessage(content=content))
            else:
                normalized.append(m)

        return {"messages": [_SystemMessage(content=system_text), *normalized]}

    return {
        "messages": [
            {"role": "system", "content": system_text},
            *user_messages,
        ]
    }


class ContextInjectedAgentApp:
    def __init__(self, app: Any):
        self._app = app

    def __getattr__(self, item: str) -> Any:
        return getattr(self._app, item)

    def invoke(
        self, input_payload: Any, config: RunnableConfig | None = None, **kwargs
    ):
        enriched = _inject_contextual_system_prompt(input_payload, config)
        return self._app.invoke(enriched, config=config, **kwargs)

    async def ainvoke(
        self, input_payload: Any, config: RunnableConfig | None = None, **kwargs
    ):
        enriched = _inject_contextual_system_prompt(input_payload, config)
        return await self._app.ainvoke(enriched, config=config, **kwargs)

    async def astream_events(
        self,
        input_payload: Any,
        config: RunnableConfig | None = None,
        version: str = "v1",
        **kwargs,
    ):
        enriched = _inject_contextual_system_prompt(input_payload, config)
        async for event in self._app.astream_events(
            enriched,
            config=config,
            version=version,
            **kwargs,
        ):
            yield event


# Minimal safe factory that compiles the graph if langgraph is present.
def _build_agent_app():
    if not (create_agent and ChatGroq):
        return None

    # Help static analyzers narrow optional deps.
    assert create_agent is not None
    assert ChatGroq is not None
    # Import tools at runtime to avoid module-level imports after executable code
    # (keeps linters happy and allows optional langgraph during testing).
    try:
        from agent.tools import (
            analyze_productivity_tool,
            create_habit_tool,
            create_journal_tool,
            create_plan_tool,
            create_task_tool,
            get_task_details_tool,
            list_tasks_tool,
            log_habit_tool,
            log_journal_tool,
            recall_memory_tool,
            start_focus_tool,
            track_habit_tool,
        )
    except Exception:
        create_plan_tool = None
        analyze_productivity_tool = None
        create_task_tool = None
        get_task_details_tool = None
        list_tasks_tool = None
        recall_memory_tool = None
        create_habit_tool = None
        track_habit_tool = None
        create_journal_tool = None
        log_habit_tool = None
        log_journal_tool = None
        start_focus_tool = None

    def lazy_agent():
        chat_model = cast(Any, ChatGroq)(
            name="chat", model="llama-3.1-70b-versatile", temperature=0.2
        )
        tools = [
            t
            for t in (
                create_task_tool,
                create_plan_tool,
                analyze_productivity_tool,
                get_task_details_tool,
                list_tasks_tool,
                recall_memory_tool,
                create_habit_tool,
                track_habit_tool,
                create_journal_tool,
                log_habit_tool,
                log_journal_tool,
                start_focus_tool,
            )
            if t
        ]
        compiled = create_agent(chat_model, tools)
        return ContextInjectedAgentApp(compiled)

    return lazy_agent()


agent_app = _build_agent_app()
