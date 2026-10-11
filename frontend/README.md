# 💻 AUTO-FTE — Frontend Application

Modern merchant dashboard and conversational client for **AUTO-FTE** (Digital FTE), built with **Next.js 15 (React 19)**, **TypeScript**, and **Tailwind CSS**.

---

## 🚀 Running Locally

```bash
cd frontend
npm install
npm run dev
```

App opens at [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Environment Variables

Create `.env.local` in `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CHATBOT_PLAN=free
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

- `NEXT_PUBLIC_API_URL`: Points to the running FastAPI backend (`http://localhost:8000`).
- `NEXT_PUBLIC_CHATBOT_PLAN`: Set to `free` or `pro` for the chatbot widget.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID for single-click merchant authentication.

---

## 🌟 Key Pages & Modules

- `/dashboard/overview` — Executive KPIs, live revenue, orders, and conversion telemetry.
- `/dashboard/agents` — 7-Agent Interactive Command Center, uniform card layout, and live hacker terminal.
- `/dashboard/settings` — Autopilot Operating Window & Campaign Date Duration scheduler.
- `/dashboard/products` — Product catalog, stock alerts, and SEO keyword audit insights.
- `/dashboard/social` — AI-generated content review, scheduling queue, and multi-channel publishing.
- `/dashboard/customers` — Customer sentiment tracking and interaction ledger.

---

## 🏗️ Production Build

```bash
npm run build
npm start
```

Verified with **zero TypeScript errors** and static page pre-rendering.
