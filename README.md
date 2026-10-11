# 🤖 AUTO-FTE (Digital FTE) — Autonomous AI Employee Suite for E-Commerce

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015%20(React%2019)-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20(Python%203.14)-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon%20Serverless%20PostgreSQL-336791?logo=postgresql)](https://neon.tech/)
[![Redis](https://img.shields.io/badge/Event%20Bus-Redis%20Async%20Pub%2FSub-DC382D?logo=redis)](https://redis.io/)
[![Google Gemini](https://img.shields.io/badge/LLM-Gemini%202.5%20Flash-4285F4?logo=google)](https://deepmind.google/technologies/gemini/)
[![Tests](https://img.shields.io/badge/Tests-31%2F31%20Passing%20(100%25)-success)](file:///tests/run_all_tests.py)

---

## 📌 Project Overview

**Project Name:** **AUTO-FTE** (Digital FTE)  
**Tagline:** *E-Commerce Autonomous AI — Autonomous AI Employee Suite for Modern E-Commerce Stores*  
**Core Mission:** Function as an autonomous, multi-agent full-time employee (FTE) managing product catalogs, content generation, social marketing, multi-lingual customer support, and executive revenue forecasting 24/7 without manual intervention.

AUTO-FTE unifies a modern Next.js 15 presentation layer, a high-performance asynchronous FastAPI backend, a multi-agent orchestration engine, persistent serverless Neon PostgreSQL, and third-party e-commerce connectors (Shopify, WooCommerce, BigCommerce, Amazon) into a production-ready autonomous ecosystem.

---

## 🌟 Key Features & Innovations

1. **🤖 7 Specialized AI Employees (Workforce):**
   - Each agent has single responsibility, independent execution, and real-time event bus coordination.
2. **🕒 Configurable Operating Window & Campaign Duration:**
   - Custom **Daily Operating Window** (`09:00` - `23:00` PKT) and **Campaign Date Duration** (`Start Date` to `End Date`) with weekly active days selector (`Mon` to `Sun`).
3. **📊 Live PostgreSQL Store Telemetry:**
   - Real-time ledger connection displaying actual store revenue, verified orders count, low-stock alerts, and catalog health in a hacker-style live execution terminal.
4. **💬 24/7 Trilingual AI Customer Support:**
   - Conversational AI agent answering fluently in **English 🇬🇧, Urdu 🇵🇰, and Roman Urdu 🇵🇰**.
   - Built-in guardrail refusing queries with *"Not Store Connected Yet"* until an active store is connected.
5. **📱 Autonomous Social & Content Pipeline:**
   - Gemini 2.5 Flash copywriter producing viral captions, promotional angles, and automated multi-channel scheduling with merchant human-in-the-loop review queues.
6. **🔌 Connector-Based E-Commerce Integrations:**
   - Official OAuth connectors for Shopify, WooCommerce, BigCommerce, Amazon, and Daraz.

---

## 🏗️ High-Level System Architecture

```
                   Client Layer (Web Browser / Trilingual Chatbot Widget)
                                          │
                                          │ HTTPS / REST (Port 3000)
                                          ▼
                         Frontend Layer — Next.js 15 (React 19)
                                          │
                                          │ REST API + JWT Bearer Auth
                                          ▼
                      Backend Layer — FastAPI / Python 3.14 (Port 8000)
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         Domain Services & Auth                         AI Agent Orchestrator
         (Users, Stores, OAuth)                                   │
                  │                                               ▼
                  │                                     7 Specialized AI Agents
                  │                                               │
         ┌────────┴────────┬──────────────────────┬───────────────┴───────────────┐
         ▼                 ▼                      ▼                               ▼
  Neon PostgreSQL    Redis EventBus        Google Gemini 2.5             E-Commerce Connectors
(Serverless Storage) (Pub/Sub & Queues)   (Copywriting & Sentiment)   (Shopify / WooCommerce / Amazon)
```

---

## 🤖 The 7 Autonomous AI Employees

| Agent Code | Agent Name | Category | Primary Responsibilities |
|---|---|---|---|
| **FTE-01** | **Inventory Sync Agent** | Operations | Real-time stock balance, automated catalog sync, and supplier restock alerts. |
| **FTE-02** | **Content Generation Agent** | Marketing | Gemini 2.5 Flash copywriter for viral captions, promotional copy, and product angles. |
| **FTE-03** | **Content Scheduling Agent** | Marketing | Autonomous queue manager with peak-hour calendar timing and platform adapters. |
| **FTE-04** | **Support & Comments Agent** | Engagement | 24/7 autonomous chatbot & comment replies in English, Urdu, and Roman Urdu. |
| **FTE-05** | **SEO Insights Agent** | Growth | Meta tag auditor, Google Search trend analyzer, and organic keyword optimizer. |
| **FTE-06** | **Analytics & KPI Agent** | Intelligence | Continuous revenue forecasting, conversion funnel tracking, and anomaly detection. |
| **FTE-07** | **Collaboration Orchestrator** | Core Engine | Master multi-agent director coordinating dependencies, handoffs, and event bus loops. |

---

## 📁 Repository Directory Structure

```text
Digital-Fte-Startup-main/
├── README.md                      # Master Project Documentation (Single Source of Truth)
├── docker-compose.yml             # Unified Docker Compose (Frontend, Backend, PostgreSQL, Redis)
├── START_DOCKER.ps1               # 1-Click full-stack Docker stack launcher script
├── START_LOCAL.ps1                # Local development launcher script (Local Python + Docker DB)
├── Backend/                       # FastAPI Asynchronous REST Backend
│   ├── Dockerfile                 # Backend container definition (Python 3.11-slim)
│   ├── .dockerignore              # Excludes virtual environments and SQLite test db
│   ├── .env                       # Environment configuration (DB, Redis, Secrets, Gemini)
│   ├── requirements.txt           # Python dependencies (FastAPI, SQLAlchemy, asyncpg, etc.)
│   └── src/
│       ├── main.py                # Application entrypoint & CORS/Security middleware
│       ├── dependencies.py        # Dependency injection (DB session, Redis, EventBus)
│       ├── domains/               # Domain-Driven Architecture
│       │   ├── auth/              # JWT Auth, Google OAuth, User models & password hashing
│       │   ├── stores/            # Store connection, sync, and multi-tenant management
│       │   ├── oauth/             # Shopify, WooCommerce, and OAuth callback handlers
│       │   ├── dashboard_api.py   # Overview, analytics, settings, and agent task APIs
│       │   └── agents/            # Individual agent workers & task logic
│       └── sdk/
│           ├── database.py        # Neon PostgreSQL async engine & schema auto-migrations
│           ├── event_bus.py       # Redis async Pub/Sub event bus
│           └── models/            # SQLAlchemy ORM models (Base, Store, Order, Product, Settings)
├── frontend/                      # Next.js 15 App Router Frontend
│   ├── Dockerfile                 # Multi-stage production container definition (Node 20-alpine)
│   ├── .dockerignore              # Excludes node_modules, .next, and local env files
│   ├── package.json               # Node dependencies (Next 15, React 19, Lucide, Tailwind)
│   ├── .env.local                 # Frontend environment variables (API URL, Google Client ID)
│   ├── public/                    # Static assets, branding, and robot animations
│   │   └── images/                # Brand logos and 3D digital robot launcher assets
│   └── app/
│       ├── layout.tsx             # Root layout with AuthProvider, Toast, & ChatbotLoader
│       ├── globals.css            # Tailwind CSS 4 styles, theme variables & animations
│       ├── lib/
│       │   ├── api.ts             # Central typed API client communicating with backend
│       │   └── branding.ts        # Centralized branding configuration (AUTO-FTE)
│       └── dashboard/             # Protected Merchant Dashboard
│           ├── overview/          # Executive dashboard with revenue & conversion cards
│           ├── agents/            # 7-Agent Interactive Command Center & Hacker Terminal
│           ├── products/          # Product catalog, stock levels, and SEO audit panel
│           ├── social/            # Social Manager review queue & instant publishing
│           ├── settings/          # Autopilot Operating Window & Duration Schedule
│           ├── analytics/         # Deep revenue ledger & sales forecasting
│           └── customers/         # Customer database & sentiment history
└── tests/                         # Comprehensive Enterprise Test Suite
    ├── run_all_tests.py           # Automated test runner across all 6 phases
    ├── phase1_security_auth/      # JWT, password security, and auth bridge tests
    ├── phase2_stores_oauth/       # Multi-tenant store connection & isolation tests
    ├── phase3_modals_ai/          # Chatbot & Gemini generation safety tests
    ├── phase4_analytics/          # PostgreSQL aggregation & dynamic KPI tests
    ├── phase5_agents_guardrails/  # Agent telemetry & guardrail tests
    └── phase6_new_user_isolation/ # Clean-state zero data tests for fresh users
```

---

## 🚀 Quickstart & Setup Options

### 🐳 Option A: 1-Click Full Stack with Docker (Recommended)

Run the entire ecosystem (**Frontend + Backend + PostgreSQL + Redis**) with a single command from the project root:

```bash
# Start all 4 containers with live build:
docker compose up --build

# Or run in detached background mode:
docker compose up -d --build
```

**Alternatively, use the PowerShell shortcut:**
```powershell
.\START_DOCKER.ps1
```

**Services launched:**
- 🖥️ **Frontend (Next.js 15):** [http://localhost:3000](http://localhost:3000)
- ⚡ **Backend API (FastAPI):** [http://localhost:8000](http://localhost:8000)
- 📖 **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- 🐘 **PostgreSQL 16:** `localhost:5434` (internal container port `5432`)
- 🔴 **Redis 7 Event Bus:** `localhost:6380` (internal container port `6379`)

> [!TIP]
> If you prefer developing the frontend locally with instant hot-reload, start only the core services:
> ```bash
> docker compose up --build backend postgres redis
> ```

---

### 💻 Option B: Manual Local Setup

### 1. Prerequisites
- **Node.js** >= 18.17.0
- **Python** >= 3.10 (Tested on Python 3.14)
- **Git**
- Active **PostgreSQL** instance (or free serverless tier on [Neon.tech](https://neon.tech/))
- **Redis** server (Local or cloud Redis)

---

### 2. Backend Setup (FastAPI)

1. Open a terminal and navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your `.env` file inside `Backend/`:
   ```env
   ENV="development"
   DEBUG=True
   DATABASE_URL="postgresql+asyncpg://<user>:<password>@<host>/<dbname>?ssl=require"
   REDIS_URL="redis://localhost:6379/0"
   SECRET_KEY="your-super-secret-jwt-key-32-chars-minimum"
   LLM_API_KEY="your-google-gemini-api-key"
   ```
5. Launch the backend server:
   ```bash
   python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
   ```
6. Verify backend health:
   - **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
   - **Interactive API Docs (Swagger):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3. Frontend Setup (Next.js 15)

1. Open a separate terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_CHATBOT_PLAN=free
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Running the Enterprise Test Suite

AUTO-FTE includes an automated enterprise test suite covering all 6 phases:

```bash
# From the root directory:
python tests/run_all_tests.py
```

### Verified Test Results:
```text
========================================================================
 MASTER TEST SUITE EXECUTION SUMMARY
========================================================================
Phase                                      | Status   | Passed | Time  
------------------------------------------------------------------------
Phase 1: Security & Auth Bridge            | PASS     | 8      | 3.59s
Phase 2: Stores & OAuth                    | PASS     | 2      | 3.63s
Phase 3: AI Modals & Scheduling            | PASS     | 6      | 7.28s
Phase 4: Dynamic Analytics Engine          | PASS     | 4      | 3.29s
Phase 5: Agent Guardrails & Telemetry      | PASS     | 6      | 3.29s
Phase 6: New User Clean State & Store OAuth | PASS     | 5      | 4.76s
------------------------------------------------------------------------
TOTAL                                      | PASSED   | 31     | 25.85s
========================================================================
Overall Evaluation Verdict: ALL TESTS PASSED (Target 9.5+/10 Verified)
```

---

## 🔐 Environment Variables Reference

### Backend (`Backend/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://user:pass@host/db` |
| `REDIS_URL` | Redis instance for event bus | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT signing secret | 32+ character random string |
| `LLM_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `LLM_MODEL` | Gemini model variant | `gemini-2.0-flash-exp` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000,http://127.0.0.1:3000` |

### Frontend (`frontend/.env.local`)
| Variable | Description | Default / Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |
| `NEXT_PUBLIC_CHATBOT_PLAN` | Chatbot tier | `free` or `pro` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`| Google OAuth Client ID | `your-id.apps.googleusercontent.com` |

---

## 👥 Authors & Credits

- **Project:** **AUTO-FTE (Digital FTE)**
- **Organization:** [AUTO-FTE Inc.](file:///frontend/app/lib/branding.ts)
- **Year:** 2026

---

## 📄 License

This project is licensed under the MIT License.
