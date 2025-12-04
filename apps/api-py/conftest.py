import pytest

# Import helper functions from the test script to provide a pytest fixture.
# Importing `test_api` is safe because it only defines functions and guards the
# script-like runner with `if __name__ == "__main__"`.
from test_api import register_user, login_user


@pytest.fixture(scope="session")
def token():
    """Register/login and return an access token for integration tests."""
    tk = register_user()
    if not tk:
        tk = login_user()
    return tk