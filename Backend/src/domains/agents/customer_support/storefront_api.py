# ═══════════════════════════════════════════════════════════════
# agents / customer_support / storefront_api.py
#
# PURPOSE: Public (customer-facing, no merchant JWT) endpoints used by
#          the storefront chat widget. The shopper is identified only by
#          an opaque session id; the store by its numeric id.
# ═══════════════════════════════════════════════════════════════

import logging
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domains.security.rate_limiter import chat_rate_limiter
from src.sdk.config import get_settings
from src.sdk.database import get_db
from src.sdk.models.base import Store
from src.sdk.models.support import Conversation, Message

from .agent.cart import cart_snapshot
from .agent.claude_agent import AgentUnavailable, SupportAgent
from .agent.product_search import load_store_products, product_to_dict, ProductMatch

logger = logging.getLogger("support_agent.api")
router = APIRouter(prefix="/api/v1/storefront", tags=["Storefront Chat"])

SESSION_RE = re.compile(r"^[a-f0-9]{32}$")


class StorefrontChatRequest(BaseModel):
    store_id: int
    message: str
    session_id: Optional[str] = None


async def _active_store(db: AsyncSession, store_id: int) -> Store:
    store = (await db.execute(select(Store).where(Store.id == store_id, Store.is_active.is_(True)))).scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.post("/chat", dependencies=[Depends(chat_rate_limiter)])
async def storefront_chat(body: StorefrontChatRequest, db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    text = (body.message or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="Message is empty")
    if len(text) > settings.CHAT_MAX_MESSAGE_CHARS:
        raise HTTPException(status_code=422, detail=f"Message is too long (max {settings.CHAT_MAX_MESSAGE_CHARS} characters)")
    if body.session_id is not None and not SESSION_RE.match(body.session_id):
        raise HTTPException(status_code=422, detail="Invalid session id")

    store = await _active_store(db, body.store_id)
    session_id = body.session_id or uuid.uuid4().hex
    try:
        agent = SupportAgent(db)
    except AgentUnavailable as e:
        logger.error("Support agent unavailable: %s", e)
        raise HTTPException(status_code=503, detail="Chat is temporarily unavailable")

    result = await agent.reply(store, session_id, text)
    await db.commit()
    return {
        "session_id": session_id,
        "conversation_id": result.conversation_id,
        "message_id": result.message_id,
        "reply": result.reply,
        "language": result.language,
        "cart": result.cart,
        "handoff": bool(result.handoff_ids),
    }


@router.get("/chat/{session_id}")
async def storefront_chat_history(
    session_id: str,
    store_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Customer-visible history + cart for a session (so a page reload keeps the conversation)."""
    if not SESSION_RE.match(session_id):
        raise HTTPException(status_code=422, detail="Invalid session id")
    conv = (await db.execute(
        select(Conversation).where(Conversation.session_id == session_id, Conversation.store_id == store_id)
    )).scalar_one_or_none()
    if not conv:
        return {"session_id": session_id, "messages": [], "cart": await cart_snapshot(db, store_id, -1)}
    rows = (await db.execute(
        select(Message).where(Message.conversation_id == conv.id, Message.role.in_(["customer", "agent_bot", "agent_human"]))
        .order_by(Message.id.asc())
    )).scalars().all()
    return {
        "session_id": session_id,
        "messages": [{"role": "user" if m.role == "customer" else "assistant", "content": m.content} for m in rows],
        "cart": await cart_snapshot(db, store_id, conv.id),
    }


@router.get("/{store_id}/products")
async def storefront_products(store_id: int, db: AsyncSession = Depends(get_db)):
    """Live catalog for the store page (straight from the synced products/variants tables)."""
    await _active_store(db, store_id)
    products = await load_store_products(db, store_id)
    cur = get_settings().STORE_CURRENCY
    return {
        "currency": cur or None,
        "products": [
            {**product_to_dict(ProductMatch(p, list(p.variants), 1.0)), "image_url": p.image_url or None}
            for p in products[:60]
        ],
    }
