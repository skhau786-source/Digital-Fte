import pytest


def test_dashboard_endpoints_reject_unauthenticated_requests(client):
    """
    Security verification:
    Ensure that any unauthenticated request to /api/v1/dashboard/*
    is strictly rejected with 401 Unauthorized, eliminating the
    previous insecure admin@autofte.com fallback.
    """
    endpoints = [
        "/api/v1/dashboard/overview",
        "/api/v1/dashboard/products",
        "/api/v1/dashboard/orders",
        "/api/v1/dashboard/tasks",
        "/api/v1/dashboard/settings",
    ]

    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401, f"Expected 401 for unauthenticated {endpoint}, got {response.status_code}"
        body = response.json()
        assert "detail" in body
        # Ensure admin data is NEVER leaked to guests
        assert "admin@autofte.com" not in response.text


def test_dashboard_endpoints_reject_forged_bearer_token(client):
    """Ensure invalid/forged JWT tokens are rejected with 401."""
    headers = {"Authorization": "Bearer forged_fake_token_12345"}
    response = client.get("/api/v1/dashboard/overview", headers=headers)
    assert response.status_code == 401
