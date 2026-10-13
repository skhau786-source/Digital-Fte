# ═══════════════════════════════════════════════════════════════
# customer_support / agent / claude_agent.py
#
# PURPOSE: Claude (Anthropic SDK) tool-use loop for the storefront chat.
#          Model name / API key come from settings (.env).
#          Manual loop on purpose: every tool call is logged and runs
#          against the request's DB session.
# ═══════════════════════════════════════════════════════════════

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Optional

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.sdk.config import get_settings
from src.sdk.models.base import Store
from src.sdk.models.support import Conversation, Message

from ..rules import detect_language
from .cart import cart_snapshot
from .prompts import SYSTEM_PROMPT
from .tools import TOOL_SCHEMAS, ToolContext, execute_tool

logger = logging.getLogger("support_agent")

URDU_SCRIPT = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
HISTORY_TURNS = 12
TRACE_ROLE = "agent_trace"  # internal: tool_use / tool_result blocks of a turn (not shown to customers)

FALLBACK_REPLIES = {
    "en": "Sorry, I'm having trouble right now. Please try again in a moment, or leave your email or phone number and the store owner will follow up.",
    "roman_urdu": "Maazrat, abhi mujhe masla aa raha hai. Thori dair baad dobara try karein, ya apna email ya phone number dein, store owner aap se rabta karega.",
}


class AgentUnavailable(Exception):
    """Anthropic key / model not configured."""


def _lang_key(lang: str) -> str:
    return "roman_urdu" if lang in ("roman_urdu", "urdu") else "en"


def _blocks_to_params(content: list[Any]) -> list[dict]:
    """Response content blocks -> request params (round-trips thinking blocks unchanged)."""
    out = []
    for b in content:
        d = b.model_dump(exclude_none=True) if hasattr(b, "model_dump") else dict(b)
        out.append(d)
    return out


@dataclass
class AgentResult:
    reply: str
    language: str
    conversation_id: int
    message_id: int
    handoff_ids: list[int] = field(default_factory=list)
    cart: dict = field(default_factory=dict)
    tool_calls: list[str] = field(default_factory=list)


class SupportAgent:
    def __init__(self, db: AsyncSession, client: Optional[anthropic.AsyncAnthropic] = None, **tool_seams):
        s = get_settings()
        self.db = db
        self.settings = s
        if client is None:
            if not s.ANTHROPIC_API_KEY or not s.ANTHROPIC_MODEL:
                raise AgentUnavailable("ANTHROPIC_API_KEY and ANTHROPIC_MODEL must be set in .env")
            client = anthropic.AsyncAnthropic(api_key=s.ANTHROPIC_API_KEY)
        self.client = client
        self.model = s.ANTHROPIC_MODEL or "unset"
        self.tool_seams = tool_seams  # shopify_transport / webhook_transport for tests

    # ─── conversation persistence ─────────────────────────────

    async def get_conversation(self, store: Store, session_id: str) -> Conversation:
        res = await self.db.execute(
            select(Conversation).where(Conversation.session_id == session_id, Conversation.store_id == store.id)
        )
        conv = res.scalar_one_or_none()
        if conv:
            return conv
        conv = Conversation(store_id=store.id, customer_email="", status="open", session_id=session_id)
        self.db.add(conv)
        await self.db.flush()
        return conv

    async def _history(self, conv: Conversation) -> list[dict]:
        res = await self.db.execute(
            select(Message).where(Message.conversation_id == conv.id).order_by(Message.id.asc())
        )
        rows = list(res.scalars().all())
        # keep the last HISTORY_TURNS customer turns (and everything after them)
        cust_idx = [i for i, m in enumerate(rows) if m.role == "customer"]
        if len(cust_idx) > HISTORY_TURNS:
            rows = rows[cust_idx[-HISTORY_TURNS]:]
        msgs: list[dict] = []
        for m in rows:
            if m.role == "customer":
                msgs.append({"role": "user", "content": m.content})
            elif m.role == TRACE_ROLE:
                try:
                    msgs.extend(json.loads(m.content))
                except ValueError:
                    continue
            elif m.role in ("agent_bot", "agent_human"):
                msgs.append({"role": "assistant", "content": m.content})
        return msgs

    # ─── main entry ───────────────────────────────────────────

    async def reply(self, store: Store, session_id: str, text: str) -> AgentResult:
        conv = await self.get_conversation(store, session_id)
        history = await self._history(conv)
        lang_hint = detect_language(text)
        lang_key = _lang_key(lang_hint)
        conv.language = lang_key

        self.db.add(Message(conversation_id=conv.id, role="customer", content=text))
        await self.db.flush()

        ctx = ToolContext(db=self.db, store=store, conversation=conv, **self.tool_seams)
        user_msg = {
            "role": "user",
            "content": [
                {"type": "text", "text": text},
                {"type": "text", "text": f"[language-detector: {lang_hint}]"},
            ],
        }
        messages = history + [user_msg]
        trace: list[dict] = []  # this turn's intermediate assistant/tool_result messages
        tool_calls: list[str] = []
        final_text = ""

        try:
            for _round in range(self.settings.CHAT_MAX_TOOL_ROUNDS + 1):
                resp = await self.client.messages.create(
                    model=self.model,
                    max_tokens=self.settings.ANTHROPIC_MAX_TOKENS,
                    system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
                    tools=TOOL_SCHEMAS,
                    messages=messages + trace,
                )
                if resp.stop_reason == "tool_use":
                    uses = [b for b in resp.content if b.type == "tool_use"]
                    trace.append({"role": "assistant", "content": _blocks_to_params(resp.content)})
                    results = []
                    for u in uses:
                        tool_calls.append(u.name)
                        out = await execute_tool(ctx, u.name, dict(u.input or {}))
                        results.append({
                            "type": "tool_result",
                            "tool_use_id": u.id,
                            "content": json.dumps(out, ensure_ascii=False),
                            **({"is_error": True} if "error" in out else {}),
                        })
                    trace.append({"role": "user", "content": results})
                    continue

                if resp.stop_reason == "refusal":
                    logger.warning("model refusal conv=%s category=%s", conv.id, getattr(resp.stop_details, "category", None))
                    final_text = FALLBACK_REPLIES[lang_key]
                    break

                final_text = "".join(b.text for b in resp.content if b.type == "text").strip()
                if resp.stop_reason == "max_tokens":
                    logger.warning("max_tokens hit conv=%s", conv.id)
                break
            else:
                logger.error("tool round limit hit conv=%s tools=%s", conv.id, tool_calls)
                final_text = ""

            if final_text and URDU_SCRIPT.search(final_text):
                final_text = await self._to_latin_script(final_text)
        except anthropic.APIError as e:
            logger.error("Anthropic API error conv=%s: %s", conv.id, e)
            final_text = ""
            trace = []

        if not final_text:
            final_text = FALLBACK_REPLIES[lang_key]

        # The trace is replayed on later turns so the model keeps product / variant ids.
        if trace and trace[-1]["role"] == "user":
            self.db.add(Message(conversation_id=conv.id, role=TRACE_ROLE, content=json.dumps(trace, ensure_ascii=False)))
        bot = Message(conversation_id=conv.id, role="agent_bot", content=final_text)
        self.db.add(bot)
        await self.db.flush()

        return AgentResult(
            reply=final_text,
            language=lang_key,
            conversation_id=conv.id,
            message_id=bot.id,
            handoff_ids=ctx.handoff_ids,
            cart=await cart_snapshot(self.db, store.id, conv.id),
            tool_calls=tool_calls,
        )

    async def _to_latin_script(self, text: str) -> str:
        """Guard for the 'Roman Urdu stays in Latin script' rule."""
        try:
            r = await self.client.messages.create(
                model=self.model,
                max_tokens=self.settings.ANTHROPIC_MAX_TOKENS,
                system="Rewrite the user's text in Roman Urdu using only Latin letters (no Urdu/Arabic script). "
                       "Keep every number, price, product name and link exactly as is. Output only the rewritten text.",
                messages=[{"role": "user", "content": text}],
            )
            out = "".join(b.text for b in r.content if b.type == "text").strip()
            if out and not URDU_SCRIPT.search(out):
                return out
        except anthropic.APIError as e:
            logger.error("script-guard rewrite failed: %s", e)
        return ""
