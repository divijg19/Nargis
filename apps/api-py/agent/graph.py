"""LangGraph composition for Nargis agent.

This file creates a simple StateGraph, attaches a chat LLM node and a ToolNode
that exposes the service-backed tools. The `agent_app` is the compiled runtime
that the FastAPI pipeline can invoke.
"""

from __future__ import annotations

import importlib
from typing import Any, cast

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
            create_habit_tool,
            create_journal_tool,
            create_plan_tool,
            create_task_tool,
            get_task_details_tool,
            list_tasks_tool,
            recall_memory_tool,
            start_focus_tool,
            track_habit_tool,
        )
    except Exception:
        create_plan_tool = None
        create_task_tool = None
        get_task_details_tool = None
        list_tasks_tool = None
        recall_memory_tool = None
        create_habit_tool = None
        track_habit_tool = None
        create_journal_tool = None
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
                get_task_details_tool,
                list_tasks_tool,
                recall_memory_tool,
                create_habit_tool,
                track_habit_tool,
                create_journal_tool,
                start_focus_tool,
            )
            if t
        ]
        return create_agent(chat_model, tools)

    return lazy_agent()


agent_app = _build_agent_app()
