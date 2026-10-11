# Project Status & Handoff Document

## 1. Project Overview
- **Project Name:** Multi-Agent Research System
- **Current Milestone:** Pre-Phase 4 Preparation Complete (Gaps Resolved; Ready for Phase 4.1)
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
- **PostgreSQL SSL Mode Normalization:** Updated `backend/src/config/database.js` to normalize `sslmode=require` to `sslmode=verify-full`, resolving `pg-connection-string` deprecation warnings while ensuring strict TLS certificate validation.

---

## 3. Current Architecture & File Structure

```
multi-agent-research-system/
├── ai-service/                # Python 3.11 / FastAPI service
│   ├── .venv/                 # Virtual environment
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py            # FastAPI entry point
│   ├── tests/
│   │   └── test_health.py     # Health endpoint tests
│   ├── pyproject.toml         # Pytest & Ruff configuration
│   └── requirements.txt       # Dependencies (FastAPI, LangGraph, etc.)
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

---

## 6. Verification Commands & Results

| Test Suite | Command | Result |
| :--- | :--- | :--- |
| Backend Lint | `npm run lint` (in `backend/`) | Passed (0 errors) |
| Backend Unit + Integration | `npm run test` (in `backend/`) | Passed (7/7 tests passed) |
| Backend Integration | `npm run test:integration` (in `backend/`) | Passed (3/3 test files passed) |
| AI Service Lint | `.\.venv\Scripts\ruff check` (in `ai-service/`) | Passed (0 errors) |
| AI Service Tests | `.\.venv\Scripts\pytest` (in `ai-service/`) | Passed (1/1 test passed) |

---

## 7. Next Approved Task
- **Phase 4.1:** Establish Python AI Service Foundation (Pydantic settings configuration, async database connectivity & readiness probe, structured logging, custom error handlers, and integration tests).

---

## 8. Important Architecture Decisions
- **Optimistic Concurrency:** Research runs use an integer `version` field. Updates pass `expected_version` to prevent lost updates in multi-agent or asynchronous worker setups.
- **Database Trigger Guard:** State transitions cannot be bypassed even by direct SQL updates; the database trigger enforces the state machine.
- **PostgreSQL SSL Security:** Node uses `sslmode=verify-full` against Neon to ensure valid TLS CA certificate verification without triggering deprecated libpq compatibility warnings.
- **Strict Separation of Concerns:** Node owns public API access and durable entity persistence. Python owns compute-heavy AI orchestration, document parsing, embeddings, and LangGraph workflow execution.
