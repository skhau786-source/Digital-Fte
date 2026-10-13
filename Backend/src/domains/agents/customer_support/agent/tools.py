# ═══════════════════════════════════════════════════════════════
# customer_support / agent / tools.py
#
# PURPOSE: The five Claude tools (schemas + executors):
#            search_products, get_product, update_cart,
#            get_order_status, handoff_to_owner
#          Every executor returns a JSON-serialisable dict. Failures are
#          returned as {"error": "..."} so the model can react; every call
#          (and every error) is logged.
# ═══════════════════════════════════════════════════════════════

import json
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.sdk.config import get_settings
from src.sdk.models.base import Store
from src.sdk.models.support import Conversation, Handoff, HandoffLog, Message
from src.sdk.oauth.tokens import TokenManager
from src.sdk.platforms.shopify_admin import (
    ShopifyAdminClient,
    ShopifyAdminError,
    order_matches_contact,
    shop_domain_for,
    summarize_order,
)

from . import cart as cart_service
from .notifier import notify_owner
from .product_search import get_product, product_to_dict, search_products

logger = logging.getLogger("support_agent.tools")

# Failed order verifications per conversation (anti-enumeration). Process-local.
_failed_verifications: dict[int, int] = defaultdict(int)
MAX_FAILED_VERIFICATIONS = 5

HANDOFF_CATEGORIES = ["refund", "complaint", "discount", "custom_order", "unanswerable", "other"]

TOOL_SCHEMAS: list[dict] = [
    {
        "name": "search_products",
        "description": (
            "Search this store's live catalog (the database kept in sync with Shopify). Supports partial and "
            "misspelled names, a category, and attributes such as colour or fabric. Roman Urdu terms are "
            "understood (e.g. 'sooti kapra', 'laal'). Returns each matching product with its variants, exact "
            "price and exact stock. Call this before saying anything about what the store sells."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Free-text product words from the customer, as written."},
                "category": {"type": "string", "description": "Product category / type if the customer named one."},
                "attributes": {
                    "type": "object",
                    "description": "Attribute filters, e.g. {\"color\": \"red\", \"fabric\": \"cotton\", \"size\": \"M\"}.",
                    "additionalProperties": {"type": "string"},
                },
                "in_stock_only": {"type": "boolean", "description": "Only products with stock > 0."},
                "limit": {"type": "integer", "description": "Max products to return (1-10, default 5)."},
            },
        },
    },
    {
        "name": "get_product",
        "description": "Get one product by product_id (from search_products) with all variants, exact price and exact stock.",
        "input_schema": {
            "type": "object",
            "properties": {"product_id": {"type": "integer"}},
            "required": ["product_id"],
        },
    },
    {
        "name": "update_cart",
        "description": (
            "View or change this customer's cart. Use action 'add', 'remove', 'set_quantity', 'view' or 'clear'. "
            "variant_id comes from search_products/get_product (ask the customer which option if a product has "
            "several variants). The result is the full cart with live prices; confirm the change back to the "
            "customer from that result."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["add", "remove", "set_quantity", "view", "clear"]},
                "variant_id": {"type": "integer"},
                "quantity": {"type": "integer", "description": "For add (default 1) and set_quantity (0 removes)."},
            },
            "required": ["action"],
        },
    },
    {
        "name": "get_order_status",
        "description": (
            "Look up an existing order in Shopify. Requires the order number AND either the email or the phone "
            "number used on the order; the order is only revealed if that contact matches. Ask the customer for "
            "both before calling. Returns payment, fulfilment and tracking information."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "order_number": {"type": "string", "description": "e.g. '1001' or '#1001'"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
            },
            "required": ["order_number"],
        },
    },
    {
        "name": "handoff_to_owner",
        "description": (
            "Pass the conversation to the business owner. Use for refund decisions, complaints, discount "
            "requests, custom orders, or anything you cannot answer from tool results. Needs the customer's "
            "email or phone (ask for it first). After it succeeds, tell the customer a person will follow up; "
            "never promise any outcome."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "enum": HANDOFF_CATEGORIES},
                "reason": {"type": "string", "description": "One or two factual sentences for the owner."},
                "customer_name": {"type": "string"},
                "customer_email": {"type": "string"},
                "customer_phone": {"type": "string"},
            },
            "required": ["category", "reason"],
        },
    },
]


@dataclass
class ToolContext:
    db: AsyncSession
    store: Store
    conversation: Conversation
    # Test seams (default to real network):
    shopify_transport: httpx.AsyncBaseTransport | None = None
    webhook_transport: httpx.AsyncBaseTransport | None = None
    handoff_ids: list[int] = field(default_factory=list)
    cart_changed: bool = False


# ─── executors ────────────────────────────────────────────────

async def _search_products(ctx: ToolContext, args: dict) -> dict:
    matches = await search_products(
        ctx.db,
        ctx.store.id,
        query=str(args.get("query") or ""),
        category=str(args.get("category") or ""),
        attributes=args.get("attributes") if isinstance(args.get("attributes"), dict) else None,
        in_stock_only=bool(args.get("in_stock_only")),
        limit=int(args.get("limit") or 5),
    )
    out: dict[str, Any] = {"count": len(matches), "products": [product_to_dict(m) for m in matches]}
    cur = get_settings().STORE_CURRENCY
    if cur:
        out["currency"] = cur
    if not matches:
        out["note"] = "No matching products in the catalog. Do not suggest products that were not returned."
    return out


async def _get_product(ctx: ToolContext, args: dict) -> dict:
    m = await get_product(ctx.db, ctx.store.id, int(args["product_id"]))
    if not m:
        return {"error": "product not found in this store"}
    out = product_to_dict(m)
    cur = get_settings().STORE_CURRENCY
    if cur:
        out["currency"] = cur
    return out


async def _update_cart(ctx: ToolContext, args: dict) -> dict:
    try:
        snap = await cart_service.update_cart(
            ctx.db,
            ctx.store.id,
            ctx.conversation.id,
            action=str(args.get("action") or ""),
            variant_id=int(args["variant_id"]) if args.get("variant_id") is not None else None,
            quantity=int(args["quantity"]) if args.get("quantity") is not None else None,
        )
    except cart_service.CartError as e:
        return {"error": str(e)}
    if (snap.get("change") or {}).get("action") != "viewed":
        ctx.cart_changed = True
    cur = get_settings().STORE_CURRENCY
    if cur:
        snap["currency"] = cur
    return snap


async def _get_order_status(ctx: ToolContext, args: dict) -> dict:
    conv_id = ctx.conversation.id
    if _failed_verifications[conv_id] >= MAX_FAILED_VERIFICATIONS:
        return {"error": "too many failed verification attempts in this conversation; hand off to the owner"}

    order_number = str(args.get("order_number") or "")
    email = str(args.get("email") or "")
    phone = str(args.get("phone") or "")
    if not (email.strip() or phone.strip()):
        return {"error": "email or phone used on the order is required; ask the customer for it"}

    store = ctx.store
    domain = shop_domain_for(store) if store.platform == "shopify" else None
    if not domain or not store.access_token:
        return {"error": "order lookup is not available for this store (Shopify not connected)"}

    token = TokenManager().decrypt(store.access_token)
    client = ShopifyAdminClient(domain, token, transport=ctx.shopify_transport)
    try:
        order = await client.find_order(order_number)
    except ShopifyAdminError as e:
        logger.error("Shopify order lookup failed store=%s: %s", store.id, e)
        return {"error": "order lookup is temporarily unavailable; offer a handoff to the owner"}

    # Identical response for "no such order" and "wrong contact" so the tool can't be used to probe orders.
    if not order or not order_matches_contact(order, email=email, phone=phone):
        _failed_verifications[conv_id] += 1
        return {
            "verified": False,
            "message": "No order matched that order number together with that email/phone. "
                       "Do not say which part was wrong. Ask the customer to re-check both.",
        }
    _failed_verifications[conv_id] = 0
    return {"verified": True, "order": summarize_order(order)}


async def _handoff_to_owner(ctx: ToolContext, args: dict) -> dict:
    email = str(args.get("customer_email") or "").strip()
    phone = str(args.get("customer_phone") or "").strip()
    if not (email or phone):
        return {"error": "customer email or phone is required so the owner can follow up; ask the customer for it"}
    category = str(args.get("category") or "other")
    if category not in HANDOFF_CATEGORIES:
        category = "other"

    conv = ctx.conversation
    res = await ctx.db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.id.asc())
    )
    transcript = [{"role": m.role, "content": m.content} for m in res.scalars().all()]

    h = Handoff(
        store_id=ctx.store.id,
        conversation_id=conv.id,
        category=category,
        reason=str(args.get("reason") or "")[:2000],
        customer_name=str(args.get("customer_name") or "")[:255],
        customer_email=email[:255],
        customer_phone=phone[:50],
        transcript=json.dumps(transcript, ensure_ascii=False),
    )
    ctx.db.add(h)
    conv.status = "handoff"
    if email:
        conv.customer_email = email[:255]
    await ctx.db.flush()
    ctx.db.add(HandoffLog(conversation_id=conv.id, reason=f"[{category}] {h.reason}", assigned_to="owner"))
    await ctx.db.flush()

    ok, err = await notify_owner(
        {
            "id": h.id, "category": category, "reason": h.reason, "customer_name": h.customer_name,
            "customer_email": h.customer_email, "customer_phone": h.customer_phone,
            "conversation_id": conv.id, "transcript": transcript,
        },
        webhook_transport=ctx.webhook_transport,
    )
    if ok:
        h.notified_at = datetime.now(timezone.utc)
    h.notify_error = err
    await ctx.db.flush()
    ctx.handoff_ids.append(h.id)
    # The customer-facing outcome is the same whether or not the notification channel worked:
    # the handoff is saved and visible to the owner.
    return {"saved": True, "handoff_id": h.id, "owner_notified": ok}


_EXECUTORS = {
    "search_products": _search_products,
    "get_product": _get_product,
    "update_cart": _update_cart,
    "get_order_status": _get_order_status,
    "handoff_to_owner": _handoff_to_owner,
}


async def execute_tool(ctx: ToolContext, name: str, args: dict) -> dict:
    """Run one tool call; always returns a dict, never raises."""
    started = time.perf_counter()
    fn = _EXECUTORS.get(name)
    if fn is None:
        logger.error("tool=%s unknown conv=%s", name, ctx.conversation.id)
        return {"error": f"unknown tool '{name}'"}
    try:
        result = await fn(ctx, args or {})
    except (KeyError, ValueError, TypeError) as e:
        logger.error("tool=%s bad_input conv=%s args=%s err=%s", name, ctx.conversation.id, _scrub(args), e)
        return {"error": f"invalid input: {e}"}
    except Exception as e:  # noqa: BLE001
        logger.exception("tool=%s failed conv=%s", name, ctx.conversation.id)
        return {"error": f"tool failed: {type(e).__name__}"}
    ms = (time.perf_counter() - started) * 1000
    level = logging.WARNING if "error" in result else logging.INFO
    logger.log(level, "tool=%s conv=%s store=%s ms=%.0f args=%s ok=%s",
               name, ctx.conversation.id, ctx.store.id, ms, _scrub(args), "error" not in result)
    return result


def _scrub(args: dict | None) -> str:
    """Log tool args without leaking contact details."""
    safe = {k: ("<redacted>" if k in ("email", "phone", "customer_email", "customer_phone", "customer_name") else v)
            for k, v in (args or {}).items()}
    return json.dumps(safe, ensure_ascii=False)[:300]
