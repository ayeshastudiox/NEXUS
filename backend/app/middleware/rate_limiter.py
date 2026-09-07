import time
import threading
from typing import Dict, List, Tuple
from collections import defaultdict


class RateLimiter:
    """Simple sliding window rate limiter. Thread-safe."""

    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self._max_requests = max_requests
        self._window = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> Tuple[bool, Dict[str, int]]:
        now = time.time()
        with self._lock:
            self._requests[key] = [
                t for t in self._requests[key] if now - t < self._window
            ]
            current = len(self._requests[key])
            remaining = self._max_requests - current
            reset_in = int(self._window - (now - self._requests[key][0])) if self._requests[key] else self._window

            if current >= self._max_requests:
                return False, {
                    "remaining": 0,
                    "limit": self._max_requests,
                    "reset_in": reset_in
                }

            self._requests[key].append(now)
            return True, {
                "remaining": remaining - 1,
                "limit": self._max_requests,
                "reset_in": reset_in
            }


ai_rate_limiter = RateLimiter(max_requests=30, window_seconds=60)
