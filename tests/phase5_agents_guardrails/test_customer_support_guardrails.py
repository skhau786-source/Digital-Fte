import pytest
from src.sdk.database import AsyncSessionLocal
from src.domains.agents.customer_support.handler import CustomerSupportHandler


@pytest.mark.asyncio
async def test_guardrail_prevents_hallucination_on_unmatched_query():
    """Verify that when a customer asks for a product not in the catalog,

    the agent does NOT hallucinate or falsely recommend products[0].
    """
    async with AsyncSessionLocal() as db:
        handler = CustomerSupportHandler(db=db)
        
        # Inquire about something completely outside the catalog
        query = "velvet mountain hiking boots"
        answer = await handler.answer_product_question(store_id=1, query=query, language="en")
        
        # Verify the agent gracefully refuses rather than falsely pitching headphones
        assert "Quantum Pro" not in answer
        assert "couldn't find any products matching" in answer.lower() or "sorry" in answer.lower()


@pytest.mark.asyncio
async def test_guardrail_multilingual_refusal():
    """Verify multilingual refusal messages for unmatched queries in Urdu and Roman Urdu."""
    async with AsyncSessionLocal() as db:
        handler = CustomerSupportHandler(db=db)
        query = "sports shoes"

        # Urdu
        ur_answer = await handler.answer_product_question(store_id=1, query=query, language="ur")
        assert "معذرت" in ur_answer

        # Roman Urdu
        ru_answer = await handler.answer_product_question(store_id=1, query=query, language="roman_urdu")
        assert "Maazrat" in ru_answer or "dastyab nahi" in ru_answer


@pytest.mark.asyncio
async def test_semantic_match_finds_actual_seeded_product():
    """Verify that when customer asks for a real product, it correctly answers with catalog data."""
    async with AsyncSessionLocal() as db:
        handler = CustomerSupportHandler(db=db)
        query = "Headphones"
        answer = await handler.answer_product_question(store_id=1, query=query, language="en")
        
        # Should answer about headphones with price or specs
        assert "Headphones" in answer or "Quantum" in answer or "189" in answer
