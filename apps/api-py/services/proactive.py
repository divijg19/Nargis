from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from storage.models import Task

logger = logging.getLogger(__name__)


def run_proactive_checks_service(db: Session) -> None:
    """Run system-wide proactive checks triggered by the control-plane cron tick."""
    pending_count = db.query(Task).filter(Task.status == "pending").count()
    logger.info(
        "Proactive Check Run: Found %s pending tasks in the system.",
        pending_count,
    )
