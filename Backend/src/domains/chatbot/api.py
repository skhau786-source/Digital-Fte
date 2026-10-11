# =============================================================
# domains / chatbot / api.py
#
# PURPOSE: Backend adapters for the two packaged chatbot widgets.
#
# FREE:
#   - Guest users: general knowledge / educational assistant only.
#   - Authenticated users: connected-store read-only support.
#
# PRO:
#   - Authenticated users only.
#   - Support + action capabilities exposed by the support handler.
#
# =============================================================

import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.sdk.database import get_db
from src.sdk.models.base import Store
from src.domains.auth.models import User
from src.domains.auth.service import (
    get_current_user,
    get_optional_current_user,
)
from src.domains.agents.customer_support.config import (
    get_settings as get_support_settings,
)
from src.domains.agents.customer_support.handler import (
    CustomerSupportHandler,
)
from src.domains.agents.customer_support.rules import (
    Intent,
    classify_intent,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chatbots"])


# =============================================================
# REQUEST / RESPONSE MODELS
# =============================================================

class ChatbotRequest(BaseModel):
    query: str = Field(
        min_length=1,
        max_length=4000,
    )

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


# =============================================================
# STORE RESOLUTION
# =============================================================

async def _resolve_store(
    body: ChatbotRequest,
    current_user: User,
    db: AsyncSession,
) -> Optional[Store]:
    """
    Resolve only a store owned by the authenticated user.
    """

    query = select(Store).where(
        Store.user_id == current_user.id,
        Store.is_active.is_(True),
    )

    if body.store_id is not None:
        query = query.where(
            Store.id == body.store_id
        )
    else:
        query = query.order_by(
            Store.created_at.asc()
        )

    result = await db.execute(
        query.limit(1)
    )

    return result.scalar_one_or_none()


# =============================================================
# AUTHENTICATED CHAT
# =============================================================

async def _chat(
    body: ChatbotRequest,
    plan: Literal["free", "pro"],
    db: AsyncSession,
    current_user: User,
) -> ChatbotResponse:
    """
    Handle authenticated Free and Pro chatbot requests.
    """

    store = await _resolve_store(
        body,
        current_user,
        db,
    )

    if not store:
        lang = body.preferred_language or "en"
        if lang == "urdu":
            msg = (
                "Not Store Connected Yet۔ "
                "برائے کرم ڈیش بورڈ میں جا کر اپنا اسٹور منسلک کریں تاکہ کیٹلاگ اور آرڈرز کی معلومات حاصل کی جا سکیں۔"
            )
        elif lang == "roman_urdu":
            msg = (
                "Not Store Connected Yet. "
                "Barah-e-karam dashboard me ja kar apna Shopify ya e-commerce store connect karein taake products aur orders ki live maloomat mil sakay."
            )
        else:
            msg = (
                "Not Store Connected Yet. "
                "Please connect your Shopify or e-commerce store in the dashboard to enable catalog and order inquiries."
            )
        return ChatbotResponse(
            answer=msg,
            message=msg,
            conversation_id=body.conversation_id or 0,
            message_id=0,
            intent="no_store",
            language=lang,
            plan=plan,
            mode="read_only" if plan == "free" else "agent",
        )

    support_settings = get_support_settings()

    # ---------------------------------------------------------
    # INTENT CLASSIFICATION
    # ---------------------------------------------------------

    intent = classify_intent(
        body.query,
        handoff_keywords=support_settings.HANDOFF_KEYWORDS,
        out_of_scope_keywords=support_settings.OUT_OF_SCOPE_KEYWORDS,
    )

    # ---------------------------------------------------------
    # FREE PLAN = READ ONLY
    #
    # Never allow the Free client to trigger store actions.
    # This restriction is enforced server-side.
    # ---------------------------------------------------------

    if plan == "free" and intent in {
        Intent.CART_ADD,
        Intent.CART_REMOVE,
        Intent.CART_UPDATE,
    }:
        lang = (
            body.preferred_language
            or "en"
        )

        if lang == "urdu":
            message = (
                "Free Plan read-only hai. "
                "Store actions ke liye Pro Agent use karein."
            )

        elif lang == "roman_urdu":
            message = (
                "Free Plan read-only hai. "
                "Store actions ke liye Pro Agent use karein."
            )

        else:
            message = (
                "The Free Plan chatbot is read-only. "
                "Use the Pro Agent for store actions."
            )

        return ChatbotResponse(
            answer=message,
            message=message,
            conversation_id=(
                body.conversation_id or 0
            ),
            message_id=0,
            intent=intent.value,
            language=lang,
            plan="free",
            mode="read_only",
        )

    # ---------------------------------------------------------
    # CUSTOMER SUPPORT HANDLER
    # ---------------------------------------------------------

    handler = CustomerSupportHandler(db)

    result = await handler.process_message(
        store_id=store.id,
        customer_email=(
            body.customer_email
            or current_user.email
        ),
        text=body.query,
        conversation_id=body.conversation_id,
        language=body.preferred_language or "",
    )

    await db.commit()

    answer = (
        result.get("content")
        or result.get("answer")
        or result.get("message")
        or ""
    )

    return ChatbotResponse(
        answer=answer,
        message=answer,
        conversation_id=int(
            result["conversation_id"]
        ),
        message_id=int(
            result["message_id"]
        ),
        intent=result.get(
            "intent",
            intent.value,
        ),
        language=result.get(
            "language",
            body.preferred_language or "en",
        ),
        plan=plan,
        mode=(
            "read_only"
            if plan == "free"
            else "agent"
        ),
    )


# =============================================================
# FREE CHATBOT
# =============================================================

@router.post(
    "/chatbot/query",
    response_model=ChatbotResponse,
)
async def free_chatbot_query(
    body: ChatbotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(
        get_optional_current_user
    ),
):
    """
    Free chatbot behavior:

    Guest:
        - General knowledge
        - Educational questions
        - Public information
        - No private store/account information

    Authenticated:
        - Connected store
        - Read-only support
        - No store actions
    """

    # =========================================================
    # GUEST MODE
    # =========================================================

    if current_user is None:
        language = body.preferred_language or "en"
        if language == "urdu":
            msg = (
                "Not Store Connected Yet۔ "
                "برائے کرم لاگ ان کریں اور ڈیش بورڈ سے اپنا اسٹور منسلک کریں تاکہ کیٹلاگ اور آرڈرز کی معلومات حاصل کی جا سکیں۔"
            )
        elif language == "roman_urdu":
            msg = (
                "Not Store Connected Yet. "
                "Barah-e-karam pehle login karein aur dashboard se apna store connect karein taake products aur orders ki live maloomat mil sakay."
            )
        else:
            msg = (
                "Not Store Connected Yet. "
                "Please log in and connect your Shopify or e-commerce store from the dashboard to enable catalog and order inquiries."
            )
        return ChatbotResponse(
            answer=msg,
            message=msg,
            conversation_id=body.conversation_id or 0,
            message_id=0,
            intent="no_store",
            language=language,
            plan="free",
            mode="read_only",
        )

    # =========================================================
    # AUTHENTICATED FREE MODE
    # =========================================================

    return await _chat(
        body,
        "free",
        db,
        current_user,
    )


# =============================================================
# PRO AI AGENT
# =============================================================

@router.post(
    "/agent/query",
    response_model=ChatbotResponse,
)
async def pro_agent_query(
    body: ChatbotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Pro chatbot:
    authenticated support chat with available
    store/action capabilities.
    """

    return await _chat(
        body,
        "pro",
        db,
        current_user,
    )