from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# LangChain tool decorator (API varies between versions). Create a
# compatibility wrapper `safe_tool` that attempts multiple call patterns
# so the module can import across LangChain versions in CI/dev.
try:
    from langchain.tools import tool as _lc_tool
except Exception:  # pragma: no cover - runtime may not have langchain during CI
    _lc_tool = None
from services.ai_clients import get_embedding
from services.habits import (
    create_habit_service,
    list_habits_service,
    update_habit_count_service,
)
from services.journal import create_entry_service
from services.memory_service import search_memories
from services.pomodoro import create_session_service
from services.tasks import create_task_service, get_task_service, list_tasks_service
from storage.database import get_session_now


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
    description: str | None = None
    priority: str | None = None
    due_date: str | None = None
    parent_id: str | None = None
    user_id: str


@safe_tool(name="create_task", return_direct=True, args_schema=CreateTaskArgs)
def create_task_tool(**kwargs) -> dict[str, Any]:
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
    limit: int | None = 10


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

    lines: list[str] = []
    limit = args.limit or 10
    for t in tasks[:limit]:
        tid = t.get("id", "")
        title = t.get("title") or "(no title)"
        due = t.get("due_date") or t.get("dueDate") or "No due"
        subtasks = t.get("subtasks", [])
        sub_count = len(subtasks)
        lines.append(f"ID: {tid} | Title: {title} | Due: {due} | Subtasks: {sub_count}")

    if not lines:
        return "No tasks found."
    return "\n".join(lines)


class GetTaskDetailsArgs(BaseModel):
    task_id: str
    user_id: str


@safe_tool(name="get_task_details", return_direct=True, args_schema=GetTaskDetailsArgs)
def get_task_details_tool(**kwargs) -> str:
    """
    Get detailed information about a specific task, including its description
    and subtasks.
    """
    args = GetTaskDetailsArgs(**kwargs)
    with get_session_now() as db:
        task = get_task_service(args.task_id, args.user_id, db)

    if not task:
        return "Task not found."

    lines = []
    lines.append(f"ID: {task.get('id')}")
    lines.append(f"Title: {task.get('title')}")
    lines.append(f"Description: {task.get('description') or '(none)'}")
    lines.append(f"Status: {task.get('status')}")
    lines.append(f"Priority: {task.get('priority')}")
    lines.append(f"Due: {task.get('due_date') or 'None'}")

    subtasks = task.get("subtasks", [])
    if subtasks:
        lines.append("\nSubtasks:")
        for sub in subtasks:
            lines.append(
                f"- [{sub.get('status')}] {sub.get('title')} (ID: {sub.get('id')})"
            )
    else:
        lines.append("\nNo subtasks.")

    return "\n".join(lines)


class RecallArgs(BaseModel):
    user_id: str
    query: str = Field(..., min_length=1)
    limit: int | None = 3


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

    lines: list[str] = []
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
def create_habit_tool(**kwargs) -> dict[str, Any]:
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
    count: int | None = None
    delta: int | None = 1


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
            return (
                f"Tracked habit '{target_habit['name']}'. "
                f"Current streak: {res.get('currentStreak')}"
            )
        return "Failed to track habit."


class CreateJournalArgs(BaseModel):
    user_id: str
    content: str
    title: str | None = None
    mood: str | None = None


@safe_tool(name="create_journal", return_direct=True, args_schema=CreateJournalArgs)
def create_journal_tool(**kwargs) -> dict[str, Any]:
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
    task_id: str | None = None


@safe_tool(name="start_focus", return_direct=True, args_schema=StartFocusArgs)
def start_focus_tool(**kwargs) -> dict[str, Any]:
    """Start a Pomodoro focus session."""
    args = StartFocusArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    user_id = payload.pop("user_id")
    with get_session_now() as db:
        return create_session_service(payload, user_id, db)


class PlanItem(BaseModel):
    title: str
    description: str | None = None
    due_date: str | None = None


class CreatePlanArgs(BaseModel):
    user_id: str
    tasks: list[PlanItem]
    journal_summary: str | None = None


@safe_tool(name="create_plan", args_schema=CreatePlanArgs)
def create_plan_tool(**kwargs) -> str:
    """Create multiple tasks at once (a plan)."""
    args = CreatePlanArgs(**kwargs)
    user_id = args.user_id
    created_count = 0

    with get_session_now() as db:
        # Create tasks
        for item in args.tasks:
            payload = item.model_dump(exclude_none=True)
            create_task_service(payload, user_id, db)
            created_count += 1

        # Create journal entry if provided
        if args.journal_summary:
            create_entry_service(
                {
                    "content": args.journal_summary,
                    "title": "Plan Created",
                    "type": "text",
                    "tags": ["plan"],
                },
                user_id,
                db,
            )

    return f"Successfully created {created_count} tasks based on the plan."
    with get_session_now() as db:
        return create_session_service(payload, user_id, db)
