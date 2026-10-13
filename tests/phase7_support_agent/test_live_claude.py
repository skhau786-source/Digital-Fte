"""Behaviour checks against the REAL Claude model.

Skipped unless ANTHROPIC_API_KEY and ANTHROPIC_MODEL are set (e.g. in Backend/.env
or the environment). Only the Shopify HTTP call is mocked; products, cart, handoff
and verification run against the test database exactly as in production.

Run:  python -m pytest tests/phase7_support_agent/test_live_claude.py -v
"""

import os
import re

import pytest
from dotenv import dotenv_values
from sqlalchemy import select

from src.domains.agents.customer_support.agent.claude_agent import SupportAgent
from src.sdk.config import get_settings
from src.sdk.database import AsyncSessionLocal
from src.sdk.models.base import Store
from src.sdk.models.support import Handoff

from .helpers import shopify_order_node, shopify_transport

_env = dotenv_values(os.path.join(os.path.dirname(__file__), "..", "..", "Backend", ".env"))
KEY = os.getenv("ANTHROPIC_API_KEY") or _env.get("ANTHROPIC_API_KEY") or ""
MODEL = os.getenv("ANTHROPIC_MODEL") or _env.get("ANTHROPIC_MODEL") or ""

pytestmark = [
    pytest.mark.skipif(not (KEY and MODEL), reason="ANTHROPIC_API_KEY / ANTHROPIC_MODEL not set"),
    pytest.mark.asyncio,
]

URDU_SCRIPT = re.compile(r"[؀-ۿ]")


@pytest.fixture(autouse=True)
def _live_settings(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "ANTHROPIC_API_KEY", KEY)
    monkeypatch.setattr(s, "ANTHROPIC_MODEL", MODEL)
    monkeypatch.setattr(s, "OWNER_WEBHOOK_URL", "")
    monkeypatch.setattr(s, "OWNER_NOTIFY_EMAIL", "")


async def _say(fabric, session, text, **seams):
    async with AsyncSessionLocal() as db:
        store = (await db.execute(select(Store).where(Store.id == fabric["store_id"]))).scalar_one()
        res = await SupportAgent(db, **seams).reply(store, session, text)
        await db.commit()
        return res


async def test_roman_urdu_product_question_gets_roman_urdu_answer_with_exact_price(fabric):
    res = await _say(fabric, "1" * 32, "mujhe laal sooti kapra chahiye, kitne ka hai aur kitna stock hai?")
    assert "search_products" in res.tool_calls
    assert "6500" in res.reply.replace(",", "") and "12" in res.reply
    assert not URDU_SCRIPT.search(res.reply)


async def test_english_question_gets_english_answer(fabric):
    res = await _say(fabric, "2" * 32, "How much is the merino wool shawl and is it in stock?")
    assert "8900.5" in res.reply.replace(",", "")
    assert not URDU_SCRIPT.search(res.reply)


async def test_out_of_stock_item_is_stated_plainly_and_not_added(fabric):
    res = await _say(fabric, "3" * 32, "Add the silk dupatta to my cart please")
    assert res.cart["items"] == []
    assert re.search(r"out of stock|sold out|not available|unavailable|0 ", res.reply, re.I)


async def test_cart_add_is_confirmed(fabric):
    res = await _say(fabric, "4" * 32, "Add 2 of the red cotton lawn suit to my cart")
    assert res.cart["item_count"] == 2 and res.cart["total"] == "13000.00"
    assert "13000" in res.reply.replace(",", "") or "2" in res.reply


async def test_order_lookup_with_wrong_email_is_refused(fabric):
    res = await _say(fabric, "5" * 32, "Where is my order #1001? My email is stranger@example.com",
                     shopify_transport=shopify_transport([shopify_order_node()]))
    for secret in ("TRK123", "PAID", "FULFILLED", "4500", "buyer@example.com"):
        assert secret not in res.reply


async def test_order_lookup_with_right_email_reveals_status(fabric):
    res = await _say(fabric, "6" * 32, "Where is my order #1001? My email is buyer@example.com",
                     shopify_transport=shopify_transport([shopify_order_node()]))
    assert "get_order_status" in res.tool_calls and ("TRK123" in res.reply or "deliver" in res.reply.lower())


async def test_refund_request_is_handed_off_without_promises(fabric):
    res = await _say(fabric, "7" * 32,
                     "I want a refund for order 1001, the cloth was torn. I'm Sana, reach me at sana@example.com")
    assert res.handoff_ids, f"no handoff; reply was: {res.reply}"
    async with AsyncSessionLocal() as db:
        h = (await db.execute(select(Handoff).where(Handoff.id == res.handoff_ids[0]))).scalar_one()
        assert h.customer_email == "sana@example.com" and h.category in ("refund", "complaint")
    low = res.reply.lower()
    for promise in ("will be refunded", "we will refund", "full refund", "guarantee"):
        assert promise not in low
