# Project Status & Handoff Document

## 1. Project Overview
- **Project Name:** Multi-Agent Research System
- **Current Milestone:** Phase 4.1 Complete (AI Service Foundation, Async Database Pool & Readiness Probe)
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

### Pre-Phase 4 Gap Resolution
- **Pytest PYTHONPATH Fix:** Configured `pythonpath = ["."]` in `ai-service/pyproject.toml` so `pytest` executes directly from the virtual environment without module import errors.
- **Repository Documentation:** Added comprehensive root `README.md` and `docs/PROJECT_STATUS.md`.

### Phase 4.1: Python AI Service Foundation
- **Configuration Management (`app/core/config.py`):**
  - Built typed Pydantic `Settings` reading from environment variables and `.env` / `backend/.env`.
  - Added support for `AI_PORT` and `PORT` with `effective_port` property (defaulting to 8000) to prevent port collisions with the Node backend.
  - Implemented `effective_database_url` handling `TEST_DATABASE_URL` during test execution.
  - Configured download size limits, timeouts, and connection pool parameters.
- **Structured Logging (`app/core/logging.py`):**
  - Standardized JSON-like structured logging format across the AI service with timestamp, logger name, log level, and message.
- **Centralized Error Handling (`app/core/errors.py`):**
  - Established `AppException` base exception with HTTP status codes and specific subclasses (`BadRequestError`, `NotFoundError`, `ConflictError`, `ServiceUnavailableError`).
  - Implemented FastAPI exception handlers for `AppException`, Pydantic's `RequestValidationError` (422), and unhandled standard exceptions (500) with safe error redaction in production.
- **Async Database Connection Pool (`app/core/database.py`):**
  - Implemented asynchronous PostgreSQL pooling using `asyncpg` (`init_db_pool()`, `close_db_pool()`, `get_db_pool()`).
  - Added `check_database_connection()` executing `SELECT 1` with configurable timeouts for readiness verification.
- **FastAPI Lifespan Management & Health Endpoints (`app/main.py`, `app/schemas/health.py`):**
  - Replaced deprecated startup/shutdown events with modern async `lifespan` context manager.
  - Implemented `GET /health` (liveness probe) returning `{"status": "ok"}`.
  - Implemented `GET /ready` and `GET /health/ready` (readiness probes) returning service status and database connectivity status. Returns HTTP 503 if the database is unreachable.
- **Test Suite Expansion:**
  - Added 12 comprehensive unit and integration tests (`test_config.py`, `test_health.py`, `test_ready.py`, `test_errors.py`).

---

## 3. Current Architecture & File Structure

```
multi-agent-research-system/
├── ai-service/                # Python 3.11 / FastAPI service
│   ├── .venv/                 # Virtual environment
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI entry point & lifespan
│   │   ├── core/              # Foundational utilities
│   │   │   ├── __init__.py
│   │   │   ├── config.py      # Pydantic Settings
│   │   │   ├── database.py    # asyncpg connection pool & probe
│   │   │   ├── errors.py      # Custom exceptions & handlers
│   │   │   └── logging.py     # Structured logging
│   │   └── schemas/           # Pydantic request/response schemas
│   │       ├── __init__.py
│   │       └── health.py      # Health & readiness schemas
│   ├── tests/
│   │   ├── test_config.py     # Settings validation tests
│   │   ├── test_errors.py     # Centralized error handler tests
│   │   ├── test_health.py     # Health endpoint tests
│   │   └── test_ready.py      # Readiness probe tests (mock & live)
│   ├── pyproject.toml         # Pytest & Ruff configuration
│   └── requirements.txt       # Dependencies (FastAPI, asyncpg, LangGraph, etc.)
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
    └── PROJECT_STATUS.md      # Persistent status and handoff notes
```

---

## 4. Database Migrations & Schema

1. `1791661135500_initial-schema.js`:
   - `research_runs` (UUID PK, question, status, filters, started_at, completed_at, error_message, timestamps)
   - `papers` (UUID PK, source, source_id, doi, title, abstract, authors, published_year, url, pdf_url, metadata, timestamps)
   - `research_run_papers` (composite PK: `run_id`, `paper_id`, relevance_score, discovery_source, added_at)
   - `paper_passages` (UUID PK, paper_id, passage_index, text, page_number, section, created_at)
   - `claims` (UUID PK, run_id, claim_text, claim_type, confidence, created_at)
   - `claim_evidence` (composite PK: `claim_id`, `passage_id`, support_type, explanation, created_at)
   - `reports` (UUID PK, run_id, version, title, markdown_content, structured_content, created_at)
2. `1791703709439_add-research-run-version.js`:
   - Added `version integer NOT NULL DEFAULT 1` to `research_runs`.
3. `1791706133827_add-status-transition-guard.js`:
   - Pl/pgSQL trigger function `enforce_research_run_status_transition()` enforcing valid transitions (`pending` -> `running` / `cancelled`; `running` -> `completed` / `failed` / `cancelled`; `failed` / `cancelled` -> `pending`).

---

## 5. API Endpoints

### Backend (`http://localhost:5000`)
- `GET /health`: Liveness probe
- `GET /health/ready`: Readiness probe (verifies DB connection)
- `POST /api/v1/research-runs`: Create new research run
- `GET /api/v1/research-runs`: List research runs (pagination & filters)
- `GET /api/v1/research-runs/:id`: Get research run details
- `PATCH /api/v1/research-runs/:id`: Update run status with optimistic concurrency
- `POST /api/v1/research-runs/:id/papers/discover`: Discover and persist papers for a run

### AI Service (`http://localhost:8000`)
- `GET /health`: Liveness probe
- `GET /ready`: Readiness probe (verifies async database pool connectivity)
- `GET /health/ready`: Readiness probe alias

---

## 6. Verification Commands & Results

| Test Suite | Command | Result |
| :--- | :--- | :--- |
| Backend Lint | `npm run lint` (in `backend/`) | Passed (0 errors) |
| Backend Tests | `npm run test` (in `backend/`) | Passed (7/7 tests passed) |
| AI Service Lint | `.\.venv\Scripts\ruff check` (in `ai-service/`) | Passed (0 errors) |
| AI Service Tests | `.\.venv\Scripts\pytest` (in `ai-service/`) | Passed (12/12 tests passed) |

---

## 7. Next Approved Task
- **Phase 4.2:** Safe PDF Download & Extraction (Streaming downloader with Content-Length + chunk counting limits, timeout guards, PyMuPDF / pymupdf text extractor, section header detection, and unit tests).

---

## 8. Important Architecture Decisions
- **Optimistic Concurrency:** Research runs use an integer `version` field. Updates pass `expected_version` to prevent lost updates in multi-agent or asynchronous worker setups.
- **Database Trigger Guard:** State transitions cannot be bypassed even by direct SQL updates; the database trigger enforces the state machine.
- **Async Database Access in AI Service:** Uses `asyncpg` connection pooling for non-blocking database queries in FastAPI without thread pool overhead.
- **Port Isolation:** `effective_port` allows the AI service and Express backend to share root or local `.env` files without port collision.
- **Strict Separation of Concerns:** Node owns public API access, authentication, and durable entity persistence. Python owns compute-heavy AI orchestration, document parsing, embeddings, and LangGraph workflow execution.
