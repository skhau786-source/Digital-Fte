# ═══════════════════════════════════════════════════════════════
# customer_support / agent / notifier.py
#
# PURPOSE: Tell the business owner about a handoff.
#          The repo already has an SMTP sender (security/email_service);
#          we reuse it for OWNER_NOTIFY_EMAIL and add an optional generic
#          JSON webhook (OWNER_WEBHOOK_URL – Slack/Discord/Zapier style).
#          Returns (ok, error) so the caller can persist the outcome.
# ═══════════════════════════════════════════════════════════════

import asyncio
import html
import logging
import smtplib
from email.mime.text import MIMEText

import httpx

from src.sdk.config import get_settings

logger = logging.getLogger(__name__)


def _render(handoff: dict) -> tuple[str, str, str]:
    subject = f"[Store support] {handoff['category']} handoff #{handoff['id']}"
    lines = [
        f"Category: {handoff['category']}",
        f"Reason: {handoff['reason']}",
        f"Customer: {handoff['customer_name'] or '-'}",
        f"Email: {handoff['customer_email'] or '-'}",
        f"Phone: {handoff['customer_phone'] or '-'}",
        f"Conversation id: {handoff['conversation_id']}",
        "",
        "Recent conversation:",
    ] + [f"{m['role']}: {m['content']}" for m in handoff["transcript"][-12:]]
    text = "\n".join(lines)
    return subject, text, "<pre>" + html.escape(text) + "</pre>"


def _send_smtp(to_email: str, subject: str, html_body: str) -> None:
    """Like security.email_service.send_email but raises, so failures are recorded."""
    s = get_settings()
    msg = MIMEText(html_body, "html")
    msg["Subject"] = subject
    msg["From"] = s.EMAIL_FROM or s.SMTP_USER
    msg["To"] = to_email
    with smtplib.SMTP(s.SMTP_HOST, s.SMTP_PORT, timeout=15) as server:
        server.starttls()
        if s.SMTP_USER:
            server.login(s.SMTP_USER, s.SMTP_PASSWORD)
        server.send_message(msg)


async def notify_owner(handoff: dict, webhook_transport: httpx.AsyncBaseTransport | None = None) -> tuple[bool, str]:
    s = get_settings()
    subject, text, html_body = _render(handoff)
    errors: list[str] = []
    delivered = False

    if s.OWNER_NOTIFY_EMAIL:
        if not s.SMTP_HOST:
            errors.append("OWNER_NOTIFY_EMAIL set but SMTP_HOST is empty")
        else:
            try:
                await asyncio.to_thread(_send_smtp, s.OWNER_NOTIFY_EMAIL, subject, html_body)
                delivered = True
            except Exception as e:  # noqa: BLE001 - recorded, never raised into the chat
                errors.append(f"email: {e}")

    if s.OWNER_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient(transport=webhook_transport, timeout=10) as client:
                r = await client.post(
                    s.OWNER_WEBHOOK_URL,
                    json={"text": f"{subject}\n{text}", "subject": subject, "handoff": handoff},
                )
                r.raise_for_status()
            delivered = True
        except Exception as e:  # noqa: BLE001
            errors.append(f"webhook: {e}")

    if not s.OWNER_NOTIFY_EMAIL and not s.OWNER_WEBHOOK_URL:
        errors.append("no owner notification channel configured (OWNER_NOTIFY_EMAIL / OWNER_WEBHOOK_URL)")

    if errors:
        logger.warning("Handoff #%s notification issues: %s", handoff["id"], "; ".join(errors))
    return delivered, "; ".join(errors)
