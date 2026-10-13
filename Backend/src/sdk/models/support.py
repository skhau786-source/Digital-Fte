# ═══════════════════════════════════════════════════════════════
# fte_sdk / models / support.py
#
# PURPOSE: Customer support models — conversations, messages,
#          human handoff logging.
#
# USED BY: customer_support (chat, RAG, handoff)
# ═══════════════════════════════════════════════════════════════

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship

from src.sdk.database import Base


# ─── Conversation ─────────────────────────────────────────────
# Customer support conversation thread.
# Links to product for RAG context. status tracks lifecycle.

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    customer_email = Column(String(255), default="")
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    status = Column(String(50), default="open")            # open | closed | handoff
    session_id = Column(String(64), nullable=True, unique=True, index=True)  # opaque browser-session token
    language = Column(String(20), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


# ─── Message ──────────────────────────────────────────────────
# Single message within a conversation.
# role = "customer" | "agent_bot" | "agent_human"

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False)               # customer | agent_bot | agent_human
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")


# ─── HandoffLog ──────────────────────────────────────────────
# Records when a conversation was escalated from bot → human.
# reason = why it was escalated. assigned_to = human agent ID.

class HandoffLog(Base):
    __tablename__ = "handoff_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    reason = Column(Text, default="")
    assigned_to = Column(String(255), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Handoff ─────────────────────────────────────────────────
# Escalation to the business owner. Keeps the customer's contact
# details and a snapshot of the conversation so the owner can follow up
# without opening the dashboard. (handoff_logs above is the older,
# reason-only log and is still written for the dashboard queue.)

class Handoff(Base):
    __tablename__ = "handoffs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    category = Column(String(50), default="other")          # refund | complaint | discount | custom_order | unanswerable | other
    reason = Column(Text, default="")
    customer_name = Column(String(255), default="")
    customer_email = Column(String(255), default="")
    customer_phone = Column(String(50), default="")
    transcript = Column(Text, default="")                    # JSON list of {role, content}
    status = Column(String(30), default="open")              # open | resolved
    notified_at = Column(DateTime(timezone=True), nullable=True)
    notify_error = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Cart ────────────────────────────────────────────────────
# One cart per chat session. Lines reference real variants; price and
# stock are always re-read from variants at display time, never cached here.

class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("cart_id", "variant_id", name="uq_cart_variant"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    cart_id = Column(Integer, ForeignKey("carts.id"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("variants.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    cart = relationship("Cart", back_populates="items")
    variant = relationship("Variant")
