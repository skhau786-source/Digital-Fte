"""Steps 45-50 end to end through POST /api/v1/storefront/chat.

The Anthropic client is scripted (no network); everything else — endpoint,
rate limiting, agent loop, tools, DB, cart, verification, handoff — is real.
The scripted "model" reads tool results from the request, so its replies
are built only from what the tools returned (like a grounded model must).
These tests prove the plumbing and guardrails; model judgment is covered
by test_live_claude.py when an API key is configured.
"""

import json

import httpx
import pytest
from sqlalchemy import select

import src.domains.agents.customer_support.storefront_api as storefront_api
from src.domains.agents.customer_support.agent.claude_agent import FALLBACK_REPLIES, SupportAgent
from src.domains.agents.customer_support.rules import detect_language
from src.sdk.config import get_settings
from src.sdk.database import AsyncSessionLocal
from src.sdk.models.support import Conversation, Handoff, Message

from .helpers import (
    FakeAnthropic, api_error, last_tool_result, shopify_order_node, shopify_transport, text_msg, tool_msg,
)


@pytest.fixture
def chat(client, fabric, monkeypatch):
    """Returns post(message, session_id=None, script=...) wired to a FakeAnthropic."""
    state = {"fake": None, "seams": {}}

    def factory(db):
        return SupportAgent(db, client=state["fake"], **state["seams"])

    monkeypatch.setattr(storefront_api, "SupportAgent", factory)

    def post(message, session_id=None, script=None, store_id=None, **seams):
        state["fake"] = FakeAnthropic(script or (lambda req, n: text_msg("ok")))
        state["seams"] = seams
        body = {"store_id": store_id or fabric["store_id"], "message": message}
        if session_id:
            body["session_id"] = session_id
        r = client.post("/api/v1/storefront/chat", json=body)
        return r, state["fake"]

    return post


# ─── 45. chat widget backend: sessions, history, limits ───────

def test_session_keeps_conversation_across_messages(chat, client, fabric):
    r1, fake1 = chat("hello", script=lambda req, n: text_msg("Hi! How can I help?"))
    assert r1.status_code == 200
    sid = r1.json()["session_id"]
    assert len(sid) == 32

    r2, fake2 = chat("do you have wool shawls?", session_id=sid, script=lambda req, n: text_msg("Let me check."))
    assert r2.json()["session_id"] == sid and r2.json()["conversation_id"] == r1.json()["conversation_id"]
    # second request carried the first exchange as history
    msgs = fake2.calls[0]["messages"]
    assert msgs[0] == {"role": "user", "content": "hello"}
    assert msgs[1] == {"role": "assistant", "content": "Hi! How can I help?"}

    hist = client.get(f"/api/v1/storefront/chat/{sid}", params={"store_id": fabric["store_id"]}).json()
    assert [m["role"] for m in hist["messages"]] == ["user", "assistant", "user", "assistant"]
    assert hist["messages"][2]["content"] == "do you have wool shawls?"


def test_session_belongs_to_one_store_and_unknown_session_is_empty(client, fabric):
    r = client.get("/api/v1/storefront/chat/" + "a" * 32, params={"store_id": fabric["store_id"]})
    assert r.status_code == 200 and r.json()["messages"] == []
    assert client.get("/api/v1/storefront/chat/not-a-session", params={"store_id": fabric["store_id"]}).status_code == 422


def test_input_validation_and_unknown_store(chat):
    assert chat("   ")[0].status_code == 422
    assert chat("x" * (get_settings().CHAT_MAX_MESSAGE_CHARS + 1))[0].status_code == 422
    assert chat("hi", session_id="../../etc/passwd")[0].status_code == 422
    assert chat("hi", store_id=987654)[0].status_code == 404


def test_chat_endpoint_is_rate_limited(chat, monkeypatch):
    monkeypatch.setattr(get_settings(), "CHAT_RATE_LIMIT_MAX", 3)
    codes = [chat("hi")[0].status_code for _ in range(5)]
    assert codes[:3] == [200, 200, 200] and codes[3:] == [429, 429]
    r, _ = chat("hi")
    assert r.status_code == 429 and "Retry-After" in r.headers


def test_chat_unavailable_without_api_key_is_503_not_a_fake_answer(client, fabric, monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "ANTHROPIC_API_KEY", "")
    r = client.post("/api/v1/storefront/chat", json={"store_id": fabric["store_id"], "message": "hi"})
    assert r.status_code == 503


# ─── 46. language ─────────────────────────────────────────────

@pytest.mark.parametrize("text,lang", [
    ("Do you have red cotton shirts in stock?", "en"),
    ("Can I track my order please", "en"),
    ("mujhe laal kapra chahiye, kitne ka hai?", "roman_urdu"),
    ("yeh available hai kya", "roman_urdu"),
    ("سرخ کپڑا چاہیے", "urdu"),
])
def test_language_detection(text, lang):
    assert detect_language(text) == lang


def test_language_hint_and_system_rule_reach_the_model(chat):
    r, fake = chat("mujhe laal kapra chahiye", script=lambda req, n: text_msg("Zaroor, main dekhta hoon."))
    assert r.json()["language"] == "roman_urdu"
    last_user = fake.calls[0]["messages"][-1]
    assert last_user["content"][0]["text"] == "mujhe laal kapra chahiye"
    assert last_user["content"][1]["text"] == "[language-detector: roman_urdu]"
    system = fake.calls[0]["system"][0]["text"]
    assert "Roman Urdu" in system and "Never use Urdu/Arabic script" in system
    assert "only state" in system.lower() or "Only state" in system


def test_urdu_script_reply_is_rewritten_to_latin(chat):
    def script(req, n):
        if n == 0:
            return text_msg("جی ہاں، دستیاب ہے")          # model slips into Urdu script
        assert "Latin letters" in req["system"]            # rewrite guard call
        return text_msg("Ji haan, dastyab hai")

    r, fake = chat("yeh available hai kya", script=script)
    assert r.json()["reply"] == "Ji haan, dastyab hai" and len(fake.calls) == 2


def test_urdu_script_reply_falls_back_to_latin_if_rewrite_fails(chat):
    def script(req, n):
        return text_msg("جی ہاں") if n == 0 else text_msg("پھر بھی اردو")

    r, _ = chat("yeh available hai kya", script=script)
    assert r.json()["reply"] == FALLBACK_REPLIES["roman_urdu"]
    assert not any("؀" <= c <= "ۿ" for c in r.json()["reply"])


# ─── 47. product lookup (Roman Urdu) ──────────────────────────

def test_roman_urdu_product_question_uses_tool_and_db_price(chat, fabric):
    def script(req, n):
        if n == 0:
            return tool_msg("search_products", {"query": "laal sooti kapra"})
        res = last_tool_result(req["messages"])
        p = res["products"][0]
        red = next(v for v in p["variants"] if v["option"] == "Red")
        return text_msg(f"Ji haan, {p['title']} ({red['option']}) {red['price']} mein hai, {red['stock']} piece available hain.")

    r, fake = chat("mujhe laal sooti kapra chahiye, kitne ka hai?", script=script)
    reply = r.json()["reply"]
    assert r.json()["language"] == "roman_urdu"
    assert "Premium Cotton Lawn Suit" in reply and "6500.00" in reply and "12 piece" in reply
    # the tool really ran against the DB and its result went back to the model
    assert len(fake.calls) == 2
    assert fake.calls[0]["tools"] and {t["name"] for t in fake.calls[0]["tools"]} == {
        "search_products", "get_product", "update_cart", "get_order_status", "handoff_to_owner"}


# ─── 48. price / stock / cart ─────────────────────────────────

def test_out_of_stock_item_is_reported_and_cannot_be_added(chat, fabric):
    sold_out = fabric["ids"]["Pure Silk Dupatta"]["variants"]["Maroon"]

    def script(req, n):
        if n == 0:
            return tool_msg("search_products", {"query": "silk dupatta"})
        if n == 1:
            res = last_tool_result(req["messages"])
            assert res["products"][0]["variants"][0]["stock"] == 0
            return tool_msg("update_cart", {"action": "add", "variant_id": sold_out}, "toolu_2")
        res = last_tool_result(req["messages"])
        assert "out of stock" in res["error"]
        return text_msg("Sorry, the Pure Silk Dupatta is out of stock right now (0 available), so I could not add it to your cart.")

    r, _ = chat("add the silk dupatta to my cart", script=script)
    body = r.json()
    assert "out of stock" in body["reply"] and "0 available" in body["reply"]
    assert body["cart"]["items"] == [] and body["cart"]["item_count"] == 0


def test_cart_update_is_persisted_per_session_and_confirmed(chat, client, fabric):
    red = fabric["ids"]["Premium Cotton Lawn Suit"]["variants"]["Red"]
    shawl = fabric["ids"]["Merino Wool Shawl"]["variants"]["Grey"]

    def adder(variant, qty):
        def script(req, n):
            if n == 0:
                return tool_msg("update_cart", {"action": "add", "variant_id": variant, "quantity": qty})
            cart = last_tool_result(req["messages"])
            return text_msg(f"Done. Your cart now has {cart['item_count']} item(s), total {cart['total']}.")
        return script

    r1, _ = chat("add 2 red lawn suits", script=adder(red, 2))
    sid = r1.json()["session_id"]
    assert r1.json()["cart"]["total"] == "13000.00" and "total 13000.00" in r1.json()["reply"]

    r2, fake = chat("also a wool shawl", session_id=sid, script=adder(shawl, 1))
    assert r2.json()["cart"]["item_count"] == 3 and r2.json()["cart"]["total"] == "21900.50"
    # the earlier turn's tool results (variant ids) are replayed to the model on later turns
    replay = json.dumps(fake.calls[0]["messages"])
    assert "tool_use" in replay and str(red) in replay

    def remover(req, n):
        if n == 0:
            return tool_msg("update_cart", {"action": "remove", "variant_id": red})
        return text_msg("Removed the lawn suits.")

    r3, _ = chat("remove the red suits", session_id=sid, script=remover)
    assert [i["variant_id"] for i in r3.json()["cart"]["items"]] == [shawl]
    # a different session has its own, empty cart
    r4, _ = chat("what is in my cart", script=lambda req, n: text_msg("Your cart is empty."))
    assert r4.json()["cart"]["items"] == []
    # and the cart survives a page reload via the history endpoint
    hist = client.get(f"/api/v1/storefront/chat/{sid}", params={"store_id": fabric["store_id"]}).json()
    assert hist["cart"]["total"] == "8900.50"


# ─── 49. order status ─────────────────────────────────────────

def test_order_lookup_with_mismatched_email_is_refused_and_leaks_nothing(chat):
    transport = shopify_transport([shopify_order_node()])

    def script(req, n):
        if n == 0:
            return tool_msg("get_order_status", {"order_number": "#1001", "email": "stranger@example.com"})
        res = last_tool_result(req["messages"])
        assert res["verified"] is False and "order" not in res
        return text_msg("I couldn't find an order matching those details. Please re-check the order number and email.")

    r, fake = chat("where is my order 1001? my email is stranger@example.com", script=script, shopify_transport=transport)
    reply = r.json()["reply"]
    assert "couldn't find" in reply
    for secret in ("PAID", "FULFILLED", "TRK123", "buyer@example.com", "4500", "Lawn"):
        assert secret not in json.dumps(fake.calls[-1]["messages"][-1]) and secret not in reply


def test_order_lookup_with_matching_phone_explains_status(chat):
    transport = shopify_transport([shopify_order_node(fulfillment="UNFULFILLED", tracking=False)])

    def script(req, n):
        if n == 0:
            return tool_msg("get_order_status", {"order_number": "1001", "phone": "0300 1234567"})
        o = last_tool_result(req["messages"])["order"]
        return text_msg(f"Order {o['order_number']} is {o['payment_status'].lower()} and {o['fulfillment_status'].lower()}.")

    r, _ = chat("order 1001 ka status? phone 0300 1234567", script=script, shopify_transport=transport)
    assert r.json()["reply"] == "Order #1001 is paid and unfulfilled."


# ─── 50. handoff ──────────────────────────────────────────────

def test_refund_request_is_handed_off_saved_and_owner_notified(chat, fabric, monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "OWNER_WEBHOOK_URL", "https://hooks.example.test/owner")
    monkeypatch.setattr(s, "OWNER_NOTIFY_EMAIL", "")
    posted = []
    hook = httpx.MockTransport(lambda req: (posted.append(json.loads(req.content)), httpx.Response(200))[1])

    # Turn 1: the customer asks for a refund; the model asks for contact details (no tool yet).
    r1, _ = chat("I want a refund for order 1001, the fabric was damaged",
                 script=lambda req, n: text_msg("I'm sorry to hear that. I'll pass this to the store owner. What email or phone can they reach you on?"))
    sid = r1.json()["session_id"]
    assert r1.json()["handoff"] is False

    # Turn 2: contact given -> handoff tool
    def script(req, n):
        if n == 0:
            return tool_msg("handoff_to_owner", {
                "category": "refund", "reason": "Customer requests a refund for order #1001 (damaged fabric).",
                "customer_name": "Sana", "customer_email": "sana@example.com"})
        res = last_tool_result(req["messages"])
        assert res["saved"] is True
        return text_msg("Thank you, Sana. I've passed this to the store owner and a person will follow up with you at sana@example.com.")

    r2, _ = chat("sana@example.com", session_id=sid, script=script, webhook_transport=hook)
    body = r2.json()
    assert body["handoff"] is True
    low = body["reply"].lower()
    assert "follow up" in low
    for promise in ("will be refunded", "full refund", "discount", "guarantee", "within 24"):
        assert promise not in low

    import asyncio

    async def check():
        async with AsyncSessionLocal() as db:
            h = (await db.execute(select(Handoff).where(Handoff.conversation_id == body["conversation_id"]))).scalar_one()
            conv = (await db.execute(select(Conversation).where(Conversation.id == body["conversation_id"]))).scalar_one()
            return h, conv.status, json.loads(h.transcript)

    h, status, transcript = asyncio.run(check())
    assert (h.category, h.customer_email, h.customer_name) == ("refund", "sana@example.com", "Sana")
    assert h.notified_at is not None and status == "handoff"
    assert any("refund for order 1001" in m["content"] for m in transcript)
    assert posted and posted[0]["handoff"]["category"] == "refund"


def test_system_prompt_forbids_promises_and_requires_handoff_categories(chat):
    _, fake = chat("hi")
    system = fake.calls[0]["system"][0]["text"]
    for needle in ("refund", "complaints", "discount", "custom", "Do NOT promise", "follow up"):
        assert needle in system
    handoff_tool = next(t for t in fake.calls[0]["tools"] if t["name"] == "handoff_to_owner")
    assert set(handoff_tool["input_schema"]["properties"]["category"]["enum"]) >= {
        "refund", "complaint", "discount", "custom_order"}


# ─── robustness ───────────────────────────────────────────────

def test_anthropic_outage_returns_safe_fallback_in_customer_language(chat):
    r, _ = chat("kya yeh available hai", script=lambda req, n: api_error())
    assert r.status_code == 200 and r.json()["reply"] == FALLBACK_REPLIES["roman_urdu"]
    r, _ = chat("is this available", script=lambda req, n: api_error())
    assert r.json()["reply"] == FALLBACK_REPLIES["en"]


def test_runaway_tool_loop_is_capped(chat):
    r, fake = chat("loop", script=lambda req, n: tool_msg("search_products", {"query": "x"}, f"toolu_{n}"))
    assert r.status_code == 200 and r.json()["reply"] == FALLBACK_REPLIES["en"]
    assert len(fake.calls) == get_settings().CHAT_MAX_TOOL_ROUNDS + 1


def test_public_catalog_endpoint_reads_live_db_rows(client, fabric):
    r = client.get(f"/api/v1/storefront/{fabric['store_id']}/products")
    assert r.status_code == 200
    titles = {p["title"] for p in r.json()["products"]}
    assert titles == {"Premium Cotton Lawn Suit", "Pure Silk Dupatta", "Merino Wool Shawl", "Leather Sandals"}
    assert client.get("/api/v1/storefront/987654/products").status_code == 404
