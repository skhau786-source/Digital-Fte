import asyncio
import json
import logging
from sqlalchemy import select, delete
from dotenv import load_dotenv

load_dotenv("Backend/.env")
from src.sdk.database import async_session_factory
from src.domains.auth.models import User, LoginLog
from src.domains.security.jwt import hash_password
from src.sdk.models.base import Store, Product, Variant, Order, OrderItem, LowStockAlert
from src.sdk.models.dashboard import AutomationSettings
from src.sdk.models.workflow import AgentTask

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cleanup_users")

async def cleanup_non_demo_users():
    async with async_session_factory() as session:
        # 1. Check or ensure demo@autofte.com exists
        res = await session.execute(select(User).where(User.email == "demo@autofte.com"))
        demo_user = res.scalar_one_or_none()

        demo_pwd_hash = hash_password("AutoFTE@2026!")

        if not demo_user:
            logger.info("Creating demo@autofte.com enterprise account...")
            demo_user = User(
                username="demo",
                email="demo@autofte.com",
                full_name="Auto-FTE Enterprise Demo",
                hashed_password=demo_pwd_hash,
                auth_provider="local",
                is_active=True,
                is_verified=True,
            )
            session.add(demo_user)
            await session.commit()
            await session.refresh(demo_user)
        else:
            logger.info(f"Updating demo@autofte.com (ID: {demo_user.id}) password to AutoFTE@2026!...")
            demo_user.hashed_password = demo_pwd_hash
            demo_user.is_active = True
            demo_user.is_verified = True
            await session.commit()

        # 2. Get all non-demo users
        res = await session.execute(select(User).where(User.email != "demo@autofte.com"))
        non_demo_users = res.scalars().all()
        non_demo_user_ids = [u.id for u in non_demo_users]

        logger.info(f"Found {len(non_demo_users)} non-demo users to purge: {[(u.id, u.email) for u in non_demo_users]}")

        if non_demo_user_ids:
            # Delete AutomationSettings for non-demo users
            await session.execute(
                delete(AutomationSettings).where(AutomationSettings.user_id.in_(non_demo_user_ids))
            )

            # Delete LoginLogs for non-demo users
            await session.execute(
                delete(LoginLog).where(LoginLog.user_id.in_(non_demo_user_ids))
            )

            # Find stores belonging to non-demo users
            s_res = await session.execute(
                select(Store).where(Store.user_id.in_(non_demo_user_ids))
            )
            non_demo_stores = s_res.scalars().all()
            non_demo_store_ids = [s.id for s in non_demo_stores]

            if non_demo_store_ids:
                logger.info(f"Purging {len(non_demo_stores)} stores: {non_demo_store_ids}")
                
                # Delete LowStockAlerts
                await session.execute(
                    delete(LowStockAlert).where(LowStockAlert.store_id.in_(non_demo_store_ids))
                )

                # Delete OrderItems & Orders
                o_res = await session.execute(
                    select(Order.id).where(Order.store_id.in_(non_demo_store_ids))
                )
                order_ids = [o for o in o_res.scalars().all()]
                if order_ids:
                    await session.execute(
                        delete(OrderItem).where(OrderItem.order_id.in_(order_ids))
                    )
                    await session.execute(
                        delete(Order).where(Order.id.in_(order_ids))
                    )

                # Delete Variants & Products
                p_res = await session.execute(
                    select(Product.id).where(Product.store_id.in_(non_demo_store_ids))
                )
                product_ids = [p for p in p_res.scalars().all()]
                if product_ids:
                    await session.execute(
                        delete(Variant).where(Variant.product_id.in_(product_ids))
                    )
                    await session.execute(
                        delete(Product).where(Product.id.in_(product_ids))
                    )

                # Delete Stores
                await session.execute(
                    delete(Store).where(Store.id.in_(non_demo_store_ids))
                )

            # Purge AgentTasks for non-demo users
            t_res = await session.execute(select(AgentTask))
            all_tasks = t_res.scalars().all()
            for t in all_tasks:
                try:
                    payload = json.loads(t.payload or "{}")
                    if payload.get("user_id") in non_demo_user_ids:
                        await session.delete(t)
                except Exception:
                    pass

            # Delete non-demo users
            await session.execute(
                delete(User).where(User.id.in_(non_demo_user_ids))
            )

            await session.commit()
            logger.info("Successfully deleted all non-demo users and their associated records.")
        else:
            logger.info("No non-demo users found to delete.")

        # Verify only demo@autofte.com remains
        survivors = (await session.execute(select(User))).scalars().all()
        print("\n================ DATABASE USERS SUMMARY ================")
        print(f"Total Users: {len(survivors)}")
        for u in survivors:
            print(f"- ID: {u.id} | Email: {u.email} | Username: {u.username} | Active: {u.is_active}")
        print("========================================================\n")

if __name__ == "__main__":
    asyncio.run(cleanup_non_demo_users())
