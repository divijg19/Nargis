from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy.orm import Session

from services.ai_clients import _get_llm_response
from services.habits import list_habits_service
from services.journal import create_entry_service
from services.tasks import list_tasks_service
from storage.models import User

logger = logging.getLogger(__name__)

MORNING_BRIEFING_INSTRUCTION = (
    "You are Nargis, an AI Chief of Staff. Review the following tasks and habits "
    "for the user. Write a concise, 3-sentence motivating morning briefing "
    "summarizing what they need to focus on today. Do not use pleasantries."
)


def _extract_llm_text(llm_result: dict[str, Any]) -> str | None:
    choices = llm_result.get("choices")
    if isinstance(choices, list) and len(choices) > 0 and isinstance(choices[0], dict):
        message = choices[0].get("message")
        if isinstance(message, dict):
            content = message.get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()

    for key in ("reply", "output", "text"):
        val = llm_result.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()

    return None


def _format_pending_tasks(tasks: list[dict[str, Any]]) -> str:
    if not tasks:
        return "You have no pending tasks today! Focus on your habits."

    lines: list[str] = []
    for task in tasks[:10]:
        title = str(task.get("title") or "Untitled task")
        due_date = str(task.get("dueDate") or "No due date")
        priority = str(task.get("priority") or "normal")
        lines.append(f"- {title} (due: {due_date}, priority: {priority})")

    return "\n".join(lines)


def _format_habits(habits: list[dict[str, Any]]) -> str:
    if not habits:
        return "No habits configured yet."

    lines: list[str] = []
    for habit in habits[:10]:
        name = str(habit.get("name") or "Unnamed habit")
        target = int(habit.get("target") or 1)
        unit = str(habit.get("unit") or "times")
        streak = int(habit.get("currentStreak") or 0)
        lines.append(f"- {name}: target {target} {unit} daily, current streak {streak}")

    return "\n".join(lines)


def _default_briefing_text(has_pending_tasks: bool) -> str:
    if not has_pending_tasks:
        return (
            "You have no pending tasks today, so anchor your day around your core "
            "habits. Use your first focus block to reinforce consistency on the "
            "habits that drive long-term progress. Finish by planning one concrete "
            "task to create momentum for tomorrow."
        )

    return (
        "Start with your highest-impact pending task and complete one concrete "
        "milestone before switching context. Use your habits as execution anchors "
        "to keep energy and consistency stable through the day. Close by reviewing "
        "remaining tasks and choosing the next priority."
    )


def _generate_morning_briefing(context_block: str, has_pending_tasks: bool) -> str:
    prompt = f"{MORNING_BRIEFING_INSTRUCTION}\n\n{context_block}"
    llm_result = asyncio.run(_get_llm_response(prompt))
    briefing = _extract_llm_text(llm_result)
    if briefing:
        return briefing
    return _default_briefing_text(has_pending_tasks)


def run_proactive_checks_service(db: Session) -> None:
    """Run scheduled proactive checks and save an autonomous morning briefing."""
    user = db.query(User).first()
    if not user:
        logger.info(
            "Proactive Check Run: no users found; skipping briefing generation."
        )
        return

    all_tasks = list_tasks_service(user.id, db)
    pending_tasks = [
        task
        for task in all_tasks
        if str(task.get("status", "")).strip().lower() == "pending"
    ]
    habits = list_habits_service(user.id, db)

    context_block = (
        "Pending Tasks:\n"
        f"{_format_pending_tasks(pending_tasks)}\n\n"
        "Habits:\n"
        f"{_format_habits(habits)}"
    )

    try:
        briefing_text = _generate_morning_briefing(
            context_block=context_block,
            has_pending_tasks=bool(pending_tasks),
        )
    except Exception:
        logger.exception("Proactive Check Run: LLM briefing generation failed")
        briefing_text = _default_briefing_text(has_pending_tasks=bool(pending_tasks))

    create_entry_service(
        {
            "title": "Morning Briefing",
            "content": briefing_text,
            "type": "text",
            "tags": ["system_briefing", "auto"],
        },
        user.id,
        db,
    )

    logger.info(
        (
            "Proactive Check Run: Saved morning briefing for user=%s "
            "with %s pending tasks and %s habits."
        ),
        user.id,
        len(pending_tasks),
        len(habits),
    )
