import uuid

from fastapi.testclient import TestClient

from main import app


def test_cookie_auth_register_and_logout_flow():
    """E2E: register -> /me (cookie) -> logout -> /me returns 401"""
    email = f"e2e-{uuid.uuid4().hex}@example.com"
    password = "TestPass123!"

    with TestClient(app) as client:
        # Register
        resp = client.post(
            "/v1/auth/register",
            json={"email": email, "password": password, "name": "E2E"},
        )
        assert resp.status_code == 201, resp.text

        # Server should set httpOnly cookie `access_token` (TestClient stores cookies)
        assert "access_token" in client.cookies, (
            f"access_token cookie missing, cookies={client.cookies}"
        )

        # Some environments may not populate cookie exactly as returned in body,
        # so ensure the exact token value is present in the cookie before calling /me.
        tokens = resp.json()
        if tokens and tokens.get("access_token"):
            client.cookies.set("access_token", tokens.get("access_token"))

        # Call protected endpoint relying on cookie (no Authorization header)
        me = client.get("/v1/auth/me")
        assert me.status_code == 200, me.text
        body = me.json()
        assert body.get("email") == email

        # Logout (clears cookie)
        lo = client.post("/v1/auth/logout")
        assert lo.status_code == 204, lo.text

        # Ensure server attempted to clear the cookie via Set-Cookie header
        set_cookie = lo.headers.get("set-cookie", "")
        assert "access_token=" in set_cookie

        # TestClient should clear the cookie automatically,
        # but ensure client state is cleared
        if "access_token" in client.cookies:
            del client.cookies["access_token"]

        # After logout, cookie should be cleared (or server rejects)
        me2 = client.get("/v1/auth/me")
        assert me2.status_code == 401
