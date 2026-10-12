# Technical Interview Notes: Problems Faced, Root Causes & Architectural Solutions

This document chronicles real engineering challenges encountered, debugging processes, trade-offs made, and exact talking points for technical interviews across backend engineering, distributed systems, and AI agent architectures.

---

## 1. Architecture & System Overview

- **Architecture:** Polyglot Microservices Architecture
  - **Node.js (Express 5):** Client-facing REST gateway, authentication/authorization, transaction management, paper discovery aggregation, and state persistence.
  - **Python (FastAPI + LangGraph):** High-throughput asynchronous document processing, PDF extraction, semantic chunking, and multi-agent AI research graph.
  - **PostgreSQL (Neon Serverless):** Relational store with ACID transactions, optimistic concurrency, and trigger-enforced state machine guards.
- **Why Split Node.js and Python?**
  - *Interview Question:* "Why did you use both Node.js and Python instead of building everything in one language?"
  - *Answer:* Node.js offers exceptional I/O throughput, low-latency API handling, and rich ecosystem support for web APIs and streaming. However, Python is the undeniable standard for AI orchestration (LangGraph, PyMuPDF, vector operations, LLM tooling). Putting heavy CPU-bound document parsing and AI graph traversal in a Node process would block its single-threaded event loop, while writing API gateways in Python often lacks the lightweight async concurrency ergonomics of Node for CRUD APIs. The boundary is cleanly delineated: Node owns public entities, Python owns AI compute.

---

## 2. Problems Faced & Solutions Log

### Challenge 1: Silent Connection Drops & PostgreSQL SSL Modes with Neon Cloud
- **Context:** Neon is an autoscaling, multi-tenant cloud PostgreSQL provider requiring encrypted TLS connections (`sslmode=require`).
- **Symptom:** In Node's `pg` driver, `sslmode=require` triggered noisy security deprecation warnings about treating `require` as `verify-full`. When we attempted to programmatically rewrite `sslmode=require` to `sslmode=verify-full`, connection attempts to Neon's pooled endpoint (`ep-...-pooler.c-7.aws.neon.tech`) timed out or were dropped.
- **Root Cause:** Neon's PgBouncer pooler terminates TLS at the proxy boundary with dynamic certificates. Enforcing strict local client CA verification (`verify-full`) without bundled custom root CAs failed SSL handshakes across cloud NAT.
- **Solution:** Maintained standard `sslmode=require` with `rejectUnauthorized: false` or direct connection string parsing without URL object re-encoding.
- **Interview Key Point:** Cloud-native serverless poolers often use SNI and proxy termination that require careful handling of TLS modes rather than naive client-side URL mutation.

---

### Challenge 2: Cross-Service Port Collisions in Shared Monorepo Configurations
- **Context:** Both the Node backend and Python AI service run in local development and share environment configurations.
- **Symptom:** Node defaulted to `PORT=5000`. When Python's Pydantic Settings read `.env`, it also picked up `PORT=5000`, attempting to bind to the same port as the backend.
- **Root Cause:** A single shared `PORT` key across multiple microservices without service namespacing.
- **Solution:** In Python's Pydantic `Settings`, defined an `effective_port` property that prioritizes `AI_PORT` (default 8000) over the generic `PORT` variable, enabling clean coexistence whether sharing a `.env` or running isolated.
- **Interview Key Point:** 12-factor configuration must anticipate multi-service monorepos by applying namespaced environment overrides while maintaining fallback defaults.

---

### Challenge 3: Async Event Loop Starvation vs. Native Async PostgreSQL
- **Context:** The Python AI service needs to query the database to verify health and persist passage vectors.
- **Symptom:** Traditional Python database adapters like `psycopg2` are synchronous and block the Python asyncio event loop during network I/O.
- **Root Cause:** In FastAPI, running blocking I/O calls directly in `async def` endpoints halts the single thread running the asyncio loop, stalling all other concurrent HTTP requests.
- **Solution:** Used `asyncpg`, a high-performance native asynchronous PostgreSQL driver written in Cython that hooks directly into the asyncio event loop.
- **Interview Key Point:** Always distinguish between CPU-bound tasks (use background worker processes or thread pools) and IO-bound tasks (use non-blocking async drivers like `asyncpg`).

---

### Challenge 4: Deprecated Lifespan Hooks in Modern FastAPI
- **Context:** Initializing and tearing down the database connection pool on service boot and termination.
- **Symptom:** FastAPI's classic `@app.on_event("startup")` and `@app.on_event("shutdown")` emit deprecation warnings in newer versions.
- **Root Cause:** Starlette and FastAPI migrated to the ASGI standard `@asynccontextmanager` `lifespan(app)` protocol.
- **Solution:** Re-architected application initialization using Python's `contextlib.asynccontextmanager`, initializing `asyncpg` connection pools before `yield` and guaranteeing connection pool drainage in the `finally` block on shutdown.
- **Interview Key Point:** Modern Python frameworks use context managers for lifecycle management to ensure clean resource cleanup even during uncaught startup exceptions.

---

### Challenge 5: Preventing Race Conditions in Research Run State Transitions
- **Context:** Long-running research workflows transition through states: `pending` -> `running` -> `completed` / `failed` / `cancelled`.
- **Symptom:** If multiple background workers or API calls attempted to update a run simultaneously, race conditions could cause invalid status jumps (e.g., from `cancelled` directly to `completed`).
- **Root Cause:** Application-level validations alone are vulnerable to race conditions under high concurrency if not locked or atomically guarded.
- **Solution:**
  1. **Optimistic Concurrency:** Added a `version` column to `research_runs` where updates require `expected_version` (`WHERE id = $1 AND version = $2`).
  2. **Database Trigger Guard:** Added a PostgreSQL PL/pgSQL trigger function `enforce_research_run_status_transition()` that rejects invalid status transitions directly in the database engine, even if bypassed in application code.
- **Interview Key Point:** Defense in depth: implement business validation at the API layer, but enforce invariant state machines at the database level with triggers and optimistic concurrency control.

---

### Challenge 6: Paper Deduplication across Multiple Providers
- **Context:** Searching across arXiv and Semantic Scholar returns duplicate papers with slightly different title casings, author lists, or missing DOIs.
- **Symptom:** Duplicate paper records pollute the database and lead to redundant PDF downloads and passage embeddings.
- **Root Cause:** Heterogeneous schemas across academic APIs without a unified deduplication strategy.
- **Solution:**
  - Designed a multi-tier deduplication key:
    1. Primary match on normalized DOI (`doi.toLowerCase().trim()`).
    2. Secondary match on `(source, source_id)` composite index.
    3. Tertiary match on title fingerprinting.
  - Wrapped insertion in database transactions with `ON CONFLICT DO UPDATE` or pre-lookup deduplication.
- **Interview Key Point:** In data ingestion pipelines, canonical deduplication keys must be established before running costly downstream processing (like embedding generation or LLM synthesis).

---

### Challenge 7: Safe PDF Streaming vs. Malicious / Giant Payloads
- **Context:** Downloading academic papers from arbitrary external URLs.
- **Symptom:** Vulnerability to Denial-of-Service via "zip bombs", memory exhaustion from huge files, or infinite HTTP streams.
- **Root Cause:** Using naive `requests.get()` buffers the entire file into RAM before checking size.
- **Solution:**
  - Implemented streaming chunked downloads using `httpx.stream()`.
  - Check `Content-Length` header upfront against a strict limit (e.g., 25 MB).
  - Enforce byte-counter tracking on each chunk during streaming: immediately abort if cumulative bytes exceed the limit, regardless of fake `Content-Length` headers.
  - In-memory parsing with `pymupdf` (PyMuPDF) avoids creating temporary files on disk that require cleanup or disk quota monitoring.
- **Interview Key Point:** Never trust external `Content-Length` headers. Always enforce streaming bounds with hard chunk-level limits to prevent memory exhaustion attacks.

---

### Challenge 8: Database Check Constraint Invariants & Cross-Service Vocabulary Drift
- **Context:** Persisting multi-agent fact-checking and evidence links in PostgreSQL `claim_evidence`.
- **Symptom:** Database inserts threw `violates check constraint "claim_evidence_support_type_check"` with HTTP 502.
- **Root Cause:** The database migration enforced `CHECK (support_type IN ('supporting', 'contradicting', 'contextual'))`. The AI service agent graph originally used synonyms (`supports`, `contextualizes`, `refutes`).
- **Solution:**
  - Standardized the LangGraph critic agent's taxonomy to canonical values (`supporting`, `contextual`, `contradicting`).
  - Implemented defensive normalization in the backend service layer mapping any legacy synonyms to canonical values before database transactions execute.
- **Interview Key Point:** *Defense-in-depth and schema invariants.* Relational check constraints act as safety nets preventing AI hallucinations or vocabulary drift from silently corrupting persistent domain data.

---

### Challenge 9: Connection Pool Exhaustion from Concurrent Test Runners on Serverless DBs
- **Context:** Running integration tests against Neon PostgreSQL using Node's native test runner (`node --test`).
- **Symptom:** Test runs with multiple test files failed with `Connection terminated due to connection timeout` / `Connection terminated unexpectedly`.
- **Root Cause:** By default, Node 22/24 runs test files in parallel child processes. Each child spawned a `pg.Pool` instance. Multiple parallel processes overwhelmed the serverless pooler connection limits simultaneously.
- **Solution:** Configured `--test-concurrency=1` in `package.json` for integration test execution, guaranteeing sequential execution across test files while preserving fast local execution.
- **Interview Key Point:** Serverless database poolers (like PgBouncer on Neon or AWS Aurora) have strict concurrent handshake and client limits. Test harnesses must throttle client concurrency to reflect realistic operational capacity.

---

### Challenge 10: Multi-Line Block Heading Extraction in PDF Parsing
- **Context:** PyMuPDF extracts text in spatial layout "blocks".
- **Symptom:** Entire abstract or introduction paragraphs were skipped during extraction.
- **Root Cause:** When PyMuPDF merged the section heading ("Abstract") and the first paragraph into a single spatial block, an initial regex heading check matched the first line and skipped the entire block via `continue`.
- **Solution:** Refactored the extractor to inspect the first line, update the active section context, and preserve subsequent lines in the block as valid body paragraphs.
- **Interview Key Point:** Spatial document blocks often bundle heterogeneous elements (headings + body). Parsing must split line boundaries before classifying block roles.

