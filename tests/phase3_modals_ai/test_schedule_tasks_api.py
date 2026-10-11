import pytest


def test_schedule_task_requires_authentication(client):
    """Ensure task scheduling endpoint strictly rejects unauthenticated requests."""
    response = client.post(
        "/api/v1/dashboard/tasks",
        json={
            "title": "Quantum Pro Spring Drop",
            "content": "Exciting sound engineering launch!",
            "platforms": ["instagram"],
            "priority": "High",
        },
    )
    assert response.status_code == 401


def test_schedule_task_success(client, auth_headers):
    """Ensure valid task can be created and retrieved through dashboard tasks API."""
    task_payload = {
        "title": "Automated Summer Launch",
        "content": "Discover modern design aesthetics.",
        "platforms": ["instagram", "facebook"],
        "priority": "Medium",
        "asset_url": "https://example.com/asset.jpg",
    }
    response = client.post(
        "/api/v1/dashboard/tasks",
        headers=auth_headers,
        json=task_payload,
    )
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    created = response.json()
    assert "id" in created
    assert created["title"] == task_payload["title"]
    assert created["priority"] == "Medium"

    # Verify task appears in user's tasks list
    list_resp = client.get("/api/v1/dashboard/tasks", headers=auth_headers)
    assert list_resp.status_code == 200
    tasks = list_resp.json()
    assert any(t.get("title") == task_payload["title"] for t in tasks)


def test_schedule_task_priority_validation(client, auth_headers):
    """Verify invalid priority values are rejected with 422."""
    response = client.post(
        "/api/v1/dashboard/tasks",
        headers=auth_headers,
        json={
            "title": "Invalid Priority Task",
            "platforms": ["twitter"],
            "priority": "InvalidPriorityLevel",
        },
    )
    assert response.status_code == 422
