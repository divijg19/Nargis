"""
Test authentication protection on API endpoints
"""

import requests

BASE_URL = "http://127.0.0.1:8080"

def run_manual_auth_test():
    """Manual script to exercise auth endpoints.

    This function is intentionally not executed on import so pytest can
    collect tests without hitting a live server. Run this file directly
    with `python test_auth.py` to execute the manual checks.
    """

    print("=" * 60)
    print("Testing Authentication Protection")
    print("=" * 60)

    # Step 1: Try accessing protected endpoint without auth
    print("\n1. Testing unauthorized access to /v1/journal...")
    response = requests.get(f"{BASE_URL}/v1/journal")
    print(f"   Status: {response.status_code}")
    if response.status_code == 401:
        print("   ✅ Correctly rejected (401 Unauthorized)")
    else:
        print(f"   ❌ Expected 401, got {response.status_code}")

    # Step 2: Register a new user
    print("\n2. Registering new user...")
    user_data = {"email": "user2@nargis.ai", "password": "TestPass123!", "name": "User Two"}
    response = requests.post(f"{BASE_URL}/v1/auth/register", json=user_data)
    print(f"   Status: {response.status_code}")
    if response.status_code == 201:
        token = response.json().get("access_token")
        print(f"   ✅ User registered, token: {token[:30]}...")
    else:
        print(f"   ❌ Registration failed: {response.text}")
        return

    # Step 3: Create a journal entry with authentication
    print("\n3. Creating journal entry with auth...")
    headers = {"Authorization": f"Bearer {token}"}
    entry_data = {
        "title": "Authenticated Entry",
        "content": "This entry should only be visible to the authenticated user.",
        "type": "text",
        "mood": "great",
        "tags": ["auth", "test"],
    }
    response = requests.post(f"{BASE_URL}/v1/journal", json=entry_data, headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 201:
        entry = response.json()
        entry_id = entry["id"]
        print(f"   ✅ Entry created: {entry_id}")
        print(f"   User ID: {entry.get('userId')}")
        print(f"   AI Summary: {entry.get('aiSummary')}")
    else:
        print(f"   ❌ Creation failed: {response.text}")
        return

    # Step 4: List entries (should only show user's entries)
    print("\n4. Listing journal entries...")
    response = requests.get(f"{BASE_URL}/v1/journal", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        entries = response.json()
        print(f"   ✅ Retrieved {len(entries)} entries")
        for e in entries:
            print(f"      - {e['title']} (User: {e.get('userId', 'N/A')[:8]}...)")
    else:
        print(f"   ❌ List failed: {response.text}")

    # Step 5: Create a task with authentication
    print("\n5. Creating task with auth...")
    task_data = {
        "title": "Test Task",
        "description": "This is a protected task",
        "status": "pending",
        "priority": "high",
    }
    response = requests.post(f"{BASE_URL}/v1/tasks", json=task_data, headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 201:
        task = response.json()
        task_id = task["id"]
        print(f"   ✅ Task created: {task_id}")
        print(f"   User ID: {task.get('userId')}")
    else:
        print(f"   ❌ Task creation failed: {response.text}")
        return

    # Step 6: Try accessing with wrong/expired token
    print("\n6. Testing with invalid token...")
    bad_headers = {"Authorization": "Bearer invalid_token_here"}
    response = requests.get(f"{BASE_URL}/v1/journal", headers=bad_headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 401:
        print("   ✅ Correctly rejected invalid token")
    else:
        print(f"   ❌ Expected 401, got {response.status_code}")

    # Step 7: Register another user and verify data isolation
    print("\n7. Testing data isolation between users...")
    user2_data = {
        "email": "user3@nargis.ai",
        "password": "AnotherPass123!",
        "name": "User Three",
    }
    response = requests.post(f"{BASE_URL}/v1/auth/register", json=user2_data)
    if response.status_code == 201:
        token2 = response.json().get("access_token")
        print("   ✅ Second user registered")

        # Try to list journal entries as second user
        headers2 = {"Authorization": f"Bearer {token2}"}
        response = requests.get(f"{BASE_URL}/v1/journal", headers=headers2)
        if response.status_code == 200:
            entries2 = response.json()
            print(f"   Second user sees {len(entries2)} entries (should be 0)")
            if len(entries2) == 0:
                print("   ✅ Data isolation working correctly")
            else:
                print("   ❌ Data leakage detected!")
    else:
        print("   ❌ Second user registration failed")

    print("\n" + "=" * 60)
    print("✨ Authentication testing complete!")
    print("=" * 60)


if __name__ == "__main__":
    run_manual_auth_test()
