import os

import pytest

# Set dummy API keys for tests to prevent import errors in CI/CD without keys
os.environ.setdefault("GROQ_API_KEY", "dummy")
os.environ.setdefault("DEEPGRAM_API_KEY", "dummy")
os.environ.setdefault("OPENAI_API_KEY", "dummy")

from storage.database import init_db

# Import helper functions from the test script to provide a pytest fixture.
# Importing `test_api` is safe because it only defines functions and guards the
# script-like runner with `if __name__ == "__main__"`.
from tests.integration.test_api import login_user, register_user


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Initialize the database before running tests."""
    init_db()


@pytest.fixture(scope="session")
def token():
    """Register/login and return an access token for integration tests."""
    tk = register_user()
    if not tk:
        tk = login_user()
    return tk
