import pytest


def test_generate_post_requires_authentication(client):
    """Ensure content generation endpoint strictly rejects unauthenticated requests."""
    response = client.post(
        "/api/v1/content/generate",
        json={"product_id": 1, "platform": "instagram", "image_model": "gemini"},
    )
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"


def test_generate_post_success_for_seeded_product(client, auth_headers):
    """Verify AI content generation succeeds with valid product and returns caption and image."""
    # First get the seeded products
    prod_resp = client.get("/api/v1/dashboard/products", headers=auth_headers)
    assert prod_resp.status_code == 200
    products = prod_resp.json()
    assert len(products) > 0, "Expected seeded products to be present"
    product_id = products[0]["id"]

    response = client.post(
        "/api/v1/content/generate",
        headers=auth_headers,
        json={
            "product_id": product_id,
            "platform": "instagram",
            "image_model": "gemini",
        },
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "post_id" in data
    assert data["status"] in ["review", "approved"]
    assert len(data["caption"]) > 10
    assert "image_url" in data


def test_generate_post_invalid_product_returns_404(client, auth_headers):
    """Verify requesting generation for nonexistent product returns 404."""
    response = client.post(
        "/api/v1/content/generate",
        headers=auth_headers,
        json={"product_id": 999999, "platform": "instagram"},
    )
    assert response.status_code == 404
