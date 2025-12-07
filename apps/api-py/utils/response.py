from typing import Any, Dict


def error_envelope(code: str, message: str) -> Dict[str, Any]:
    return {"error": {"code": code, "message": message}}


def make_error_from_detail(detail: Any, default_code: str = "ERROR") -> Dict[str, Any]:
    """Normalize various detail shapes (str or dict) into the standard envelope."""
    if isinstance(detail, dict):
        # If already in our envelope shape, return as-is
        if "error" in detail and isinstance(detail["error"], dict):
            return detail
        # If dict has message/code keys, try to map
        code = detail.get("code") or detail.get("error_code") or default_code
        message = detail.get("message") or detail.get("detail") or str(detail)
        return error_envelope(code, message)
    # Fallback to string
    return error_envelope(default_code, str(detail))
