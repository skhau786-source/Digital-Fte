import logging
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from src.sdk.database import async_session_factory as AsyncSessionLocal
from src.domains.auth.models import User, AuthProvider
from src.domains.security.jwt import hash_password
from src.sdk.models.base import Store, Product, Variant, Order, OrderItem

logger = logging.getLogger(__name__)

DEMO_EMAIL = "demo@autofte.com"
DEMO_PASSWORD = "AutoFTE@2026!"
DEMO_STORE_NAME = "Auto-FTE Flagship Store"


async def seed_demo_enterprise_user() -> User:
    """Ensures the demo@autofte.com enterprise account and flagship store exist with catalog data."""
    async with AsyncSessionLocal() as db:
        try:
            # 1. Check or create demo user
            res = await db.execute(select(User).where(User.email == DEMO_EMAIL))
            user = res.scalar_one_or_none()

            if not user:
                user = User(
                    username="demo",
                    email=DEMO_EMAIL,
                    full_name="AUTO-FTE Enterprise Demo",
                    hashed_password=hash_password(DEMO_PASSWORD),
                    auth_provider=AuthProvider.LOCAL,
                    is_active=True,
                    is_verified=True,
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
                logger.info(f"Seeded sample enterprise account: {DEMO_EMAIL}")
            else:
                # Update password hash to guarantee login works
                user.hashed_password = hash_password(DEMO_PASSWORD)
                user.is_active = True
                user.is_verified = True
                await db.commit()
                await db.refresh(user)

            # 2. Check or create flagship store for this user
            res_store = await db.execute(select(Store).where(Store.user_id == user.id))
            store = res_store.scalar_one_or_none()

            if not store:
                store = Store(
                    name=DEMO_STORE_NAME,
                    platform="shopify",
                    platform_store_id="autofte-flagship",
                    shop_name="autofte-flagship",
                    access_token="shpat_live_neon_token",
                    is_active=True,
                    user_id=user.id,
                )
                db.add(store)
                await db.commit()
                await db.refresh(store)
                logger.info(f"Seeded demo store for user {user.email}")

            # 3. Check or seed products
            p_count = (
                await db.execute(
                    select(func.count(Product.id)).where(Product.store_id == store.id)
                )
            ).scalar() or 0

            if p_count == 0:
                sample_products = [
                    {
                        "title": "Quantum Pro Wireless Headphones",
                        "description": "Active noise canceling with 40-hour battery life and studio-grade acoustics.",
                        "price": 189.99,
                        "sku": "QPRO-WH-01",
                        "category": "Electronics",
                        "stock": 45,
                        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
                    },
                    {
                        "title": "Ergonomic Mechanical Keyboard",
                        "description": "Hot-swappable RGB mechanical switches with split design for wrist comfort.",
                        "price": 129.50,
                        "sku": "ERGO-KB-02",
                        "category": "Peripherals",
                        "stock": 28,
                        "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80",
                    },
                    {
                        "title": "Ultra-Slim Portable Monitor 15.6\"",
                        "description": "Full HD 1080P IPS display with USB-C and Mini HDMI for dual-screen productivity.",
                        "price": 249.00,
                        "sku": "USM-MON-03",
                        "category": "Displays",
                        "stock": 14,
                        "image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80",
                    },
                    {
                        "title": "Minimalist Leather Travel Wallet",
                        "description": "Handcrafted top-grain leather with RFID-blocking sleeves and quick-draw slot.",
                        "price": 49.99,
                        "sku": "MLW-ACC-04",
                        "category": "Accessories",
                        "stock": 85,
                        "image_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
                    },
                    {
                        "title": "Smart Ambient Desk Lamp",
                        "description": "Dimmable LED with wireless smartphone charging base and sleep timer.",
                        "price": 79.95,
                        "sku": "SADL-LGT-05",
                        "category": "Lighting",
                        "stock": 3,
                        "image_url": "https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=500&q=80",
                    },
                ]

                for p_data in sample_products:
                    prod = Product(
                        store_id=store.id,
                        title=p_data["title"],
                        description=p_data["description"],
                        vendor="AUTO-FTE",
                        product_type=p_data["category"],
                        status="active",
                        image_url=p_data["image_url"],
                    )
                    db.add(prod)
                    await db.flush()

                    var = Variant(
                        product_id=prod.id,
                        title="Standard",
                        sku=p_data["sku"],
                        price=p_data["price"],
                        inventory_quantity=p_data["stock"],
                        low_stock_threshold=5,
                    )
                    db.add(var)

                await db.commit()
                logger.info(f"Seeded 5 sample catalog products for store {store.name}")

            # 4. Check or seed sample orders
            o_count = (
                await db.execute(
                    select(func.count(Order.id)).where(Order.store_id == store.id)
                )
            ).scalar() or 0

            if o_count == 0:
                sample_orders = [
                    {"order_number": "ORD-9821", "customer_name": "Sarah Jenkins", "customer_email": "sarah.jenkins@gmail.com", "total_amount": 189.99, "status": "completed"},
                    {"order_number": "ORD-9822", "customer_name": "Alex Miller", "customer_email": "alex.miller@outlook.com", "total_amount": 129.50, "status": "processing"},
                    {"order_number": "ORD-9823", "customer_name": "David Chen", "customer_email": "david.chen@gmail.com", "total_amount": 498.00, "status": "completed"},
                    {"order_number": "ORD-9824", "customer_name": "Emma Watson", "customer_email": "emma.watson@gmail.com", "total_amount": 149.97, "status": "completed"},
                    {"order_number": "ORD-9825", "customer_name": "Michael Brown", "customer_email": "michael.brown@yahoo.com", "total_amount": 69.97, "status": "pending"},
                ]

                now = datetime.now(timezone.utc)
                for idx, o_data in enumerate(sample_orders):
                    order = Order(
                        store_id=store.id,
                        platform_order_id=f"demo_shopify_{uuid4().hex[:8]}",
                        order_number=o_data["order_number"],
                        customer_email=o_data["customer_email"],
                        total_price=o_data["total_amount"],
                        currency="USD",
                        financial_status="paid" if o_data["status"] == "completed" else "pending",
                        fulfillment_status="fulfilled" if o_data["status"] == "completed" else "unfulfilled",
                        ordered_at=now - timedelta(days=idx, hours=idx * 2),
                    )
                    db.add(order)

                await db.commit()
                logger.info(f"Seeded 5 sample orders for store {store.name}")

            return user

        except Exception as e:
            logger.error(f"Failed to seed demo enterprise account: {e}")
            await db.rollback()
            return None
