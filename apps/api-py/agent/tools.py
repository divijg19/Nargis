from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from langchain_core.runnables import RunnableConfig
else:  # pragma: no cover - keep runtime import optional
    RunnableConfig = Any

# LangChain tool decorator (API varies between versions). Create a
# compatibility wrapper `safe_tool` that attempts multiple call patterns
# so the module can import across LangChain versions in CI/dev.
try:
    from langchain.tools import tool as _lc_tool

    _lc_tool_impl: Any = _lc_tool
except Exception:  # pragma: no cover - runtime may not have langchain during CI
    _lc_tool_impl = None

from services.ai_clients import get_embedding
from services.analytics import analyze_weekly_productivity_service
from services.habits import (
    create_habit_service,
    list_habits_service,
    update_habit_count_service,
)
from services.journal import create_entry_service
from services.memory_service import search_memories
from services.pomodoro import create_session_service
from services.tasks import create_task_service, get_task_service, list_tasks_service

_AGENT_USER_ID: ContextVar[str | None] = ContextVar("_AGENT_USER_ID", default=None)
_AGENT_DB: ContextVar[Session | None] = ContextVar("_AGENT_DB", default=None)


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
    if _lc_tool_impl is None:
        return _fallback_noop_decorator(**dec_kwargs)

    # Try calling the langchain tool factory with provided kwargs.
    try:
        return _lc_tool_impl(**dec_kwargs)
    except TypeError:
        # Some versions don't accept `name` or `return_direct` as kwargs.
        # Try removing `name` first, then fall back to bare decorator.
        try:
            kw = dict(dec_kwargs)
            kw.pop("name", None)
            return _lc_tool_impl(**kw)
        except TypeError:
            try:
                return _lc_tool_impl
            except Exception:
                return _fallback_noop_decorator(**dec_kwargs)


@contextmanager
def set_agent_runtime_context(user_id: str, db: Session):
    """Fallback runtime context used when RunnableConfig is not passed through."""
    user_token = _AGENT_USER_ID.set(user_id)
    db_token = _AGENT_DB.set(db)
    try:
        yield
    finally:
        _AGENT_DB.reset(db_token)
        _AGENT_USER_ID.reset(user_token)


def _resolve_runtime(
    config: RunnableConfig | None = None,
) -> tuple[str, Session]:
    configurable: dict[str, Any] = {}
    if isinstance(config, dict):
        candidate = config.get("configurable")
        if isinstance(candidate, dict):
            configurable = candidate

    user_id = configurable.get("user_id") or _AGENT_USER_ID.get()
    db = configurable.get("db") or configurable.get("db_session") or _AGENT_DB.get()

    if not user_id or db is None:
        raise ValueError(
            "Agent tool runtime context missing. Inject user_id and db session "
            "via RunnableConfig."
        )

    return str(user_id), db


class CreateTaskArgs(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str | None = None
    priority: str | None = None
    due_date: str | None = None
    parent_id: str | None = None


@safe_tool(name="create_task", return_direct=True, args_schema=CreateTaskArgs)
def create_task_tool(config: RunnableConfig | None = None, **kwargs) -> dict[str, Any]:
    """Create a task with tenant context injected at graph execution time."""
    user_id, db = _resolve_runtime(config)
    args = CreateTaskArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    return create_task_service(payload, user_id, db)


class ListTasksArgs(BaseModel):
    limit: int | None = 10


@safe_tool(name="list_tasks", return_direct=True, args_schema=ListTasksArgs)
def list_tasks_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Read-only listing tool for agent use."""
    user_id, db = _resolve_runtime(config)
    args = ListTasksArgs(**kwargs)
    tasks = list_tasks_service(user_id, db)

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


@safe_tool(name="get_task_details", return_direct=True, args_schema=GetTaskDetailsArgs)
def get_task_details_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Get details for a specific task, including description and subtasks."""
    user_id, db = _resolve_runtime(config)
    args = GetTaskDetailsArgs(**kwargs)
    task = get_task_service(args.task_id, user_id, db)

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
    query: str = Field(..., min_length=1)
    limit: int | None = 3


@safe_tool(name="recall_memory", return_direct=True, args_schema=RecallArgs)
def recall_memory_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Recall relevant long-term memories using vector search."""
    user_id, db = _resolve_runtime(config)
    args = RecallArgs(**kwargs)

    try:
        vec = get_embedding(args.query)
    except Exception as e:
        return f"Error generating embedding: {e}"

    matches = search_memories(
        db,
        user_id,
        vec,
        limit=args.limit or 3,
        query_text=args.query,
    )

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


class AnalyzeProductivityArgs(BaseModel):
    days: int | None = 7


@safe_tool(
    name="analyze_productivity",
    return_direct=True,
    args_schema=AnalyzeProductivityArgs,
)
def analyze_productivity_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Return compact weekly productivity aggregates for the active user."""
    user_id, db = _resolve_runtime(config)
    args = AnalyzeProductivityArgs(**kwargs)
    _ = args.days

    summary = analyze_weekly_productivity_service(db, user_id)
    return (
        "tasks_completed={tasks_completed} "
        "tasks_pending={tasks_pending} "
        "focus_minutes={focus_minutes} "
        "habits_hit={habits_hit}"
    ).format(**summary)


class CreateHabitArgs(BaseModel):
    name: str = Field(..., min_length=1)
    target: int = 1
    unit: str = "times"
    frequency: str = "daily"


@safe_tool(name="create_habit", return_direct=True, args_schema=CreateHabitArgs)
def create_habit_tool(config: RunnableConfig | None = None, **kwargs) -> dict[str, Any]:
    """Create a new habit tracker."""
    user_id, db = _resolve_runtime(config)
    args = CreateHabitArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    return create_habit_service(payload, user_id, db)


class TrackHabitArgs(BaseModel):
    habit_name_or_id: str = Field(..., description="Name or ID of the habit")
    count: int | None = None
    delta: int | None = 1


@safe_tool(name="track_habit", return_direct=True, args_schema=TrackHabitArgs)
def track_habit_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Log progress for a habit. If a name is provided, it resolves to an id."""
    user_id, db = _resolve_runtime(config)
    args = TrackHabitArgs(**kwargs)
    habits = list_habits_service(user_id, db)

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

    payload: dict[str, int | None] = {}
    if args.count is not None:
        payload["count"] = args.count
    else:
        payload["delta"] = args.delta

    res = update_habit_count_service(target_habit["id"], payload, user_id, db)
    if res:
        return (
            f"Tracked habit '{target_habit['name']}'. "
            f"Current streak: {res.get('currentStreak')}"
        )
    return "Failed to track habit."


class LogHabitArgs(BaseModel):
    habit_name: str = Field(..., min_length=1, description="Habit name to log")
    status: bool | str = True


def _status_to_completed(value: bool | str) -> bool:
    if isinstance(value, bool):
        return value
    normalized = value.strip().lower()
    return normalized in {"completed", "done", "true", "yes", "1"}


@safe_tool(name="log_habit", return_direct=True, args_schema=LogHabitArgs)
def log_habit_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Log today's completion status for a habit by habit name."""
    user_id, db = _resolve_runtime(config)
    args = LogHabitArgs(**kwargs)
    habits = list_habits_service(user_id, db)

    target_habit = next(
        (h for h in habits if h.get("name", "").lower() == args.habit_name.lower()),
        None,
    )
    if not target_habit:
        return f"Habit '{args.habit_name}' not found."

    completed = _status_to_completed(args.status)
    target = int(target_habit.get("target") or 1)
    payload = {"count": target if completed else 0}
    updated = update_habit_count_service(target_habit["id"], payload, user_id, db)
    if not updated:
        return f"Could not log habit '{target_habit['name']}'."

    if completed:
        return f"Habit '{target_habit['name']}' logged for today."
    return f"Habit '{target_habit['name']}' marked incomplete for today."


class CreateJournalArgs(BaseModel):
    content: str
    title: str | None = None
    mood: str | None = None


@safe_tool(name="create_journal", return_direct=True, args_schema=CreateJournalArgs)
def create_journal_tool(
    config: RunnableConfig | None = None, **kwargs
) -> dict[str, Any]:
    """Create a new journal entry."""
    user_id, db = _resolve_runtime(config)
    args = CreateJournalArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    return create_entry_service(payload, user_id, db)


class LogJournalArgs(BaseModel):
    content: str = Field(..., min_length=1)
    tags: list[str] | None = None


@safe_tool(name="log_journal", return_direct=True, args_schema=LogJournalArgs)
def log_journal_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Create a journal entry from free-text content and optional tags."""
    user_id, db = _resolve_runtime(config)
    args = LogJournalArgs(**kwargs)
    payload: dict[str, Any] = {
        "content": args.content,
        "type": "text",
    }
    if args.tags:
        payload["tags"] = args.tags

    created = create_entry_service(payload, user_id, db)
    entry_id = created.get("id")
    if entry_id:
        return f"Journal entry saved ({entry_id})."
    return "Journal entry saved."


class StartFocusArgs(BaseModel):
    duration_minutes: int = 25
    task_id: str | None = None


@safe_tool(name="start_focus", return_direct=True, args_schema=StartFocusArgs)
def start_focus_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Start a Pomodoro focus session."""
    user_id, db = _resolve_runtime(config)
    args = StartFocusArgs(**kwargs)
    payload = args.model_dump(exclude_none=True)
    created = create_session_service(payload, user_id, db)
    duration = int(created.get("duration_minutes") or args.duration_minutes or 25)
    return f"Started a {duration}-minute focus session."


class PlanItem(BaseModel):
    title: str
    description: str | None = None
    due_date: str | None = None


class CreatePlanArgs(BaseModel):
    tasks: list[PlanItem]
    journal_summary: str | None = None


@safe_tool(name="create_plan", args_schema=CreatePlanArgs)
def create_plan_tool(config: RunnableConfig | None = None, **kwargs) -> str:
    """Create multiple tasks at once and optionally add a plan summary journal entry."""
    user_id, db = _resolve_runtime(config)
    args = CreatePlanArgs(**kwargs)
    created_count = 0

    for item in args.tasks:
        payload = item.model_dump(exclude_none=True)
        create_task_service(payload, user_id, db)
        created_count += 1

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
