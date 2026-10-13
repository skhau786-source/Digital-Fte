import asyncio

import pytest

from src.sdk.database import AsyncSessionLocal
from src.sdk.models.base import Product, Store, Variant
from src.sdk.models.support import Conversation
from src.sdk.oauth.tokens import TokenManager
from src.domains.security.rate_limiter import reset_chat_rate_limiter

# Test-only catalog written into the *test* database. The application itself
# ships no product data.
CATALOG = [
    ("Premium Cotton Lawn Suit", "Fabric", "Soft pure cotton lawn, 3-piece unstitched suit.", [
        ("Red", "6500.00", 12), ("Blue", "6500.00", 4)]),
    ("Pure Silk Dupatta", "Accessories", "Hand-finished silk dupatta.", [("Maroon", "3200.00", 0)]),
    ("Merino Wool Shawl", "Winter", "Warm wool shawl for winter.", [("Grey", "8900.50", 7)]),
    ("Leather Sandals", "Footwear", "Handmade leather sandals.", [("Size 42", "4100.00", 3), ("Size 43", "4100.00", 0)]),
]


async def _create_store() -> dict:
    async with AsyncSessionLocal() as db:
        store = Store(
            name="Test Fabric Store", platform="shopify", platform_store_id="fabric-test.myshopify.com",
            shop_name="fabric-test", shop_domain="fabric-test.myshopify.com",
            access_token=TokenManager().encrypt("shpat_unit_test_token"), is_active=True,
        )
        db.add(store)
        await db.flush()
        n = 1000
        ids = {}
        for title, ptype, desc, variants in CATALOG:
            p = Product(store_id=store.id, platform_product_id=str(n), title=title, product_type=ptype,
                        description=desc, status="active")
            db.add(p)
            await db.flush()
            ids[title] = {"product": p.id, "variants": {}}
            for vt, price, stock in variants:
                n += 1
                v = Variant(product_id=p.id, platform_variant_id=str(n), title=vt, sku=f"SKU{n}",
                            price=price, inventory_quantity=stock)
                db.add(v)
                await db.flush()
                ids[title]["variants"][vt] = v.id
        await db.commit()
        return {"store_id": store.id, "ids": ids}


@pytest.fixture(scope="session")
def fabric():
    return asyncio.run(_create_store())


@pytest.fixture(autouse=True)
def _fresh_rate_limit():
    reset_chat_rate_limiter()
    yield
    reset_chat_rate_limiter()


@pytest.fixture
def new_conversation(fabric):
    """Factory (async): creates an empty conversation in the fabric store and returns its id."""
    async def make() -> int:
        async with AsyncSessionLocal() as db:
            c = Conversation(store_id=fabric["store_id"], customer_email="", status="open")
            db.add(c)
            await db.commit()
            return c.id
    return make
