# ═══════════════════════════════════════════════════════════════
# fte_sdk / platforms / shopify_admin.py
#
# PURPOSE: Minimal Shopify Admin API GraphQL client (read-only order
#          lookup). The existing ShopifyConnector uses the REST SDK for
#          bulk sync; GraphQL is used here because a single targeted
#          query by order name is far cheaper than paging REST orders.
#
# SCOPES:  read_orders (+ read_all_orders for orders older than 60 days).
# ═══════════════════════════════════════════════════════════════

import logging
import re
from typing import Optional

import httpx

from src.sdk.config import get_settings

logger = logging.getLogger(__name__)

ORDER_QUERY = """
query OrderByName($q: String!) {
  orders(first: 5, query: $q) {
    edges {
      node {
        id
        name
        email
        phone
        createdAt
        cancelledAt
        cancelReason
        displayFinancialStatus
        displayFulfillmentStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        shippingAddress { phone }
        billingAddress { phone }
        lineItems(first: 20) { edges { node { title quantity } } }
        fulfillments(first: 10) {
          status
          displayStatus
          estimatedDeliveryAt
          deliveredAt
          trackingInfo { company number url }
        }
      }
    }
  }
}
"""


class ShopifyAdminError(Exception):
    """Transport / API failure (never raised for 'order not found')."""


def shop_domain_for(store) -> Optional[str]:
    """Best-effort myshopify domain for a Store row."""
    raw = getattr(store, "shop_domain", None) or getattr(store, "platform_store_id", None)
    if not raw:
        return None
    raw = re.sub(r"^https?://", "", str(raw).strip()).split("/")[0]
    if "." not in raw:
        raw = f"{raw}.myshopify.com"
    return raw


def normalize_phone(value: str | None) -> str:
    """Digits only, compared on the last 10 digits so +92 300 1234567 == 0300-1234567."""
    digits = re.sub(r"\D", "", value or "")
    return digits[-10:] if len(digits) >= 7 else ""


def normalize_order_number(value: str) -> str:
    m = re.search(r"\d+", value or "")
    return m.group(0) if m else ""


class ShopifyAdminClient:
    def __init__(
        self,
        shop_domain: str,
        access_token: str,
        api_version: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.api_version = api_version or get_settings().SHOPIFY_API_VERSION
        self._transport = transport

    @property
    def endpoint(self) -> str:
        return f"https://{self.shop_domain}/admin/api/{self.api_version}/graphql.json"

    async def _post(self, query: str, variables: dict) -> dict:
        try:
            async with httpx.AsyncClient(transport=self._transport, timeout=15) as client:
                res = await client.post(
                    self.endpoint,
                    json={"query": query, "variables": variables},
                    headers={
                        "X-Shopify-Access-Token": self.access_token,
                        "Content-Type": "application/json",
                    },
                )
        except httpx.HTTPError as e:
            raise ShopifyAdminError(f"network error: {e}") from e
        if res.status_code in (401, 403):
            raise ShopifyAdminError(f"Shopify rejected the access token / scopes (HTTP {res.status_code})")
        if res.status_code >= 400:
            raise ShopifyAdminError(f"Shopify HTTP {res.status_code}")
        body = res.json()
        if body.get("errors"):
            raise ShopifyAdminError(f"GraphQL errors: {body['errors']}")
        return body.get("data") or {}

    async def find_order(self, order_number: str) -> Optional[dict]:
        """Return the raw order node whose name matches ``order_number`` or None."""
        num = normalize_order_number(order_number)
        if not num:
            return None
        data = await self._post(ORDER_QUERY, {"q": f"name:#{num}"})
        for edge in (data.get("orders") or {}).get("edges", []):
            node = edge["node"]
            if normalize_order_number(node.get("name", "")) == num:
                return node
        return None


def order_matches_contact(order: dict, email: str = "", phone: str = "") -> bool:
    """True only if the supplied email or phone matches one on the order."""
    email = (email or "").strip().lower()
    phone_n = normalize_phone(phone)
    if not email and not phone_n:
        return False
    emails = {
        (order.get("email") or "").strip().lower(),
    } - {""}
    phones = {
        normalize_phone(order.get("phone")),
        normalize_phone((order.get("shippingAddress") or {}).get("phone")),
        normalize_phone((order.get("billingAddress") or {}).get("phone")),
    } - {""}
    return (bool(email) and email in emails) or (bool(phone_n) and phone_n in phones)


def summarize_order(order: dict) -> dict:
    """Customer-safe order summary (no email/phone/address echoed back)."""
    money = ((order.get("currentTotalPriceSet") or {}).get("shopMoney")) or {}
    fulfillments = []
    for f in order.get("fulfillments") or []:
        fulfillments.append({
            "status": f.get("displayStatus") or f.get("status"),
            "estimated_delivery": f.get("estimatedDeliveryAt"),
            "delivered_at": f.get("deliveredAt"),
            "tracking": [
                {"carrier": t.get("company"), "number": t.get("number"), "url": t.get("url")}
                for t in (f.get("trackingInfo") or [])
            ],
        })
    return {
        "order_number": order.get("name"),
        "placed_at": order.get("createdAt"),
        "payment_status": order.get("displayFinancialStatus"),
        "fulfillment_status": order.get("displayFulfillmentStatus"),
        "cancelled": bool(order.get("cancelledAt")),
        "cancel_reason": order.get("cancelReason"),
        "total": f"{money.get('amount')} {money.get('currencyCode')}" if money else None,
        "items": [
            {"title": e["node"]["title"], "quantity": e["node"]["quantity"]}
            for e in (order.get("lineItems") or {}).get("edges", [])
        ],
        "shipments": fulfillments,
    }
