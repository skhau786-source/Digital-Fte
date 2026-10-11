# ⚡ AUTO-FTE — Backend API & Multi-Agent Orchestrator

High-performance asynchronous backend powering **AUTO-FTE** (Digital FTE), built with **FastAPI**, **Python 3.14**, **SQLAlchemy**, **Neon Serverless PostgreSQL**, **Redis Pub/Sub**, and **Google Gemini 2.5 Flash**.

---

## 🚀 Running Locally

```bash
cd Backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

- API Base: `http://127.0.0.1:8000`
- Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 🧪 Automated Testing

```bash
# Run the 31-test master suite from project root:
python tests/run_all_tests.py
```
*All 31 tests passing across 6 phases.*
