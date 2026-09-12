# Multi-Agent Research System

A production-hardened multi-agent research pipeline built with LangChain. Four
specialized agents/chains — **Search**, **Reader**, **Writer**, **Critic** —
collaborate to research a topic, extract source content, draft a structured
report, and score its quality, end to end in one run. Exposed three ways:
a **Streamlit UI**, a **CLI**, and a **FastAPI HTTP service**, all backed by
the same orchestrator.

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](.github/workflows/ci.yml)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why this is production-grade, not a notebook demo

| Concern | Original prototype | This version |
|---|---|---|
| Config | `os.getenv` scattered around | `pydantic-settings`, validated, fails fast on boot |
| Reliability | No retries; one bad HTTP call crashes the run | `tenacity` exponential-backoff retries on LLM + HTTP calls |
| Latency | Reader scraped **1** URL, sequentially | Scrapes top *N* sources **concurrently** (`ThreadPoolExecutor`) |
| Cost control | Every call hits paid APIs | TTL cache + token-bucket rate limiter on search/scrape |
| Critic output | Free-text `"Score: X/10"` parsed by hope | `with_structured_output` → typed `CriticFeedback` Pydantic model |
| Observability | `print()` statements | Structured logging (plain or single-line JSON), per-request correlation IDs on the API |
| Failure modes | Unhandled exceptions bubble to the UI | Typed `PipelineError`, per-stage `try/except`, mapped to proper HTTP status codes on the API |
| Interfaces | Notebook cell only | Streamlit UI + CLI + FastAPI HTTP service, all sharing one orchestrator |
| Testing | None | 27 unit tests, mocked network I/O, 88%+ coverage, CI-gated at 80% |
| Type safety | Untyped | mypy-clean (`pydantic.mypy` plugin), enforced in CI (not advisory) |
| Packaging | `pip install` only | Multi-stage `Dockerfile` (no compilers in the runtime image), `docker-compose.yml` with UI + API services, non-root container, healthchecks |
| CI/CD | None | GitHub Actions: lint → type-check → test+coverage gate → Docker build |

---

## Architecture

```
┌───────────────┐   ┌───────────────┐   ┌────────────────────┐
│ Streamlit UI  │   │  CLI (main.py)│   │ FastAPI (src/api.py)│
│   (app.py)    │   │                │   │  /research /health  │
└───────┬───────┘   └───────┬────────┘   └──────────┬──────────┘
        │  on_step(step, status) progress callback   │
        └──────────────────┬───────────────────────--┘
┌───────────────────────────▼──────────────────────────┐
│      Pipeline Orchestrator (src/pipelines)            │
│  • per-stage error handling → typed PipelineError     │
│  • concurrent multi-source scraping                   │
└──────┬──────────┬───────────┬───────────┬─────────────┘
       │          │           │           │
   ┌───▼───┐  ┌───▼────┐  ┌───▼────┐  ┌───▼────┐
   │Search │  │ Reader │  │ Writer │  │ Critic │
   │Agent  │  │(concur │  │ Chain  │  │ Chain  │
   │(Tavily│  │rent    │  │        │  │(struct │
   │)      │  │scrape) │  │        │  │ output)│
   └───┬───┘  └───┬────┘  └────────┘  └────────┘
       │          │
   ┌───▼──────────▼───┐
   │  Tools Layer      │
   │  retry + cache +  │
   │  rate limit       │
   └───────────────────┘
```

## Tech stack

LangChain 1.x · OpenAI GPT-4o-mini · Tavily Search API · Streamlit · FastAPI +
uvicorn · Pydantic v2 · tenacity (retries) · trafilatura / readability-lxml /
BeautifulSoup (content extraction) · pytest + pytest-cov · ruff + mypy · Docker
(multi-stage)

---

## Quickstart

### 1. Configure secrets
```bash
cp .env.example .env
# fill in OPENAI_API_KEY and TAVILY_API_KEY
```

### 2. Run locally
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

streamlit run app.py                              # web UI  → http://localhost:8501
# or
uvicorn src.api:app --reload --port 8000           # HTTP API → http://localhost:8000/docs
# or
python main.py "Future of LLM agents in 2026" --out report.md   # CLI
```

### 3. Run with Docker
```bash
docker compose up --build
# UI  → http://localhost:8501
# API → http://localhost:8000/docs
```

### 4. Run the test suite
```bash
pip install -r requirements-dev.txt
pytest --cov=src --cov-report=term-missing
ruff check .
mypy src --ignore-missing-imports
```

Or via `make`: `make install-dev`, `make test`, `make lint`, `make run`,
`make api`, `make docker-up`.

---

## HTTP API

Three endpoints, documented interactively at `/docs` (Swagger) once the
service is running:

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/health`   | Liveness probe — process is up |
| `GET`  | `/ready`    | Readiness probe — config/secrets loaded successfully |
| `POST` | `/research` | Runs the full pipeline; returns a `ResearchResult` JSON payload |

```bash
curl -X POST http://localhost:8000/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "Roadmap for AGI development in the next 5 years"}'
```

The pipeline is blocking/network-bound, so the endpoint offloads it to a
worker thread (`run_in_threadpool`) rather than blocking the event loop —
concurrent requests and health checks stay responsive. `PipelineError`s map
to `502`, invalid payloads to `422`; every response carries an
`x-request-id` header for log correlation.

---

## Configuration

All runtime behaviour is controlled via environment variables (see
`.env.example`), validated on startup by `src/config.py` — invalid values
(e.g. temperature out of range, bad log level) fail immediately with a clear
error instead of surfacing as a confusing downstream bug.

Key knobs: `LLM_MODEL`, `LLM_TIMEOUT_SECONDS`, `SCRAPE_MAX_URLS`,
`CACHE_TTL_SECONDS`, `RATE_LIMIT_CALLS_PER_MINUTE`, `LOG_JSON`.

---

## Project structure

```
.
├── app.py                      # Streamlit UI (progress-aware, error-aware)
├── main.py                     # CLI entry point (argparse, file output)
├── src/
│   ├── api.py                    # FastAPI service (/research, /health, /ready)
│   ├── config.py                 # validated settings (pydantic-settings)
│   ├── schemas.py                # typed contracts (ResearchResult, CriticFeedback)
│   ├── agents/agents.py          # search/reader agents, writer/critic chains
│   ├── tools/tools.py            # web_search, scrape_url — retry+cache+rate-limit
│   ├── pipelines/pipeline.py     # orchestration, concurrent scraping, error handling
│   └── utils/
│       ├── logger.py             # structured logging setup
│       └── caching.py            # TTLCache, RateLimiter
├── tests/                        # pytest suite, mocked network calls (incl. API)
├── Dockerfile                    # multi-stage build (builder → slim runtime)
├── docker-compose.yml            # research-ui + research-api services
├── .pre-commit-config.yaml       # ruff + mypy hooks, run before every commit
└── .github/workflows/ci.yml      # lint → type-check → test+coverage → docker build
```

---

## Development workflow

```bash
pip install -r requirements-dev.txt
pre-commit install     # optional but recommended: mirrors CI checks locally
```

CI (`.github/workflows/ci.yml`) runs on every push/PR against Python 3.11 and
3.12: `ruff check .` → `mypy src --ignore-missing-imports` → `pytest
--cov=src --cov-fail-under=80` → a Docker build sanity check. All four gates
are required, not advisory.

---

## License

MIT — see [LICENSE](LICENSE).
