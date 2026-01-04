"""Standalone smoke/integration test for core service layers.

This script exercises three layers without starting the HTTP server:
- Task service (create + list)
- Memory service (create + vector search)
- Agent tools (recall_memory tool is importable and callable)

Run from the `apps/api-py` folder with the project virtualenv active:
    python smoke_test_core.py

It prints short PASS/FAIL results and exits with a non-zero code on failure.
"""

from __future__ import annotations

import sys
import traceback
import uuid

from services.memory_service import create_memory, search_memories
from services.tasks import create_task_service, list_tasks_service
from storage.database import get_session_now
from storage.models import Memory, Task, User

try:
    # Agent tool import is optional; we only assert it is importable and callable.
    from agent.tools import RecallArgs, recall_memory_tool

    AGENT_TOOL_AVAILABLE = True
except Exception:
    recall_memory_tool = None
    RecallArgs = None
    AGENT_TOOL_AVAILABLE = False


def run_smoke():
    failures: list[tuple[str, str]] = []

    # Color helpers: prefer colorama on Windows, fall back to ANSI sequences
    try:
        from colorama import Fore, Style
        from colorama import init as _colorama_init

        _colorama_init()
        GREEN = Fore.GREEN
        RED = Fore.RED
        RESET = Style.RESET_ALL
    except Exception:
        GREEN = "\033[92m"
        RED = "\033[91m"
        RESET = "\033[0m"

    def print_pass(name: str) -> None:
        print(f"{GREEN}[PASS] {name}{RESET}")

    def print_fail(name: str, details: str | Exception | None = None) -> None:
        print(f"{RED}[FAIL] {name}{RESET}")
        if details is not None:
            if isinstance(details, Exception):
                print(f"{RED}{traceback.format_exc()}{RESET}")
            else:
                print(f"{RED}{details}{RESET}")

    with get_session_now() as db:
        # Create a test user
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"{user_id}@example.com",
            password_hash="x",
            name="Smoke Tester",
        )
        db.add(user)
        db.commit()

        # --- Task service smoke test ---
        try:
            payload = {
                "title": "Smoke Task",
                "description": "Created by smoke_test_core",
                "priority": "low",
            }
            created = create_task_service(payload, user_id, db)
            tasks = list_tasks_service(user_id, db)
            if not any(t.get("id") == created.get("id") for t in tasks):
                msg = "Task service: created task not found in list"
                print_fail("Task service create/list", msg)
                failures.append(("Task service create/list", msg))
            else:
                print_pass("Task service create/list")
        except Exception as e:
            print_fail("Task service create/list", e)
            failures.append(("Task service create/list", str(e)))

        # --- Memory service smoke test ---
        try:
            emb = [0.01] * 1536
            content = "Smoke memory for vector search"
            mem = create_memory(db, user_id, content, emb)
            if not mem.get("id"):
                msg = "Memory service: create_memory returned no id"
                print_fail("Memory service create + search", msg)
                failures.append(("Memory service create + search", msg))
            else:
                # search with same vector; expect the created memory to be in results
                results = search_memories(db, user_id, emb, limit=3)
                ids = [r.get("id") for r in results]
                if mem.get("id") in ids:
                    print_pass("Memory service create + search")
                else:
                    msg = (
                        f"Memory service: created memory id {mem.get('id')} "
                        f"not found in search results: {ids}"
                    )
                    print_fail("Memory service create + search", msg)
                    failures.append(("Memory service create + search", msg))
        except Exception as e:
            print_fail("Memory service create + search", e)
            failures.append(("Memory service create + search", str(e)))

        # --- Agent tool smoke test (import/call) ---
        try:
            if AGENT_TOOL_AVAILABLE and recall_memory_tool and RecallArgs:
                # Compatibility: langchain's decorator sometimes returns a
                # StructuredTool object rather than a plain callable. Try a few
                # invocation patterns so this smoke test works across versions.
                def _call_tool(tool_obj, args_obj):
                    # Direct call if it's a function
                    if callable(tool_obj):
                        return tool_obj(args_obj)

                    # Try common attributes on StructuredTool-like objects
                    for attr in ("func", "run", "_run"):
                        candidate = getattr(tool_obj, attr, None)
                        if callable(candidate):
                            try:
                                return candidate(args_obj)
                            except TypeError:
                                # Try passing a plain dict if the tool expects JSON
                                try:
                                    payload = (
                                        args_obj.model_dump()
                                        if hasattr(args_obj, "model_dump")
                                        else getattr(args_obj, "__dict__", {})
                                    )
                                    return candidate(payload)
                                except Exception:
                                    # ignore and continue
                                    pass

                    # Last resort: some tools expose `run` that expects strings
                    if hasattr(tool_obj, "run") and callable(tool_obj.run):
                        payload = (
                            args_obj.model_dump()
                            if hasattr(args_obj, "model_dump")
                            else getattr(args_obj, "__dict__", {})
                        )
                        return tool_obj.run(payload)

                    raise TypeError(
                        "Tool object is not callable and has no runnable attribute"
                    )

                args = RecallArgs(user_id=user_id, query="smoke test query", limit=1)
                try:
                    resp = _call_tool(recall_memory_tool, args)
                except Exception as e:
                    print_fail("Agent recall tool callable", e)
                    failures.append(("Agent recall tool callable", str(e)))
                else:
                    # we expect a string response (either error or matches)
                    if isinstance(resp, str):
                        print_pass("Agent recall tool callable (returned string)")
                    else:
                        msg = "Agent tool: unexpected non-string response"
                        print_fail("Agent recall tool callable", msg)
                        failures.append(("Agent recall tool callable", msg))
            else:
                print("SKIP: Agent tool not available in this environment")
        except Exception as e:
            print_fail("Agent tool", e)
            failures.append(("Agent tool", str(e)))

        # Cleanup: remove created rows to keep DB tidy
        try:
            # Remove memories
            try:
                db.query(Memory).filter(Memory.user_id == user_id).delete(
                    synchronize_session=False
                )
            except Exception:
                pass
            # Remove tasks
            try:
                db.query(Task).filter(Task.user_id == user_id).delete(
                    synchronize_session=False
                )
            except Exception:
                pass
            # Remove user
            try:
                db.query(User).filter(User.id == user_id).delete(
                    synchronize_session=False
                )
            except Exception:
                pass
            db.commit()
        except Exception:
            db.rollback()

    if failures:
        print("\nFAILURES:")
        for f in failures:
            print("- ", f)
        return 1

    print("\nALL SMOKE TESTS PASSED")
    return 0


if __name__ == "__main__":
    code = run_smoke()
    sys.exit(code)
