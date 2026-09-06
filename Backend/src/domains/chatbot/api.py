# =============================================================
# domains / chatbot / api.py
#
# PURPOSE: Backend adapters for the two packaged chatbot widgets.
#          Both use the Customer Support Agent as their brain.
#
# FREE: read-only support conversations.
# PRO:  support + the action capabilities exposed by the support
#       handler (currently product/order/cart-add flows).
# =============================================================

import logging
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.sdk.database import get_db
from src.sdk.models.base import Store
from src.domains.auth.models import User
from src.domains.auth.service import get_current_user
from src.domains.agents.customer_support.handler import CustomerSupportHandler
from src.domains.agents.customer_support.rules import Intent, classify_intent
from src.domains.agents.customer_support.config import get_settings as get_support_settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chatbots"])


class ChatbotRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    preferred_language: Optional[str] = None
    store_id: Optional[int] = None
    conversation_id: Optional[int] = None
    customer_email: Optional[str] = None


class ChatbotResponse(BaseModel):
    answer: str
    message: str
    conversation_id: int
    message_id: int
    intent: str
    language: str
    plan: Literal["free", "pro"]
    mode: Literal["read_only", "agent"]


async def _resolve_store(
    body: ChatbotRequest,
    current_user: User,
    db: AsyncSession,
) -> Store:
    """Resolve only a store owned by the authenticated user."""
    query = select(Store).where(
        Store.user_id == current_user.id,
        Store.is_active.is_(True),
    )
    if body.store_id is not None:
        query = query.where(Store.id == body.store_id)
    else:
        query = query.order_by(Store.created_at.asc())

    result = await db.execute(query.limit(1))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active store is connected to this account. Connect a store first.",
        )
    return store


async def _chat(
    body: ChatbotRequest,
    plan: Literal["free", "pro"],
    db: AsyncSession,
    current_user: User,
) -> ChatbotResponse:
    store = await _resolve_store(body, current_user, db)
    support_settings = get_support_settings()

    # Free widget is deliberately read-only. Do not allow it to reach
    # action intents even if the client is modified in the browser.
    intent = classify_intent(
        body.query,
        handoff_keywords=support_settings.HANDOFF_KEYWORDS,
        out_of_scope_keywords=support_settings.OUT_OF_SCOPE_KEYWORDS,
    )
    if plan == "free" and intent in {
        Intent.CART_ADD,
        Intent.CART_REMOVE,
        Intent.CART_UPDATE,
    }:
        lang = body.preferred_language or "en"
        if lang == "urdu":
            message = "Free Plan read-only hai. Store actions ke liye Pro Agent use karein."
        elif lang == "roman_urdu":
            message = "Free Plan read-only hai. Store actions ke liye Pro Agent use karein."
        else:
            message = "The Free Plan chatbot is read-only. Use the Pro Agent for store actions."
        return ChatbotResponse(
            answer=message,
            message=message,
            conversation_id=body.conversation_id or 0,
            message_id=0,
            intent=intent.value,
            language=lang,
            plan="free",
            mode="read_only",
        )

    handler = CustomerSupportHandler(db)
    result = await handler.process_message(
        store_id=store.id,
        customer_email=body.customer_email or current_user.email,
        text=body.query,
        conversation_id=body.conversation_id,
        language=body.preferred_language or "",
    )
    await db.commit()

    answer = result.get("content") or result.get("answer") or result.get("message") or ""
    return ChatbotResponse(
        answer=answer,
        message=answer,
        conversation_id=int(result["conversation_id"]),
        message_id=int(result["message_id"]),
        intent=result.get("intent", intent.value),
        language=result.get("language", body.preferred_language or "en"),
        plan=plan,
        mode="read_only" if plan == "free" else "agent",
    )


@router.post("/chatbot/query", response_model=ChatbotResponse)
async def free_chatbot_query(
    body: ChatbotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Free chatbot: authenticated, connected-store, read-only support chat."""
    return await _chat(body, "free", db, current_user)


@router.post("/agent/query", response_model=ChatbotResponse)
async def pro_agent_query(
    body: ChatbotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pro chatbot: authenticated support chat with available store actions."""
    return await _chat(body, "pro", db, current_user)
