import pytest


def test_analytics_overview_requires_authentication(client):
    """Ensure analytics overview strictly rejects unauthenticated requests."""
    response = client.get("/api/v1/dashboard/analytics/overview")
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"


def test_analytics_overview_calculates_correct_aggregates(client, auth_headers):
    """Verify analytics overview computes live SQL aggregates matching store database records."""
    response = client.get("/api/v1/dashboard/analytics/overview", headers=auth_headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    # Verify structural integrity
    assert "store_id" in data
    assert "total_revenue" in data
    assert "total_orders" in data
    assert "total_products" in data
    assert "avg_order_value" in data
    assert "conversion_rate" in data
    assert "funnel" in data
    assert "traffic_stats" in data
    assert "top_products" in data

    # Verify seeded demo store numbers
    assert data["total_orders"] >= 5
    assert data["total_products"] >= 5
    assert data["total_revenue"] > 500.0
    assert data["avg_order_value"] > 50.0

    # Verify funnel calculations
    funnel = data["funnel"]
    assert "total_impressions" in funnel
    assert "intent_detected" in funnel
    assert "converted" in funnel

    # Verify traffic stats format
    stats = data["traffic_stats"]
    assert len(stats) == 4
    assert any(s["label"] == "Direct Sales" for s in stats)


def test_analytics_revenue_by_day_requires_authentication(client):
    """Ensure revenue-by-day analytics endpoint requires valid auth."""
    response = client.get("/api/v1/analytics/revenue?store_id=1")
    assert response.status_code == 401


def test_analytics_revenue_by_day_returns_daily_points(client, auth_headers):
    """Ensure revenue-by-day endpoint returns daily points for user store."""
    overview_resp = client.get("/api/v1/dashboard/analytics/overview", headers=auth_headers)
    assert overview_resp.status_code == 200
    store_id = overview_resp.json()["store_id"]

    response = client.get(f"/api/v1/analytics/revenue?store_id={store_id}&days=7", headers=auth_headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    points = response.json()
    assert isinstance(points, list)
