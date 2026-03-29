from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session


def raise_owned_resource_error(
    db: Session,
    model: type[Any],
    resource_id: str,
    user_id: str,
    *,
    code: str,
    noun: str,
) -> None:
    record = db.query(model).filter(model.id == resource_id).first()
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": code,
                    "message": f"No {noun} with id: {resource_id}",
                }
            },
        )

    if getattr(record, "user_id", None) != user_id:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )

    raise HTTPException(
        status_code=403,
        detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
    )
