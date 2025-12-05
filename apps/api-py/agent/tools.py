from __future__ import annotations

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

# LangChain tool decorator (API varies between versions). Create a
# compatibility wrapper `safe_tool` that attempts multiple call patterns
# so the module can import across LangChain versions in CI/dev.
try:
    from langchain.tools import tool as _lc_tool
except Exception:  # pragma: no cover - runtime may not have langchain during CI
    _lc_tool = None
from storage.database import get_session_now
from services.tasks import create_task_service, list_tasks_service
from services.ai_clients import get_embedding
from services.memory_service import search_memories
def _fallback_noop_decorator(*_args, **_kwargs):
    def _inner(fn):
        return fn

    return _inner


def safe_tool(**dec_kwargs):
    """Return a decorator compatible with different langchain.tool signatures.

    Usage:
        @safe_tool(name="foo", args_schema=MySchema)
        def foo_tool(...):
            ...
    """
    if _lc_tool is None:
        return _fallback_noop_decorator(**dec_kwargs)

    # Try calling the langchain tool factory with provided kwargs.
    try:
        return _lc_tool(**dec_kwargs)
    except TypeError:
        # Some versions don't accept `name` or `return_direct` as kwargs.
        # Try removing `name` first, then fall back to bare decorator.
        try:
            kw = dict(dec_kwargs)
            kw.pop("name", None)
            return _lc_tool(**kw)
        except TypeError:
            try:
                return _lc_tool
            except Exception:
                return _fallback_noop_decorator(**dec_kwargs)





class CreateTaskArgs(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    user_id: str


@safe_tool(name="create_task", return_direct=True, args_schema=CreateTaskArgs)
def create_task_tool(args: CreateTaskArgs) -> Dict[str, Any]:
    """
    Create a task using the service layer. The args are validated strictly by Pydantic
    to ensure the LLM returns a well-formed JSON object we can trust.
    """
    payload = args.model_dump(exclude_none=True)
    user_id = payload.pop("user_id")
    with get_session_now() as db:
        created = create_task_service(payload, user_id, db)
        return created


class ListTasksArgs(BaseModel):
    user_id: str
    limit: Optional[int] = 10


@safe_tool(name="list_tasks", return_direct=True, args_schema=ListTasksArgs)
def list_tasks_tool(args: ListTasksArgs) -> str:
    """
    Read-only listing tool for agent use. Returns a concise, human-readable
    newline-separated string (one task per line) formatted as:
    "ID: <id> | Title: <title> | Due: <due>"
    This keeps LLM context usage low compared to returning raw JSON.
    """
    with get_session_now() as db:
        tasks = list_tasks_service(args.user_id, db)

    lines: List[str] = []
    limit = args.limit or 10
    for t in tasks[:limit]:
        tid = t.get("id", "")
        title = t.get("title") or "(no title)"
        due = t.get("due_date") or t.get("dueDate") or "No due"
        lines.append(f"ID: {tid} | Title: {title} | Due: {due}")

    if not lines:
        return "No tasks found."
    return "\n".join(lines)


class RecallArgs(BaseModel):
    user_id: str
    query: str = Field(..., min_length=1)
    limit: Optional[int] = 3


@safe_tool(name="recall_memory", return_direct=True, args_schema=RecallArgs)
def recall_memory_tool(args: RecallArgs) -> str:
    """Recall relevant long-term memories using vector search.

    The tool returns a short, human-readable string of the top matches.
    """
    # Generate embedding for the query (may raise if no provider installed)
    try:
        vec = get_embedding(args.query)
    except Exception as e:
        return f"Error generating embedding: {e}"

    with get_session_now() as db:
        matches = search_memories(db, args.user_id, vec, limit=args.limit or 3)

    if not matches:
        return "No memories found."

    lines: List[str] = []
    for m in matches[: args.limit or 3]:
        mid = m.get("id")
        content = m.get("content", "")
        created = m.get("created_at")
        snippet = content if len(content) <= 300 else content[:300] + "..."
        lines.append(f"MemoryID: {mid} | Created: {created} | Content: {snippet}")

    return "\n".join(lines)
