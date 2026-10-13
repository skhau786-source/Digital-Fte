"""Each Claude tool, exercised against real tables (test DB) and a mocked Shopify transport."""

import json

import httpx
import pytest
from sqlalchemy import select

from src.domains.agents.customer_support.agent.tools import (
    MAX_FAILED_VERIFICATIONS, ToolContext, execute_tool,
)
from src.sdk.config import get_settings
from src.sdk.database import AsyncSessionLocal
from src.sdk.models.base import Store, Variant
from src.sdk.models.support import Conversation, Handoff, Message

from .helpers import shopify_order_node, shopify_transport


async def _ctx(db, fabric, conv_id, **seams) -> ToolContext:
    store = (await db.execute(select(Store).where(Store.id == fabric["store_id"]))).scalar_one()
    conv = (await db.execute(select(Conversation).where(Conversation.id == conv_id))).scalar_one()
    return ToolContext(db=db, store=store, conversation=conv, **seams)


# ─── search_products ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_partial_and_misspelled_name(fabric, new_conversation):
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        for q in ("cotton lawn", "cotn lawn suit", "premium", "LAWN"):
            out = await execute_tool(ctx, "search_products", {"query": q})
            assert out["count"] >= 1, q
            assert out["products"][0]["title"] == "Premium Cotton Lawn Suit", q


@pytest.mark.asyncio
async def test_search_category_and_attributes(fabric, new_conversation):
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "search_products", {"category": "Footwear"})
        assert [p["title"] for p in out["products"]] == ["Leather Sandals"]
        out = await execute_tool(ctx, "search_products", {"query": "suit", "attributes": {"color": "red"}})
        assert [p["title"] for p in out["products"]] == ["Premium Cotton Lawn Suit"]
        out = await execute_tool(ctx, "search_products", {"attributes": {"fabric": "wool"}})
        assert [p["title"] for p in out["products"]] == ["Merino Wool Shawl"]
        out = await execute_tool(ctx, "search_products", {"attributes": {"fabric": "silk", "color": "blue"}})
        assert out["count"] == 0
        out = await execute_tool(ctx, "search_products", {"query": "sandals", "in_stock_only": True})
        assert out["count"] == 1  # one size is still in stock


@pytest.mark.asyncio
@pytest.mark.parametrize("args,expected", [
    ({"query": "mujhe laal sooti kapra chahiye"}, "Premium Cotton Lawn Suit"),   # red cotton fabric
    ({"query": "reshmi dupatta hai kya?"}, "Pure Silk Dupatta"),                   # silk
    ({"query": "oon ki chadar kitne ki hai"}, "Merino Wool Shawl"),                # wool shawl
    ({"query": "jutti", "category": "footwear"}, "Leather Sandals"),               # shoes + category
])
async def test_search_roman_urdu_terms(fabric, new_conversation, args, expected):
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "search_products", args)
        assert out["count"] >= 1, args
        assert out["products"][0]["title"] == expected


@pytest.mark.asyncio
async def test_search_no_match_returns_nothing_not_a_guess(fabric, new_conversation):
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "search_products", {"query": "velvet hiking boots"})
        assert out["count"] == 0 and out["products"] == []
        assert "note" in out


# ─── get_product ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_product_returns_exact_db_price_and_stock(fabric, new_conversation):
    pid = fabric["ids"]["Merino Wool Shawl"]["product"]
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "get_product", {"product_id": pid})
        v = out["variants"][0]
        row = (await db.execute(select(Variant).where(Variant.id == v["variant_id"]))).scalar_one()
        assert v["price"] == f"{float(row.price):.2f}" == "8900.50"
        assert v["stock"] == row.inventory_quantity == 7 and v["in_stock"] is True


@pytest.mark.asyncio
async def test_out_of_stock_is_reported_as_zero(fabric, new_conversation):
    pid = fabric["ids"]["Pure Silk Dupatta"]["product"]
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "get_product", {"product_id": pid})
        assert out["variants"][0]["stock"] == 0 and out["variants"][0]["in_stock"] is False


@pytest.mark.asyncio
async def test_get_product_unknown_and_bad_input(fabric, new_conversation):
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        assert "error" in await execute_tool(ctx, "get_product", {"product_id": 99999999})
        assert "error" in await execute_tool(ctx, "get_product", {})
        assert "error" in await execute_tool(ctx, "no_such_tool", {})


# ─── update_cart ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cart_add_update_remove_with_live_totals(fabric, new_conversation):
    red = fabric["ids"]["Premium Cotton Lawn Suit"]["variants"]["Red"]
    shawl = fabric["ids"]["Merino Wool Shawl"]["variants"]["Grey"]
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "update_cart", {"action": "add", "variant_id": red, "quantity": 2})
        assert out["change"]["action"] == "added" and out["item_count"] == 2 and out["total"] == "13000.00"
        out = await execute_tool(ctx, "update_cart", {"action": "add", "variant_id": shawl})
        assert out["item_count"] == 3 and out["total"] == "21900.50"
        out = await execute_tool(ctx, "update_cart", {"action": "set_quantity", "variant_id": red, "quantity": 1})
        assert out["change"]["action"] == "quantity_set" and out["total"] == "15400.50"
        out = await execute_tool(ctx, "update_cart", {"action": "remove", "variant_id": shawl})
        assert out["change"]["action"] == "removed" and [i["variant_id"] for i in out["items"]] == [red]
        out = await execute_tool(ctx, "update_cart", {"action": "view"})
        assert out["total"] == "6500.00"
        # Shopify cart permalink uses the real platform variant id
        assert out["checkout_url"].startswith("https://fabric-test.myshopify.com/cart/")
        assert out["checkout_url"].endswith(":1")
        out = await execute_tool(ctx, "update_cart", {"action": "clear"})
        assert out["items"] == [] and out["checkout_url"] is None
        await db.rollback()


@pytest.mark.asyncio
async def test_cart_refuses_out_of_stock_and_over_stock(fabric, new_conversation):
    sold_out = fabric["ids"]["Pure Silk Dupatta"]["variants"]["Maroon"]
    blue = fabric["ids"]["Premium Cotton Lawn Suit"]["variants"]["Blue"]  # stock 4
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "update_cart", {"action": "add", "variant_id": sold_out})
        assert "out of stock" in out["error"] and "stock: 0" in out["error"]
        out = await execute_tool(ctx, "update_cart", {"action": "add", "variant_id": blue, "quantity": 5})
        assert "only 4" in out["error"]
        out = await execute_tool(ctx, "update_cart", {"action": "view"})
        assert out["items"] == []  # nothing was added by the failed calls
        out = await execute_tool(ctx, "update_cart", {"action": "remove", "variant_id": blue})
        assert "not in the cart" in out["error"]
        out = await execute_tool(ctx, "update_cart", {"action": "add", "variant_id": 987654})
        assert "does not exist" in out["error"]
        out = await execute_tool(ctx, "update_cart", {"action": "add"})
        assert "variant_id is required" in out["error"]
        await db.rollback()


@pytest.mark.asyncio
async def test_cart_prices_are_reread_from_db_not_cached(fabric, new_conversation):
    shawl = fabric["ids"]["Merino Wool Shawl"]["variants"]["Grey"]
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        await execute_tool(ctx, "update_cart", {"action": "add", "variant_id": shawl})
        v = (await db.execute(select(Variant).where(Variant.id == shawl))).scalar_one()
        v.price = "9000.00"          # the Inventory Sync Agent updates the price
        await db.flush()
        out = await execute_tool(ctx, "update_cart", {"action": "view"})
        assert out["total"] == "9000.00"
        await db.rollback()


# ─── get_order_status ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_order_lookup_verified_by_email_uses_graphql_and_configured_version(fabric, new_conversation):
    seen: list = []
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation(), shopify_transport=shopify_transport([shopify_order_node()], seen))
        out = await execute_tool(ctx, "get_order_status",
                                 {"order_number": "#1001", "email": "BUYER@example.com"})
        assert out["verified"] is True
        o = out["order"]
        assert o["payment_status"] == "PAID" and o["fulfillment_status"] == "FULFILLED"
        assert o["shipments"][0]["tracking"][0]["number"] == "TRK123"
        assert "buyer@example.com" not in json.dumps(out).lower()   # contact details not echoed back
    req = seen[0]
    assert req["url"] == f"https://fabric-test.myshopify.com/admin/api/{get_settings().SHOPIFY_API_VERSION}/graphql.json"
    assert req["headers"]["x-shopify-access-token"] == "shpat_unit_test_token"   # decrypted store token
    assert "orders(first" in req["body"]["query"] and req["body"]["variables"]["q"] == "name:#1001"


@pytest.mark.asyncio
@pytest.mark.parametrize("phone", ["+92 300 1234567", "0300-1234567", "03001234567", "923001234567"])
async def test_order_lookup_verified_by_phone_formats(fabric, new_conversation, phone):
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation(), shopify_transport=shopify_transport([shopify_order_node()]))
        out = await execute_tool(ctx, "get_order_status", {"order_number": "1001", "phone": phone})
        assert out["verified"] is True


@pytest.mark.asyncio
async def test_order_lookup_refuses_mismatched_email_or_phone(fabric, new_conversation):
    transport = shopify_transport([shopify_order_node()])
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation(), shopify_transport=transport)
        wrong_email = await execute_tool(ctx, "get_order_status", {"order_number": "1001", "email": "someone@else.com"})
        wrong_phone = await execute_tool(ctx, "get_order_status", {"order_number": "1001", "phone": "0311 7654321"})
        no_order = await execute_tool(ctx, "get_order_status", {"order_number": "9999", "email": "buyer@example.com"})
        for out in (wrong_email, wrong_phone, no_order):
            assert out["verified"] is False and "order" not in out
            assert "PAID" not in json.dumps(out) and "TRK123" not in json.dumps(out)
        # Wrong contact and unknown order are indistinguishable (no probing of which orders exist)
        assert wrong_email == wrong_phone == no_order


@pytest.mark.asyncio
async def test_order_lookup_requires_contact_and_locks_out_after_repeated_failures(fabric, new_conversation):
    transport = shopify_transport([shopify_order_node()])
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation(), shopify_transport=transport)
        out = await execute_tool(ctx, "get_order_status", {"order_number": "1001"})
        assert "error" in out and "email or phone" in out["error"]
        for _ in range(MAX_FAILED_VERIFICATIONS):
            await execute_tool(ctx, "get_order_status", {"order_number": "1001", "email": "x@y.com"})
        out = await execute_tool(ctx, "get_order_status", {"order_number": "1001", "email": "buyer@example.com"})
        assert "error" in out and "too many" in out["error"]   # even the right email is refused now


@pytest.mark.asyncio
async def test_order_lookup_shopify_failure_is_an_error_not_a_guess(fabric, new_conversation):
    transport = httpx.MockTransport(lambda r: httpx.Response(401, json={"errors": "Invalid API key"}))
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation(), shopify_transport=transport)
        out = await execute_tool(ctx, "get_order_status", {"order_number": "1001", "email": "buyer@example.com"})
        assert "error" in out and "verified" not in out


# ─── handoff_to_owner ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_handoff_requires_contact(fabric, new_conversation):
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "handoff_to_owner", {"category": "refund", "reason": "wants refund"})
        assert "error" in out
        rows = (await db.execute(select(Handoff).where(Handoff.conversation_id == ctx.conversation.id))).scalars().all()
        assert rows == []


@pytest.mark.asyncio
async def test_handoff_saves_conversation_and_contact_and_notifies_webhook(fabric, new_conversation, monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "OWNER_WEBHOOK_URL", "https://hooks.example.test/owner")
    monkeypatch.setattr(s, "OWNER_NOTIFY_EMAIL", "")
    posted = []

    def hook(request: httpx.Request) -> httpx.Response:
        posted.append(json.loads(request.content))
        return httpx.Response(200)

    conv_id = await new_conversation()
    async with AsyncSessionLocal() as db:
        db.add(Message(conversation_id=conv_id, role="customer", content="I want a refund for my order"))
        await db.flush()
        ctx = await _ctx(db, fabric, conv_id, webhook_transport=httpx.MockTransport(hook))
        out = await execute_tool(ctx, "handoff_to_owner", {
            "category": "refund", "reason": "Customer asks for a refund on order #1001.",
            "customer_name": "Ayesha", "customer_email": "ayesha@example.com", "customer_phone": "0300 1234567"})
        assert out["saved"] is True and out["owner_notified"] is True
        await db.commit()

    async with AsyncSessionLocal() as db:
        h = (await db.execute(select(Handoff).where(Handoff.id == out["handoff_id"]))).scalar_one()
        assert (h.category, h.customer_name, h.customer_email, h.customer_phone) == \
               ("refund", "Ayesha", "ayesha@example.com", "0300 1234567")
        assert "I want a refund for my order" in json.loads(h.transcript)[0]["content"]
        assert h.notified_at is not None and h.notify_error == ""
        conv = (await db.execute(select(Conversation).where(Conversation.id == conv_id))).scalar_one()
        assert conv.status == "handoff"
    assert posted and posted[0]["handoff"]["customer_email"] == "ayesha@example.com"


@pytest.mark.asyncio
async def test_handoff_is_saved_even_when_no_notification_channel(fabric, new_conversation, monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "OWNER_WEBHOOK_URL", "")
    monkeypatch.setattr(s, "OWNER_NOTIFY_EMAIL", "")
    async with AsyncSessionLocal() as db:
        ctx = await _ctx(db, fabric, await new_conversation())
        out = await execute_tool(ctx, "handoff_to_owner", {
            "category": "complaint", "reason": "Damaged item", "customer_email": "a@b.com"})
        assert out["saved"] is True and out["owner_notified"] is False
        h = (await db.execute(select(Handoff).where(Handoff.id == out["handoff_id"]))).scalar_one()
        assert "no owner notification channel" in h.notify_error
        await db.rollback()
