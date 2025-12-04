from __future__ import annotations

"""LangGraph composition for Nargis agent.

This file creates a simple StateGraph, attaches a chat LLM node and a ToolNode
that exposes the service-backed tools. The `agent_app` is the compiled runtime
that the FastAPI pipeline can invoke.
"""
try:
    from langgraph import StateGraph
    from langgraph.prebuilt import ToolNode, ChatGroq
except Exception:  # pragma: no cover - dependencies optional during tests
    StateGraph = None
    ToolNode = None
    ChatGroq = None


# Minimal safe factory that compiles the graph if langgraph is present.
def _build_agent_app():
    if not (StateGraph and ChatGroq and ToolNode):
        return None
    # Import tools at runtime to avoid module-level imports after executable code
    # (keeps linters happy and allows optional langgraph during testing).
    try:
        from agent.tools import create_task_tool, list_tasks_tool, recall_memory_tool
    except Exception:
        create_task_tool = None
        list_tasks_tool = None
        recall_memory_tool = None

    chat_node = ChatGroq(name="chat", model="llama-3.1-70b-versatile", temperature=0.2)
    tools = [t for t in (create_task_tool, list_tasks_tool, recall_memory_tool) if t]
    tools_node = ToolNode(name="tools", tools=tools)
    graph = StateGraph(nodes=[chat_node, tools_node])
    # Bind tools to the chat so it may call them during reasoning
    chat_node.bind_tools(tools_node)
    return graph.compile()


agent_app = _build_agent_app()
