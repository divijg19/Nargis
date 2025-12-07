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
from services.habits import create_habit_service, update_habit_count_service, list_habits_service
from services.journal import create_entry_service
from services.pomodoro import create_session_service
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
def create_task_tool(**kwargs) -> Dict[str, Any]:
    """
    Create a task using the service layer. The args are validated strictly by Pydantic
    to ensure the LLM returns a well-formed JSON object we can trust.
    """
    args = CreateTaskArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    user_id = payload.pop("user_id")
    with get_session_now() as db:
        created = create_task_service(payload, user_id, db)
        return created


class ListTasksArgs(BaseModel):
    user_id: str
    limit: Optional[int] = 10


@safe_tool(name="list_tasks", return_direct=True, args_schema=ListTasksArgs)
def list_tasks_tool(**kwargs) -> str:
    """
    Read-only listing tool for agent use. Returns a concise, human-readable
    newline-separated string (one task per line) formatted as:
    "ID: <id> | Title: <title> | Due: <due>"
    This keeps LLM context usage low compared to returning raw JSON.
    """
    args = ListTasksArgs(**kwargs)
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
def recall_memory_tool(**kwargs) -> str:
    """Recall relevant long-term memories using vector search.

    The tool returns a short, human-readable string of the top matches.
    """
    args = RecallArgs(**kwargs)
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


class CreateHabitArgs(BaseModel):
    user_id: str
    name: str = Field(..., min_length=1)
    target: int = 1
    unit: str = "times"
    frequency: str = "daily"

@safe_tool(name="create_habit", return_direct=True, args_schema=CreateHabitArgs)
def create_habit_tool(**kwargs) -> Dict[str, Any]:
    """Create a new habit tracker."""
    args = CreateHabitArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    user_id = payload.pop("user_id")
    with get_session_now() as db:
        return create_habit_service(payload, user_id, db)
        return create_habit_service(payload, user_id, db)


class TrackHabitArgs(BaseModel):
    user_id: str
    habit_name_or_id: str = Field(..., description="Name or ID of the habit")
    count: Optional[int] = None
    delta: Optional[int] = 1

@safe_tool(name="track_habit", return_direct=True, args_schema=TrackHabitArgs)
def track_habit_tool(**kwargs) -> str:
    """Log progress for a habit. If name is provided, it tries to find it."""
    args = TrackHabitArgs(**kwargs)
    with get_session_now() as db:
        habits = list_habits_service(args.user_id, db)
        habits = list_habits_service(args.user_id, db)
        target_habit = None
        for h in habits:
            if (
                h["id"] == args.habit_name_or_id
                or h["name"].lower() == args.habit_name_or_id.lower()
            ):
                target_habit = h
                break

        if not target_habit:
            return "Habit not found."

        payload = {}
        if args.count is not None:
            payload["count"] = args.count
        else:
            payload["delta"] = args.delta

        res = update_habit_count_service(target_habit["id"], payload, args.user_id, db)
        if res:
            return f"Tracked habit '{target_habit['name']}'. Current streak: {res.get('currentStreak')}"
        return "Failed to track habit."


class CreateJournalArgs(BaseModel):
    user_id: str
    content: str
    title: Optional[str] = None
    mood: Optional[str] = None

@safe_tool(name="create_journal", return_direct=True, args_schema=CreateJournalArgs)
def create_journal_tool(**kwargs) -> Dict[str, Any]:
    """Create a new journal entry."""
    args = CreateJournalArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    user_id = payload.pop("user_id")
    with get_session_now() as db:
        return create_entry_service(payload, user_id, db)
        return create_entry_service(payload, user_id, db)


class StartFocusArgs(BaseModel):
    user_id: str
    duration_minutes: int = 25
    task_id: Optional[str] = None
@safe_tool(name="start_focus", return_direct=True, args_schema=StartFocusArgs)
def start_focus_tool(**kwargs) -> Dict[str, Any]:
    """Start a Pomodoro focus session."""
    args = StartFocusArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    user_id = payload.pop("user_id")
    with get_session_now() as db:
        return create_session_service(payload, user_id, db)
    with get_session_now() as db:
        return create_session_service(payload, user_id, db)

