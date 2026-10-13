# ═══════════════════════════════════════════════════════════════
# agents / customer_support / shopify_storefront_client.py
#
# PURPOSE: Shopify Storefront API client for cart operations.
#          Requires a real Storefront access token (no mock/dev mode).
# ═══════════════════════════════════════════════════════════════

import logging
import uuid
from typing import Optional
import httpx

logger = logging.getLogger(__name__)


class ShopifyStorefrontClient:
    """Client for Shopify Storefront API (Cart operations)."""

    def __init__(
        self,
        shop_domain: str,
        access_token: str = "",
        api_url: str = "https://{shop}/api/2024-01/graphql.json",
    ):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.api_url = api_url.format(shop=shop_domain)

    def _require_token(self) -> None:
        if not self.access_token:
            raise RuntimeError("Shopify Storefront access token is not configured")

    async def create_cart(self, lines: list[dict]) -> dict:
        """Create a new cart with initial line items."""
        self._require_token()

        mutation = """
        mutation cartCreate($input: CartInput) {
          cartCreate(input: $input) {
            cart {
              id
              checkoutUrl
              totalQuantity
            }
            userErrors { field message }
          }
        }
        """
        async with httpx.AsyncClient() as client:
            res = await client.post(
                self.api_url,
                json={"query": mutation, "variables": {"input": {"lines": lines}}},
                headers={"X-Shopify-Storefront-Access-Token": self.access_token},
            )
            data = res.json()
            cart_data = data.get("data", {}).get("cartCreate", {}).get("cart", {})
            return {
                "status": "ok",
                "cart_id": cart_data.get("id"),
                "checkout_url": cart_data.get("checkoutUrl"),
                "total_quantity": cart_data.get("totalQuantity"),
            }

    async def cart_lines_add(self, cart_id: str, lines: list[dict]) -> dict:
        """Add lines to an existing cart."""
        self._require_token()

        mutation = """
        mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { id totalQuantity }
            userErrors { field message }
          }
        }
        """
        async with httpx.AsyncClient() as client:
            res = await client.post(
                self.api_url,
                json={"query": mutation, "variables": {"cartId": cart_id, "lines": lines}},
                headers={"X-Shopify-Storefront-Access-Token": self.access_token},
            )
            return res.json()
