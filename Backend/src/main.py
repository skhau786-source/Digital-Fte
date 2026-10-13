# ═══════════════════════════════════════════════════════════════
# src / main.py
#
# PURPOSE: Unified FastAPI application entry point.
#          Routers: auth, ecommerce (routes/webhooks/oauth),
#          6 agent APIs. Lifespan: DB init, event bus, 7 agent workers.
# ═══════════════════════════════════════════════════════════════

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

from src.sdk.config import get_settings
from src.sdk.database import init_db
from src.dependencies import init_event_bus, close_event_bus, close_llm_client
from src.domains.auth.routes import router as auth_router
from src.domains.ecommerce import routes_router, webhooks_router, oauth_router
from src.domains.chatbot.api import router as chatbot_router
from src.domains.dashboard_api import router as dashboard_router
from src.domains.agents.customer_support.storefront_api import router as storefront_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
settings = get_settings()


def _load_agent_routers():
    """Agent API routers lazily import karo — import failure par app start na ruke."""
    routers = []
    agent_modules = [
        ("content_generation", "router", "Content Generation"),
        ("content_scheduling", "router", "Content Scheduling"),
        ("comment_engagement", "router", "Comment Engagement"),
        ("customer_support", "router", "Customer Support"),
        ("analytics_insights", "router", "Analytics Insights"),
        ("collaboration_orchestrator", "router", "Collaboration Orchestrator"),
        ("seo_insights", "router", "SEO Insights"),
        ("customers", "router", "Customers"),
    ]
    for mod_name, attr, label in agent_modules:
        try:
            module = __import__(
                f"src.domains.agents.{mod_name}.api", fromlist=[attr]
            )
            routers.append(getattr(module, attr))
        except Exception as e:
            logger.warning(f"Agent router not loaded ({label}): {e}")
    return routers


async def _start_workers():
    """Agent workers background asyncio tasks ke taur par start karo."""
    tasks = []
    worker_modules = [
        "src.domains.agents.inventory_sync.worker",
        "src.domains.agents.content_scheduling.worker",
        "src.domains.agents.content_generation.worker",
        "src.domains.agents.comment_engagement.worker",
        "src.domains.agents.customer_support.worker",
        "src.domains.agents.analytics_insights.worker",
        "src.domains.agents.collaboration_orchestrator.worker",
        "src.domains.agents.seo_insights.worker",
        "src.domains.agents.customers.worker",
    ]
    for mod_path in worker_modules:
        try:
            module = __import__(mod_path, fromlist=["worker"])
            w = getattr(module, "worker")
            tasks.append(asyncio.create_task(w.run()))
            logger.info(f"Worker started: {mod_path.split('.')[-2]}")
        except Exception as e:
            logger.warning(f"Worker not started ({mod_path}): {e}")
    return tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database not connected ({e}). Running in offline/mock mode.")

    try:
        await init_event_bus()
        logger.info("Event bus initialized successfully")
    except Exception as e:
        logger.warning(f"Redis event bus not connected ({e}). Running without Redis.")

    workers = await _start_workers()
    logger.info("Startup complete. Server is ready!")
    yield
    for t in workers:
        t.cancel()
    try:
        await close_event_bus()
    except Exception:
        pass
    await close_llm_client()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
import os
_backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_free_dir = os.path.join(_backend_root, "chatbot_free")
_pro_dir = os.path.join(_backend_root, "chatbot_pro")

if os.path.exists(_free_dir):
    app.mount("/static/chatbot_free", StaticFiles(directory=_free_dir), name="chatbot-free-static")
if os.path.exists(_pro_dir):
    app.mount("/static/chatbot_pro", StaticFiles(directory=_pro_dir), name="chatbot-pro-static")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(routes_router)
app.include_router(webhooks_router)
app.include_router(oauth_router)
app.include_router(chatbot_router)
app.include_router(dashboard_router)
app.include_router(storefront_router)
for _agent_router in _load_agent_routers():
    app.include_router(_agent_router)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }
