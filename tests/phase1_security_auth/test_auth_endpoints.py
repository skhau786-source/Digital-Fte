import pytest


def test_signup_password_strength_enforcement(client):
    """Ensure weak passwords without special char / uppercase / numbers are rejected."""
    # Missing uppercase and special char
    weak_payload = {
        "username": "testuser_weak",
        "email": "testweak@example.com",
        "password": "simplepassword1",
        "full_name": "Weak User",
    }
    response = client.post("/auth/signup", json=weak_payload)
    assert response.status_code == 422, "Expected validation error 422 for weak password"


def test_login_invalid_credentials_rejected(client):
    """Ensure wrong passwords return 401 Unauthorized."""
    bad_login = {
        "email": "nonexistent_user_999@autofte.com",
        "password": "WrongPassword@2026!",
    }
    response = client.post("/auth/login", json=bad_login)
    assert response.status_code == 401
