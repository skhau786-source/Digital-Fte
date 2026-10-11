import pytest
from src.domains.auth.seeder import DEMO_EMAIL, DEMO_PASSWORD


def test_sample_enterprise_credentials_login(client):
    """
    Verifies that the pre-seeded sample enterprise account:
    demo@autofte.com / AutoFTE@2026!
    can authenticate successfully and receive a signed JWT access token.
    """
    payload = {
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD,
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 200, f"Failed to login with sample account: {response.text}"
    body = response.json()

    assert "access_token" in body
    assert body.get("token_type") == "bearer"
    assert "user" in body
    assert body["user"]["email"] == DEMO_EMAIL

    # Use the returned JWT token to access dashboard products
    token = body["access_token"]
    dash_res = client.get("/api/v1/dashboard/products", headers={"Authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    products = dash_res.json()
    assert isinstance(products, list)
    assert len(products) >= 1
