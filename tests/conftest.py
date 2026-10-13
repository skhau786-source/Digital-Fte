import os
import sys
import asyncio
import pytest

# Ensure Backend directory is in Python path for test discovery
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

TEST_DB_PATH = os.path.join(BACKEND_DIR, "test_autofte.db")
os.environ["TESTING"] = "true"
os.environ["SECRET_KEY"] = "auto-fte-test-secret-key-must-be-32-bytes!"
os.environ["ENCRYPTION_KEY"] = "bn-LozqGJ-7LY5KplskYLae2ek0fBuXc9T5Ftdm7AM0="
os.environ["TEST_DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

from fastapi.testclient import TestClient
from src.main import app
from src.sdk.database import init_db
from tests.fixtures.demo_seed import seed_demo_enterprise_user


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initializes schema and seeds demo enterprise user before running test suite."""
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    async def _init():
        await init_db()
        await seed_demo_enterprise_user()

    asyncio.run(_init())
    yield
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass


@pytest.fixture(scope="session")
def client():
    """Synchronous test client for API integration tests."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers():
    """Generates valid JWT Authorization headers for authenticated tests."""
    from src.domains.security.jwt import create_access_token
    token = create_access_token({"sub": "1", "email": "demo@autofte.com"})
    return {"Authorization": f"Bearer {token}"}
