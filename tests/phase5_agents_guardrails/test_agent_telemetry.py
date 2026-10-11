import pytest


def test_launch_workflow_requires_authentication(client):
    """Ensure agent launch endpoint strictly rejects unauthenticated calls."""
    response = client.post("/api/v1/dashboard/launch")
    assert response.status_code == 401


def test_launch_workflow_success(client, auth_headers):
    """Ensure agent orchestrator workflow launch succeeds for authenticated user."""
    response = client.post("/api/v1/dashboard/launch", headers=auth_headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["status"] == "launched"
    assert "user_id" in data


def test_automation_settings_lifecycle(client, auth_headers):
    """Ensure automation settings can be retrieved and updated securely."""
    # Retrieve current settings
    get_resp = client.get("/api/v1/dashboard/settings", headers=auth_headers)
    assert get_resp.status_code == 200
    settings = get_resp.json()
    assert "manual_review" in settings

    # Update settings
    new_settings = {
        "manual_review": False,
        "operating_start": 8,
        "operating_end": 22,
        "meta_access_token": "meta_live_token_verified",
    }
    put_resp = client.put(
        "/api/v1/dashboard/settings",
        headers=auth_headers,
        json=new_settings,
    )
    assert put_resp.status_code == 200
    updated = put_resp.json()
    assert updated["manual_review"] is False
    assert updated["operating_start"] == 8
    assert updated["operating_end"] == 22

    # Verify persistence
    verify_resp = client.get("/api/v1/dashboard/settings", headers=auth_headers)
    assert verify_resp.status_code == 200
    persisted = verify_resp.json()
    assert persisted["manual_review"] is False
    assert persisted["operating_start"] == 8
