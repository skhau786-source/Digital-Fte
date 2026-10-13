# Architecture (as inherited from `SSupdates`)

This describes what existed in the repo when it was cloned, before the Claude-based support agent was added. See the "Customer Support Agent" section of `README.md` for what was built on top.

## Layout

| Path | What it is |
|---|---|
| `Backend/` | FastAPI app (`src/main.py`), SQLAlchemy async models, agents, packaged chat widgets |
| `frontend/` | Next.js 15 / React 19 merchant dashboard + marketing site |
| `tests/` | Pytest suite (6 phases), uses SQLite via `TESTING=true` |
| `docker-compose.yml` | frontend + backend + Postgres 16 + Redis 7 |

## Inventory Sync Agent (FTE-01)

`Backend/src/domains/agents/inventory_sync/`

- `handler.py` – `InventorySyncHandler`: full/products/orders sync through `PlatformRegistry` (Shopify, WooCommerce, BigCommerce, Amazon, Daraz connectors in `src/sdk/platforms/`); upserts `products`, `variants`, `orders`, `order_items`; raises `low_stock_alerts`; applies Shopify webhooks (`products/*`, `inventory_levels/update`, `orders/*`).
- `worker.py` – `BaseAgent` subscribed to the Redis `webhooks` and `sync` channels.
- Shopify connector (`sdk/platforms/shopify.py`) uses the `ShopifyAPI` (PyShopify) **REST** client, API version `2024-01`. There is no GraphQL Admin client in the repo.

## Postgres tables (`src/sdk/models/*`, `src/domains/auth/models.py`)

Created by `init_db()` via `Base.metadata.create_all` (Alembic is configured but `versions/` is empty).

- Commerce: `stores`, `products`, `variants` (price, `inventory_quantity`), `orders` (`order_number`, `customer_email`, statuses), `order_items`, `low_stock_alerts`
- Support: `conversations`, `messages`, `handoff_logs` (reason + assignee only; no contact details, no transcript)
- Auth: `users`, `login_logs`
- Content/social/analytics/workflow: `brand_voice_profiles`, `generated_posts`, `image_assets`, `social_accounts`, `scheduled_posts`, `comments`, `replies`, `metric_definitions`, `report_snapshots`, `kpis`, `workflows`, `workflow_logs`, `agent_tasks`
- Dashboard: `automation_settings`

Notable gaps: `orders` has no phone column (phone only lives in Shopify, or in `extra_data` if a connector stored it); `Product.extra_data`/`Variant.extra_data` are JSON and mostly empty, so attributes like fabric/color are only in `title`, `description`, `product_type`, `variants.title`.

## API routes

- Auth: `/auth/{signup,login,google,me,send-verification,verify-email,forgot-password,reset-password}`
- Stores: `/api/v1/stores` (+ connect, delete, `/sync*`, `/stats`, `/products`, `/orders`, `/alerts/low-stock`), `/api/v1/auth/{platform}/{authorize-url,start,callback,verify}`, `/webhooks/{shop_name}/{topic}`
- Dashboard: `/api/v1/dashboard/*` (overview, analytics, products, orders, customers, tasks, settings, launch, **`/seed`**)
- Agents: `/api/v1/{content,scheduling,analytics,orchestrator,seo}/*`, comments, customers
- Support: `/api/v1/support/{chat,conversations,handoffs,...}` (JWT required)
- Chatbot widgets: `POST /chatbot/query` (free), `POST /agent/query` (pro) – both route into `CustomerSupportHandler`
- `/health`

## Customer Support Agent (FTE-04) – existing state

`Backend/src/domains/agents/customer_support/`

- `rules.py` – regex/keyword `classify_intent` + `detect_language` (en / urdu script / roman_urdu).
- `handler.py` – keyword-routed handler. Product answers use a token-overlap scan of all store products, then a **Gemini** call (`sdk/llm/client.py`). Order lookup reads the **local** `orders` table. Cart add is a stub that picks the *first variant of the store* and uses a Storefront client that returns fake `mock_checkout` URLs when no token is set. Cart remove/update are "not available". Handoff writes a `handoff_logs` row and publishes a Redis event; nobody is notified.
- There is **no RAG/vector store**; "RAG" means stuffing matched product rows into the prompt.
- The model is Gemini (`LLM_API_KEY` / `GEMINI_API_KEY`); Anthropic is not used anywhere.

## Chat widgets

`Backend/chatbot_free|chatbot_pro/chatbot.{js,css}` (also copied to `frontend/public/`), loaded by `frontend/app/components/ChatbotLoader.tsx`. They require a logged-in merchant JWT and resolve a store owned by that user, so they are merchant-facing, not customer-facing.

## Frontend store

`frontend/app/components/providers/StoreProvider.tsx` – React context holding the merchant's `activeStore` (persisted in `localStorage`) and list of connected stores. `frontend/app/lib/api.ts` is the typed API client. There is **no customer storefront** (no product pages, no cart UI).

## Mock/seed data present in the inherited code

- `domains/auth/seeder.py` (runs at startup) and `POST /api/v1/dashboard/seed` insert hard-coded demo users/stores/products/orders.
- `shopify_storefront_client.py` fakes carts in "dev mode".

These conflict with the "no mock data" requirement and are addressed in the support-agent work.
