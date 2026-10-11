import uuid
import pytest


def test_demo_user_has_preseeded_flagship_store(client, auth_headers):
    """Verify demo enterprise account (demo@autofte.com) has pre-seeded products and orders."""
    # 1. Overview check
    resp = client.get("/api/v1/dashboard/overview", headers=auth_headers)
    assert resp.status_code == 200, f"Overview error: {resp.text}"
    data = resp.json()

    assert data.get("is_demo") is True
    assert data["total_products"] >= 5
    assert data["total_orders"] >= 5
    assert data["revenue_today"] > 500.0

    # 2. Analytics check
    analytics_resp = client.get("/api/v1/dashboard/analytics/overview", headers=auth_headers)
    assert analytics_resp.status_code == 200
    a_data = analytics_resp.json()

    assert a_data["total_revenue"] > 500.0
    assert len(a_data["top_products"]) > 0
    assert a_data["funnel"]["total_impressions"] != "0"


def test_new_user_registration_and_clean_zero_state(client):
    """Verify newly registered users get a strictly clean slate: $0 revenue, 0 orders, 0 products, 0 leads."""
    uid = uuid4_hex = uuid.uuid4().hex[:8]
    email = f"merchant_{uid}@autofte-store.com"
    username = f"merchant_{uid}"
    password = "SecurePassword123!"

    # 1. Register new user
    signup_resp = client.post(
        "/auth/signup",
        json={
            "email": email,
            "username": username,
            "password": password,
            "full_name": f"Merchant {uid}",
        },
    )
    assert signup_resp.status_code == 201, f"Signup failed: {signup_resp.text}"

    # 2. Login to get token
    login_resp = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # 3. Overview must be clean zero-state
    ov_resp = client.get("/api/v1/dashboard/overview", headers=user_headers)
    assert ov_resp.status_code == 200, f"Overview failed: {ov_resp.text}"
    ov_data = ov_resp.json()

    assert ov_data.get("is_demo") is False
    assert ov_data["revenue_today"] == 0.0
    assert ov_data["total_orders"] == 0
    assert ov_data["total_products"] == 0
    assert ov_data["total_leads"] == 0
    assert ov_data["pending_leads"] == 0
    assert ov_data["responded_leads"] == 0
    assert len(ov_data["recent_orders"]) == 0

    # 4. Analytics overview must be pure zeros
    an_resp = client.get("/api/v1/dashboard/analytics/overview", headers=user_headers)
    assert an_resp.status_code == 200, f"Analytics failed: {an_resp.text}"
    an_data = an_resp.json()

    assert an_data.get("is_demo") is False
    assert an_data["total_revenue"] == 0.0
    assert an_data["total_orders"] == 0
    assert an_data["total_products"] == 0
    assert an_data["conversion_rate"] == "0.0%"
    assert an_data["funnel"]["total_impressions"] == "0"
    assert an_data["funnel"]["intent_detected"] == "0"
    assert an_data["funnel"]["converted"] == "0"
    assert an_data["traffic_stats"][0]["value"] == "0"
    assert an_data["traffic_stats"][3]["value"] == "$0.00"
    assert len(an_data["top_products"]) == 0


def test_oauth_authorize_url_generation_for_shopify(client, auth_headers):
    """Verify endpoint generates standard Shopify OAuth authorize URL with state and scopes."""
    resp = client.get(
        "/api/v1/auth/shopify/authorize-url?shop=urban-fashion.myshopify.com",
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"OAuth authorize URL error: {resp.text}"
    data = resp.json()

    assert data["platform"] == "shopify"
    assert data["shop"] == "urban-fashion"
    assert "authorize_url" in data

    url = data["authorize_url"]
    assert url.startswith("https://urban-fashion.myshopify.com/admin/oauth/authorize")
    assert "client_id=" in url
    assert "scope=" in url
    assert "redirect_uri=" in url
    assert "state=" in url


def test_oauth_domain_sanitization_prevents_duplicate_domains(client, auth_headers):
    """Verify that domain formats (with https, slashes, or naked names) are cleanly sanitized."""
    test_cases = [
        ("https://my-store.myshopify.com/", "my-store"),
        ("my-store.myshopify.com", "my-store"),
        ("my-store", "my-store"),
        ("http://store-pk.myshopify.com", "store-pk"),
    ]

    for raw_domain, expected_shop in test_cases:
        resp = client.get(
            f"/api/v1/auth/shopify/authorize-url?shop={raw_domain}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["shop"] == expected_shop
        assert ".myshopify.com.myshopify.com" not in data["authorize_url"]
        assert f"https://{expected_shop}.myshopify.com/admin/oauth/authorize" in data["authorize_url"]


def test_tenant_isolation_new_user_stores(client):
    """Verify stores created by one user are not visible or accessible to another user."""
    # Register User A
    uid_a = uuid.uuid4().hex[:6]
    email_a = f"usera_{uid_a}@test.com"
    pwd = "TestPassword123!"
    client.post("/auth/signup", json={"email": email_a, "username": f"user_a_{uid_a}", "password": pwd})
    token_a = client.post("/auth/login", json={"email": email_a, "password": pwd}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register User B
    uid_b = uuid.uuid4().hex[:6]
    email_b = f"userb_{uid_b}@test.com"
    client.post("/auth/signup", json={"email": email_b, "username": f"user_b_{uid_b}", "password": pwd})
    token_b = client.post("/auth/login", json={"email": email_b, "password": pwd}).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A connects a store
    store_a_resp = client.post(
        "/api/v1/stores/connect",
        headers=headers_a,
        json={
            "platform": "shopify",
            "name": "User A Fashion Boutique",
            "shop_name": f"usera-{uid_a}",
            "access_token": "shpat_test_token_user_a",
        },
    )
    assert store_a_resp.status_code == 200
    store_a_id = store_a_resp.json()["id"]

    # User B should only see their own stores, not User A's
    stores_b = client.get("/api/v1/stores", headers=headers_b).json()
    b_store_ids = [s["id"] for s in stores_b]
    assert store_a_id not in b_store_ids
