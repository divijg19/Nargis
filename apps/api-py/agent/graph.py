from __future__ import annotations

"""LangGraph composition for Nargis agent.

This file creates a simple StateGraph, attaches a chat LLM node and a ToolNode
that exposes the service-backed tools. The `agent_app` is the compiled runtime
that the FastAPI pipeline can invoke.
"""
try:
    from langgraph.prebuilt import create_react_agent
    from langchain_groq import ChatGroq
except Exception:  # pragma: no cover - dependencies optional during tests
    create_react_agent = None
    ChatGroq = None


# Minimal safe factory that compiles the graph if langgraph is present.
def _build_agent_app():
    if not (create_react_agent and ChatGroq):
        return None
    # Import tools at runtime to avoid module-level imports after executable code
    # (keeps linters happy and allows optional langgraph during testing).
    try:
        from agent.tools import (
            create_task_tool,
            list_tasks_tool,
            recall_memory_tool,
            create_habit_tool,
            track_habit_tool,
            create_journal_tool,
            start_focus_tool,
        )
    except Exception:
        create_task_tool = None
        list_tasks_tool = None
        recall_memory_tool = None
        create_habit_tool = None
        track_habit_tool = None
        create_journal_tool = None
        start_focus_tool = None

    chat_model = ChatGroq(name="chat", model="llama-3.1-70b-versatile", temperature=0.2)
    tools = [
        t
        for t in (
            create_task_tool,
            list_tasks_tool,
            recall_memory_tool,
            create_habit_tool,
            track_habit_tool,
            create_journal_tool,
            start_focus_tool,
        )
        if t
    ]
    
    return create_react_agent(chat_model, tools)


agent_app = _build_agent_app()
