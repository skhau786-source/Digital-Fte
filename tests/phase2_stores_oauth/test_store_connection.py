import pytest
from uuid import uuid4


def test_user_store_connection_and_tenant_isolation(client):
    """
    Verifies that:
    1. An authenticated user can connect a store.
    2. Store records are strictly scoped to user_id.
    3. User B cannot access User A's store (IDOR prevention).
    """
    u1_suffix = uuid4().hex[:6]
    u2_suffix = uuid4().hex[:6]

    # 1. Register User 1
    u1_res = client.post(
        "/auth/signup",
        json={
            "username": f"user1_{u1_suffix}",
            "email": f"merchant_{u1_suffix}@autofte.com",
            "password": "Password@123!",
            "full_name": "Merchant One",
        },
    )
    assert u1_res.status_code == 201
    user1_token = u1_res.json()["access_token"]
    user1_headers = {"Authorization": f"Bearer {user1_token}"}

    # 2. Register User 2
    u2_res = client.post(
        "/auth/signup",
        json={
            "username": f"user2_{u2_suffix}",
            "email": f"merchant_{u2_suffix}@autofte.com",
            "password": "Password@123!",
            "full_name": "Merchant Two",
        },
    )
    assert u2_res.status_code == 201
    user2_token = u2_res.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # 3. User 1 connects a store
    payload = {
        "platform": "shopify",
        "name": f"User 1 Apex Store {u1_suffix}",
        "shop_name": f"user1-shop-{u1_suffix}",
        "access_token": f"shpat_test_token_{u1_suffix}",
    }
    res = client.post("/api/v1/stores/connect", json=payload, headers=user1_headers)
    assert res.status_code == 200, f"Connect failed: {res.text}"
    store1 = res.json()
    store1_id = store1["id"]
    assert store1["name"] == f"User 1 Apex Store {u1_suffix}"

    # 4. User 1 accesses their store stats
    stats_res1 = client.get(f"/api/v1/stores/{store1_id}/stats", headers=user1_headers)
    assert stats_res1.status_code == 200

    # 5. User 2 attempts to access User 1's store -> MUST return 404 (strictly isolated)
    stats_res2 = client.get(f"/api/v1/stores/{store1_id}/stats", headers=user2_headers)
    assert stats_res2.status_code == 404, "Security violation: User 2 accessed User 1's store!"
