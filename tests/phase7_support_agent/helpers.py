"""Test doubles for the support-agent tests.

Only the *boundaries* are faked: the Anthropic client (scripted) and the
Shopify HTTP transport. Tools, DB queries, cart logic, verification and
handoff persistence all run for real against the test database.
"""

import json
from typing import Callable

import anthropic
import httpx
from anthropic.types import Message, TextBlock, ToolUseBlock, Usage


def text_msg(text: str) -> Message:
    return Message(
        id="msg_test", type="message", role="assistant", model="test-model",
        content=[TextBlock(type="text", text=text)], stop_reason="end_turn",
        stop_sequence=None, usage=Usage(input_tokens=1, output_tokens=1),
    )


def tool_msg(name: str, tool_input: dict, tool_id: str = "toolu_1") -> Message:
    return Message(
        id="msg_test", type="message", role="assistant", model="test-model",
        content=[ToolUseBlock(type="tool_use", id=tool_id, name=name, input=tool_input)],
        stop_reason="tool_use", stop_sequence=None, usage=Usage(input_tokens=1, output_tokens=1),
    )


def last_tool_result(messages: list[dict]) -> dict:
    """Parsed JSON of the most recent tool_result block in the request."""
    for m in reversed(messages):
        if m["role"] == "user" and isinstance(m["content"], list):
            for b in m["content"]:
                if isinstance(b, dict) and b.get("type") == "tool_result":
                    return json.loads(b["content"])
    raise AssertionError("no tool_result in request")


class FakeAnthropic:
    """Drop-in for AsyncAnthropic: ``messages.create`` calls ``script(request_kwargs, call_no)``."""

    def __init__(self, script: Callable[[dict, int], Message]):
        self.script = script
        self.calls: list[dict] = []
        self.messages = self  # client.messages.create(...)

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        out = self.script(kwargs, len(self.calls) - 1)
        if isinstance(out, Exception):
            raise out
        return out


def api_error() -> anthropic.APIConnectionError:
    return anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.com/v1/messages"))


def shopify_order_node(name="#1001", email="buyer@example.com", phone="+92 300 1234567",
                       financial="PAID", fulfillment="FULFILLED", tracking=True) -> dict:
    return {
        "id": "gid://shopify/Order/1", "name": name, "email": email, "phone": phone,
        "createdAt": "2026-10-01T10:00:00Z", "cancelledAt": None, "cancelReason": None,
        "displayFinancialStatus": financial, "displayFulfillmentStatus": fulfillment,
        "currentTotalPriceSet": {"shopMoney": {"amount": "4500.00", "currencyCode": "PKR"}},
        "shippingAddress": {"phone": None}, "billingAddress": {"phone": None},
        "lineItems": {"edges": [{"node": {"title": "Premium Cotton Lawn Suit", "quantity": 1}}]},
        "fulfillments": [{
            "status": "SUCCESS", "displayStatus": "DELIVERED" if fulfillment == "FULFILLED" else "IN_TRANSIT",
            "estimatedDeliveryAt": None, "deliveredAt": None,
            "trackingInfo": [{"company": "TCS", "number": "TRK123", "url": "https://track.example/TRK123"}] if tracking else [],
        }],
    }


def shopify_transport(orders: list[dict], seen: list | None = None) -> httpx.MockTransport:
    """Mock of POST /admin/api/<ver>/graphql.json that filters by the `name:#N` query."""

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        if seen is not None:
            seen.append({"url": str(request.url), "headers": dict(request.headers), "body": body})
        q = body["variables"]["q"]  # name:#1001
        num = q.split("#")[-1]
        edges = [{"node": o} for o in orders if o["name"].lstrip("#") == num]
        return httpx.Response(200, json={"data": {"orders": {"edges": edges}}})

    return httpx.MockTransport(handler)
