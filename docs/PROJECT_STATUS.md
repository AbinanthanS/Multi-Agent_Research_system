# Project Status & Handoff Document

## 1. Project Overview
- **Project Name:** Multi-Agent Research System
- **Current Milestone:** Phase 4 & Phase 5 Complete (AI Pipeline, LangGraph Multi-Agent System & End-to-End Orchestration)
- **Repository URL:** `https://github.com/AbinanthanS/Multi-Agent_Research_system.git`
- **Default Branch:** `main`

---

## 2. Completed Milestones

### Phase 1: Foundations & Health Monitoring
- Express 5 backend initialized with ES modules, security headers (`helmet`), CORS, request logging (`morgan`), and centralized error handling.
- Implemented `GET /health` (service availability) and `GET /health/ready` (database connectivity probe with `SELECT 1`).
- Initialized FastAPI Python AI service with basic `GET /health` endpoint.

### Phase 2: Research Runs Domain & Lifecycle
- Created initial database migration with core tables (`research_runs`, `papers`, `research_run_papers`, `paper_passages`, `claims`, `claim_evidence`, `reports`).
- Added optimistic concurrency control (`version` column) and a PostgreSQL trigger guard (`enforce_research_run_status_transition()`) preventing illegal state transitions.
- Built CRUD and state-machine endpoints: `POST /api/v1/research-runs`, `GET /api/v1/research-runs`, `GET /api/v1/research-runs/:id`, and `PATCH /api/v1/research-runs/:id`.

### Phase 3: Paper Discovery & Transactional Persistence
- Built provider adapters for arXiv (XML via `fast-xml-parser`) and Semantic Scholar (REST).
- Implemented paper normalization, deduplication by `(source, source_id)` and `doi`, and linking to runs via `research_run_papers`.
- Implemented transactional rollback ensuring atomic persistence of discovered papers.
- Endpoint: `POST /api/v1/research-runs/:id/papers/discover`.

### Phase 4: Python AI Service & LangGraph Multi-Agent Research Pipeline
- **AI Service Foundation (`app/core/`):**
  - Typed Pydantic Settings supporting `AI_PORT`, `effective_port`, `effective_database_url`, download timeouts, and size caps.
  - Asynchronous PostgreSQL pool with `asyncpg` and health/readiness probes.
  - Centralized domain error hierarchy (`AppException`) and structured logging.
- **Safe PDF Downloader & Extractor (`app/services/pdf_extractor.py`):**
  - Implemented streaming downloader via `httpx.stream()` with pre-flight `Content-Length` checks and chunk-level byte counting enforcing hard payload limits (25 MB).
  - In-memory parsing using `pymupdf` (PyMuPDF) extracting page text, page numbers, and detected section headings.
- **Semantic Chunking (`app/services/chunking.py`):**
  - Overlapping sentence-boundary-preserving text chunker processing abstract text and extracted page blocks into structured passages.
- **LangGraph Multi-Agent Workflow (`app/agents/research_graph.py`):**
  - **Planner Agent:** Decomposes research question into specialized thematic facets.
  - **Extractor Agent:** Scans passages, scores relevance using semantic token overlap, and formulates candidate claims.
  - **Critic / Fact-Checker Agent:** Validates claims against evidence passages, assigns groundedness confidence scores, and classifies support type (`supporting`, `contextual`, `contradicting`).
  - **Synthesizer Agent:** Generates publication-grade Markdown reports with executive summaries, evidence tables, passage citations, and structured JSON output.
- **AI Execution Endpoint (`POST /api/v1/research/execute`):**
  - Asynchronously processes multiple papers concurrently, executes the LangGraph workflow in thread pools without blocking the asyncio loop, and returns structured results.

### Phase 5: End-to-End Backend Orchestration & Persistence
- **Execution Repository (`backend/src/repositories/research-execution.repository.js`):**
  - Atomic persistence of passages (`paper_passages`), claims (`claims`), evidence (`claim_evidence`), and versioned reports (`reports`).
  - Support for multi-version reports and rich queries joining claims with cited passages.
- **Execution Service & Controller (`backend/src/services/research-execution.service.js`):**
  - Orchestrates research lifecycle: transitions run to `running`, calls AI service, executes transactional database insertion, transitions to `completed`, with automatic `failed` error recovery.
  - Enforces database check constraint invariants for `support_type IN ('supporting', 'contradicting', 'contextual')`.
- **New Endpoints:**
  - `POST /api/v1/research-runs/:id/execute`
  - `GET /api/v1/research-runs/:id/report`
  - `GET /api/v1/research-runs/:id/claims`
- **Integration Test Harness:**
  - Configured `--test-concurrency=1` to ensure reliable non-flaky test execution against Neon cloud PostgreSQL.

---

## 3. Current Architecture & File Structure

```
multi-agent-research-system/
├── ai-service/                # Python 3.11 / FastAPI service
│   ├── .venv/                 # Virtual environment
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI entry point & lifespan
│   │   ├── agents/            # LangGraph multi-agent research workflow
│   │   │   ├── __init__.py
│   │   │   └── research_graph.py
│   │   ├── api/               # API routers
│   │   │   ├── __init__.py
│   │   │   └── research.py    # POST /api/v1/research/execute
│   │   ├── core/              # Foundational utilities
│   │   │   ├── __init__.py
│   │   │   ├── config.py      # Pydantic Settings
│   │   │   ├── database.py    # asyncpg connection pool & probe
│   │   │   ├── errors.py      # Custom exceptions & handlers
│   │   │   └── logging.py     # Structured logging
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── health.py      # Health & readiness schemas
│   │   │   └── research.py    # Research execute schemas
│   │   └── services/          # Document processing
│   │       ├── chunking.py    # Text chunking & passage segmentation
│   │       └── pdf_extractor.py # Streaming downloader & PyMuPDF extractor
│   ├── tests/
│   │   ├── test_config.py     # Settings validation tests
│   │   ├── test_errors.py     # Centralized error handler tests
│   │   ├── test_health.py     # Health endpoint tests
│   │   ├── test_pdf_extractor.py # PDF extractor & download tests
│   │   ├── test_ready.py      # Readiness probe tests
│   │   └── test_research_pipeline.py # LangGraph & execute API tests
│   ├── pyproject.toml         # Pytest & Ruff configuration
│   └── requirements.txt       # Dependencies (FastAPI, asyncpg, PyMuPDF, LangGraph)
├── backend/                   # Node.js 24 / Express 5 backend
│   ├── migrations/            # node-pg-migrate schema migrations
│   ├── src/
│   │   ├── config/            # Database pool and Zod environment schemas
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── middleware/        # Error handlers and 404 middleware
│   │   ├── providers/papers/  # arXiv & Semantic Scholar HTTP clients
│   │   ├── repositories/      # SQL query and persistence layer
│   │   ├── routes/            # Express route declarations
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── services/          # Business logic and transaction orchestration
│   │   ├── app.js             # Express app composition
│   │   └── server.js          # HTTP server listener
│   └── tests/                 # Unit, provider, and integration test suites
└── docs/
    ├── INTERVIEW_NOTES.md     # Problems faced, root causes, and interview solutions
    └── PROJECT_STATUS.md      # Persistent status and handoff notes
```

---

## 4. API Endpoints Summary

### Backend (`http://localhost:5000`)
- `GET /health`: Liveness probe
- `GET /health/ready`: Readiness probe (verifies DB connection)
- `POST /api/v1/research-runs`: Create new research run
- `GET /api/v1/research-runs`: List research runs (pagination & filters)
- `GET /api/v1/research-runs/:id`: Get research run details
- `PATCH /api/v1/research-runs/:id`: Update run status with optimistic concurrency
- `POST /api/v1/research-runs/:id/papers/discover`: Discover and persist papers for a run
- `POST /api/v1/research-runs/:id/execute`: Orchestrate full AI pipeline & persist results
- `GET /api/v1/research-runs/:id/report`: Fetch latest synthesized markdown & structured report
- `GET /api/v1/research-runs/:id/claims`: Fetch synthesized claims with linked evidence passages

### AI Service (`http://localhost:8000`)
- `GET /health`: Liveness probe
- `GET /ready`: Readiness probe (verifies async database pool connectivity)
- `GET /health/ready`: Readiness probe alias
- `POST /api/v1/research/execute`: Execute PDF extraction, chunking, and LangGraph multi-agent research graph

---

## 5. Verification Commands & Results

| Test Suite | Command | Result |
| :--- | :--- | :--- |
| Backend Lint | `npm run lint` (in `backend/`) | **Passed** (0 errors) |
| Backend Tests | `npm run test` (in `backend/`) | **Passed** (8/8 tests passed against live DB) |
| AI Service Lint | `.\.venv\Scripts\ruff check` (in `ai-service/`) | **Passed** (0 errors) |
| AI Service Tests | `.\.venv\Scripts\pytest` (in `ai-service/`) | **Passed** (19/19 tests passed) |

---

## 6. Next Milestone
- **Phase 6: Modern Interactive Frontend Web Application** (React + Vite + Vanilla CSS design system, dark mode, run lifecycle dashboard, live status polling, paper discovery explorer, claims & evidence inspector, and interactive Markdown report viewer with citation previews).
