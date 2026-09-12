# Architecture & Design Decisions

This doc explains the *why* behind the structure, for anyone reviewing the
codebase rather than just running it.

## One orchestrator, three entry points

`src/pipelines/pipeline.py::run_research_pipeline` is the single source of
truth for the search → read → write → critique flow. `app.py` (Streamlit),
`main.py` (CLI), and `src/api.py` (FastAPI) are thin adapters around it —
none of them contain business logic, they only translate between their
transport (HTTP request, CLI args, Streamlit widgets) and the pipeline's
plain-Python interface. This means a bug fix or new pipeline stage only
needs to be written once, and each surface stays trivially testable in
isolation from the others.

## Why agents for search/read but plain chains for write/critique

`build_search_agent` and `build_reader_agent` wrap a single tool each behind
`create_agent` — this buys us the LLM's native tool-calling loop (retry a
different query if the first search is thin, follow up on a scrape failure)
without hand-rolling that control flow.

The writer and critic stages don't need that: they're a single
prompt → single completion transformation with no tool calls, so they're
implemented as plain LCEL chains (`prompt | llm | parser`). This is
deliberately the simplest thing that works — an agent loop here would add
latency and non-determinism for no benefit. The critic in particular uses
`with_structured_output(CriticFeedback)` instead of a free-text agent reply,
because a numeric score gating downstream logic (e.g. "retry the writer if
score < 6") needs to be a typed field, not a regex match on prose.

## Why the reader scrapes concurrently but the pipeline stages run sequentially

Search → Read → Write → Critique is a real dependency chain — the writer
needs scraped content, the critic needs the report — so those four stages
run in sequence. But *within* the read stage, N source URLs are independent
of each other, so `_scrape_sources_concurrently` fans them out across a
`ThreadPoolExecutor` instead of scraping one at a time. This is the one
place in the pipeline where parallelism is free (no shared state, no
ordering requirement) and skipping it would make wall-clock time scale
linearly with `SCRAPE_MAX_URLS` for no reason.

## Why a cache + rate limiter live in `utils`, not wrapped around the LLM

`TTLCache` and `RateLimiter` sit in front of the *search and scrape* tools
(`src/tools/tools.py`), not the LLM calls. Search/scrape hit third-party
APIs and websites with their own rate limits and per-call cost, and the same
query or URL is likely to repeat across runs during development — caching
there has an immediate, visible payoff. LLM calls already get retry-on-
failure via `tenacity`, but are intentionally not cached, since research
reports are expected to vary run-to-run.

## Why the API offloads the pipeline to a thread pool

`run_research_pipeline` is synchronous and network-bound (search API,
scraping, multiple LLM calls). Calling it directly from an `async def`
FastAPI route would block the single event loop for the full duration of a
request — including health checks for other in-flight requests. Wrapping it
in `run_in_threadpool` keeps the event loop free to serve concurrent
requests while the blocking work happens on a worker thread. This is a
deliberately simple concurrency model (thread pool, not a task queue) that's
appropriate for a low-to-moderate request volume; a queue + worker service
(Celery/RQ, or a durable workflow engine) would be the next step if this
needed to handle bursty or long-running traffic at scale.

## Why the Docker image is multi-stage

`lxml`/`trafilatura` need `build-essential`, `libxml2-dev`, and
`libxslt1-dev` to *compile* their wheels, but the compiled `.so` files only
need the non-dev runtime libraries (`libxml2`, `libxslt1.1`) to *run*. The
builder stage compiles wheels; the runtime stage installs from those wheels
without ever installing a compiler. This meaningfully shrinks the shipped
image and its attack surface, at no cost to build reproducibility.

## What's intentionally out of scope

- **Persistence / job history** — every run is stateless and in-memory.
  Adding a datastore (Postgres, Redis) for run history or async job status
  would be the natural next step for a multi-user deployment.
- **Auth** — the API has no authentication layer; it's designed to sit
  behind a gateway or be deployed to a trusted network, not exposed
  directly to the public internet as-is.
- **Streaming responses** — `/research` returns the full result once the
  pipeline completes rather than streaming intermediate agent output over
  SSE/WebSocket. The Streamlit UI gets a similar effect via the `on_step`
  callback, but the API is currently request/response only.
