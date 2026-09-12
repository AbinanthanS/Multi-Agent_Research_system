"""
Lightweight in-process TTL cache and token-bucket rate limiter.

Kept dependency-free and thread-safe so it works the same in the Streamlit
UI (multi-session) and the CLI. For a multi-instance deployment, swap
`TTLCache`'s backing dict for Redis without changing call sites.
"""
from __future__ import annotations

import threading
import time
from collections.abc import Callable, Hashable
from typing import Any


class TTLCache:
    def __init__(self, ttl_seconds: int = 3600, max_size: int = 512) -> None:
        self._ttl = ttl_seconds
        self._max_size = max_size
        self._store: dict[Hashable, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: Hashable) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: Hashable, value: Any) -> None:
        with self._lock:
            if len(self._store) >= self._max_size:
                oldest_key = min(self._store, key=lambda k: self._store[k][0])
                del self._store[oldest_key]
            self._store[key] = (time.monotonic() + self._ttl, value)

    def cached_call(self, key: Hashable, fn: Callable[[], Any]) -> Any:
        """Return cached value for `key`, else compute via `fn`, cache, and return it."""
        hit = self.get(key)
        if hit is not None:
            return hit
        value = fn()
        self.set(key, value)
        return value


class RateLimiter:
    """Simple token-bucket limiter: blocks the caller until a slot frees up."""

    def __init__(self, calls_per_minute: int = 30) -> None:
        self._min_interval = 60.0 / max(calls_per_minute, 1)
        self._lock = threading.Lock()
        self._last_call = 0.0

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            wait = self._last_call + self._min_interval - now
            if wait > 0:
                time.sleep(wait)
            self._last_call = time.monotonic()
