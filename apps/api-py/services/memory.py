"""Compatibility shim: re-export memory functions from services.memory_service.

This module keeps the `services.memory` import path available for other
parts of the codebase while delegating implementation to
`services.memory_service`.
"""

from services.memory_service import create_memory, search_memories  # re-export

__all__ = ["create_memory", "search_memories"]
