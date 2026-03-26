from __future__ import annotations

import os

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from services.proactive import run_proactive_checks_service
from storage.database import get_db

router = APIRouter(prefix="/v1/internal", tags=["internal"])


@router.post("/cron/tick")
def cron_tick(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
) -> dict[str, str]:
    expected_secret = os.getenv("INTERNAL_CRON_SECRET", "dev_internal_secret")
    if internal_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Forbidden")

    background_tasks.add_task(run_proactive_checks_service, db)
    return {"status": "accepted"}
