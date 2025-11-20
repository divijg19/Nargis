from __future__ import annotations

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

# LangChain tool decorator (API may vary between versions)
try:
    from langchain.tools import tool
except Exception:  # pragma: no cover - runtime may not have langchain during CI
    def tool(*args, **kwargs):
        def _noop(fn):
            return fn
        return _noop

from storage.database import SessionLocal
from services.tasks import create_task_service


class CreateTaskArgs(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    user_id: str


@tool(name="create_task", return_direct=True, args_schema=CreateTaskArgs)
def create_task_tool(args: CreateTaskArgs) -> Dict[str, Any]:
    """
    Create a task using the service layer. The args are validated strictly by Pydantic
    to ensure the LLM returns a well-formed JSON object we can trust.
    """
    db = SessionLocal()
    try:
        payload = args.model_dump(exclude_none=True)
        user_id = payload.pop("user_id")
        created = create_task_service(payload, user_id, db)
        return created
    finally:
        db.close()
