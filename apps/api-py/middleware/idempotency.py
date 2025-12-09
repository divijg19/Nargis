from __future__ import annotations

import json
import logging
import os

import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response, StreamingResponse

from services.idempotency import get_idempotent_response, save_idempotent_response
from storage.database import SessionLocal

# Import JWT settings from auth module if available
try:
    from routers.auth import ALGORITHM, SECRET_KEY
except Exception:
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM = "HS256"


class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Only handle POST requests with Idempotency-Key header
        if request.method.upper() != "POST":
            return await call_next(request)

        id_key = request.headers.get("Idempotency-Key") or request.headers.get(
            "idempotency-key"
        )
        if not id_key:
            return await call_next(request)

        # Prefer decoding Authorization Bearer token to extract real user id (sub)
        user_identifier = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_identifier = payload.get("sub")
            except Exception:
                # If token invalid/expired, fall back to using raw header as identifier
                user_identifier = auth_header
        else:
            user_identifier = request.headers.get("X-User-Id")

        db = SessionLocal()
        try:
            saved = get_idempotent_response(
                db, id_key, user_identifier, request.method, request.url.path
            )
            if saved:
                return JSONResponse(
                    status_code=saved["status_code"], content=saved["response"]
                )

            response: Response = await call_next(request)

            # Only persist JSON non-streaming successful responses
            content_type = response.headers.get("content-type", "")
            if (
                200 <= response.status_code < 300
                and content_type.startswith("application/json")
                and not isinstance(response, StreamingResponse)
            ):
                body = getattr(response, "body", None)
                if body is not None:
                    try:
                        # body may be bytes
                        if isinstance(body, bytes):
                            payload = json.loads(body.decode("utf-8"))
                        else:
                            payload = json.loads(str(body))
                        save_idempotent_response(
                            db,
                            id_key,
                            user_identifier,
                            request.method,
                            request.url.path,
                            response.status_code,
                            payload,
                        )
                    except Exception:
                        logging.exception("Failed to save idempotent response")

            return response
        finally:
            try:
                db.close()
            except Exception:
                pass
