import importlib
import os
import sys
import traceback

# Ensure the `apps/api-py` package root is on sys.path so `tests` can be imported
this_dir = os.path.dirname(__file__)
sys.path.insert(0, os.path.dirname(this_dir))

TEST_MODULES = [
    "tests.test_services_habits",
    "tests.test_services_journal",
]

failures = []

for mod_name in TEST_MODULES:
    try:
        mod = importlib.import_module(mod_name)
    except Exception:
        print(f"ERROR importing {mod_name}")
        traceback.print_exc()
        failures.append((mod_name, "import"))
        continue

    for attr in dir(mod):
        if attr.startswith("test_") and callable(getattr(mod, attr)):
            fn = getattr(mod, attr)
            print(f"RUNNING {mod_name}.{attr}()")
            try:
                fn()
            except AssertionError as e:
                print(f"FAIL: {mod_name}.{attr} -> {e}")
                traceback.print_exc()
                failures.append((f"{mod_name}.{attr}", str(e)))
            except Exception as e:
                print(f"ERROR: {mod_name}.{attr} -> {e}")
                traceback.print_exc()
                failures.append((f"{mod_name}.{attr}", str(e)))

if failures:
    print("\nSOME TESTS FAILED:\n")
    for f in failures:
        print(f" - {f[0]}: {f[1]}")
    raise SystemExit(1)

print("\nALL TESTS PASSED")
