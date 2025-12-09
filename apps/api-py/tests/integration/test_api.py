"""
Test script for Nargis API endpoints
"""

import requests
from fastapi.testclient import TestClient

from main import app

# Use in-process TestClient so tests run without a separate server process.
client = TestClient(app)


def register_user():
    """Helper: register a test user and return access token or None."""
    user_data = {
        "email": "test@nargis.ai",
        "password": "SecurePass123!",
        "name": "Test User",
    }
    response = client.post("/v1/auth/register", json=user_data)
    if response.status_code == 201:
        return response.json().get("access_token")
    # If the user already exists, attempt to login and return an access token
    if response.status_code == 400:
        # try to login instead
        return login_user()
    return None


def login_user():
    """Helper: login and return access token or None."""
    login_data = {"email": "test@nargis.ai", "password": "SecurePass123!"}
    response = client.post("/v1/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


def test_health():
    """Test health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200


def test_register():
    """Integration: register returns an access token."""
    token = register_user()
    assert token is not None


def test_login():
    """Integration: login returns an access token."""
    token = login_user()
    assert token is not None


def test_profile(token):
    """Test get profile endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/v1/auth/me", headers=headers)
    assert response.status_code == 200


def test_journal_create(token):
    """Test journal entry creation"""
    headers = {"Authorization": f"Bearer {token}"}
    journal_data = {
        "title": "Test Entry",
        "content": (
            "This is a test journal entry to verify the API is working correctly. "
            "It should generate an AI summary."
        ),
        "type": "text",
        "mood": "great",
        "tags": ["test", "api"],
    }
    response = client.post("/v1/journal", json=journal_data, headers=headers)
    assert response.status_code == 201


def test_journal_list(token):
    """Test list journal entries"""
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/v1/journal", headers=headers)
    assert response.status_code == 200


def test_tasks_list(token):
    """Test list tasks"""
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/v1/tasks", headers=headers)
    assert response.status_code == 200


def main():
    """Run all tests"""
    print("=" * 60)
    print("Nargis API Test Suite")
    print("=" * 60)

    # Test health
    if not test_health():
        print("\n❌ Health check failed!")
        return
    print("✅ Health check passed")

    # Test registration
    token = test_register()
    if not token:
        print("\n❌ Registration failed!")
        return
    print("✅ Registration passed")

    # Test login
    token = test_login()
    if not token:
        print("\n❌ Login failed!")
        return
    print("✅ Login passed")

    # Test protected profile endpoint
    if not test_profile(token):
        print("\n❌ Profile endpoint failed!")
        return
    print("✅ Profile endpoint passed")

    # Test journal creation
    entry_id = test_journal_create(token)
    if not entry_id:
        print("\n❌ Journal creation failed!")
        return
    print("✅ Journal creation passed")

    # Test journal list
    if not test_journal_list(token):
        print("\n❌ Journal list failed!")
        return
    print("✅ Journal list passed")

    # Test tasks list
    if not test_tasks_list(token):
        print("\n❌ Tasks list failed!")
        return
    print("✅ Tasks list passed")

    print("\n" + "=" * 60)
    print("🎉 All tests passed!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to API server.")
        print("Make sure the server is running on http://localhost:8080")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
