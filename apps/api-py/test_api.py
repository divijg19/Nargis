"""
Test script for Nargis API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8080"

def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_register():
    """Test user registration"""
    print("\n=== Testing User Registration ===")
    user_data = {
        "email": "test@nargis.ai",
        "password": "SecurePass123!",
        "name": "Test User"
    }
    response = requests.post(f"{BASE_URL}/v1/auth/register", json=user_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        return response.json().get("access_token")
    return None

def test_login():
    """Test user login"""
    print("\n=== Testing User Login ===")
    login_data = {
        "email": "test@nargis.ai",
        "password": "SecurePass123!"
    }
    response = requests.post(f"{BASE_URL}/v1/auth/login", json=login_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def test_profile(token):
    """Test get profile endpoint"""
    print("\n=== Testing Get Profile (Protected) ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/v1/auth/me", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_journal_create(token):
    """Test journal entry creation"""
    print("\n=== Testing Journal Entry Creation ===")
    headers = {"Authorization": f"Bearer {token}"}
    journal_data = {
        "title": "Test Entry",
        "content": "This is a test journal entry to verify the API is working correctly. It should generate an AI summary.",
        "type": "text",
        "mood": "great",
        "tags": ["test", "api"]
    }
    response = requests.post(f"{BASE_URL}/v1/journal", json=journal_data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        return response.json().get("id")
    return None

def test_journal_list(token):
    """Test list journal entries"""
    print("\n=== Testing List Journal Entries ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/v1/journal", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_tasks_list(token):
    """Test list tasks"""
    print("\n=== Testing List Tasks ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/v1/tasks", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

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
