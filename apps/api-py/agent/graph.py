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

from agent.tools import create_task_tool


# Minimal safe factory that compiles the graph if langgraph is present.
def _build_agent_app():
    if not (StateGraph and ChatGroq and ToolNode):
        return None

    chat_node = ChatGroq(name="chat", model="llama-3.1-70b-versatile", temperature=0.2)
    tools_node = ToolNode(name="tools", tools=[create_task_tool])
    graph = StateGraph(nodes=[chat_node, tools_node])
    # Bind tools to the chat so it may call them during reasoning
    chat_node.bind_tools(tools_node)
    return graph.compile()


agent_app = _build_agent_app()
