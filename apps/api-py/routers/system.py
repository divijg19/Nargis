from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from storage.database import get_db

router = APIRouter()


@router.get("/")
async def root():
    return {"status": "ok", "service": "nargis-api", "health": "/health"}


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/ready")
async def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except Exception:
        logging.exception("Readiness probe failed")
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": "down"},
        )


@router.get("/healthz")
async def healthz(db: Session = Depends(get_db)):
    return await ready(db)
