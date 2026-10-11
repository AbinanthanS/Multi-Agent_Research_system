# Multi-Agent Research System

A scientific literature research assistant that discovers academic papers, extracts full-text passages, retrieves evidence using vector similarity, coordinates specialized AI agents, and synthesizes structured research reports with verifiable citations.

---

## Architecture Overview

```
                      ┌────────────────────────┐
                      │  React Frontend (UI)   │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │  Express 5 Backend     │
                      │  (Node.js 24 + ES6)    │
                      └─────┬────────────┬─────┘
                            │            │
            Durable CRUD    │            │ Dispatches Document &
            & Transactions  │            │ Multi-Agent Tasks
                            ▼            ▼
                 ┌───────────────┐  ┌───────────────────────┐
                 │ Neon Postgres │  │ FastAPI AI Service    │
                 │ (pgvector)    │  │ (Python 3.11)         │
                 └───────▲───────┘  └───────────┬───────────┘
                         │                      │
                         └──────────────────────┘
                          Embeddings & Retrieval
```

- **Backend (`backend/`):** Node.js 24 + Express 5. Handles public REST APIs, paper discovery adapters (arXiv, Semantic Scholar), transaction management, optimistic concurrency control, and relational schema migrations.
- **AI Service (`ai-service/`):** Python 3.11 + FastAPI. Handles PDF download/extraction (PyMuPDF), document chunking, embeddings, pgvector semantic retrieval, and multi-agent workflow orchestration (LangGraph).
- **Database:** PostgreSQL on Neon with `pgvector` for passage embeddings and full-text search.

---

## Repository Structure

```
├── ai-service/          # Python AI Service (FastAPI, PyMuPDF, LangGraph)
│   ├── app/             # Application source code
│   ├── tests/           # Unit and integration test suites
│   ├── pyproject.toml   # Python tooling configuration
│   └── requirements.txt # Python dependencies
├── backend/             # Node.js backend (Express 5, pg)
│   ├── migrations/      # Database migrations (node-pg-migrate)
│   ├── src/             # Application source code
│   └── tests/           # Node test runner suites
└── docs/                # Architectural guides and project status
    └── PROJECT_STATUS.md
```

---

## Getting Started

### Prerequisites
- Node.js 24+
- Python 3.11+
- PostgreSQL database (or Neon account)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env # Configure DATABASE_URL and TEST_DATABASE_URL
npm run db:migrate
npm run dev
```

### AI Service Setup
```bash
cd ai-service
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## Running Tests

### Backend Tests
```bash
cd backend
npm run lint             # ESLint checks
npm run test             # Unit and integration test suite
npm run test:integration # Dedicated database integration tests
```

### AI Service Tests
```bash
cd ai-service
.\.venv\Scripts\ruff check # Ruff linter
.\.venv\Scripts\pytest     # Pytest test suite
```
