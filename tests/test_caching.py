import time

from src.utils.caching import RateLimiter, TTLCache


def test_ttl_cache_hit_and_miss():
    cache = TTLCache(ttl_seconds=60)
    calls = {"n": 0}

    def compute():
        calls["n"] += 1
        return "value"

    assert cache.cached_call("k", compute) == "value"
    assert cache.cached_call("k", compute) == "value"
    assert calls["n"] == 1  # second call was served from cache


def test_ttl_cache_expiry():
    cache = TTLCache(ttl_seconds=0.05)
    cache.set("k", "v1")
    assert cache.get("k") == "v1"
    time.sleep(0.1)
    assert cache.get("k") is None


def test_ttl_cache_evicts_when_full():
    cache = TTLCache(ttl_seconds=60, max_size=2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    assert len(cache._store) == 2


def test_rate_limiter_enforces_min_interval():
    limiter = RateLimiter(calls_per_minute=600)  # 0.1s between calls
    start = time.monotonic()
    limiter.acquire()
    limiter.acquire()
    elapsed = time.monotonic() - start
    assert elapsed >= 0.09
