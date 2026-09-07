import time
import threading
from typing import Dict, Any, Optional
from datetime import datetime


class RiskCache:
    """In-memory risk cache with TTL. Thread-safe."""

    def __init__(self, ttl_seconds: int = 60):
        self._cache: Dict[int, Dict[str, Any]] = {}
        self._timestamps: Dict[int, float] = {}
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def get(self, shipment_id: int) -> Optional[Dict[str, Any]]:
        with self._lock:
            if shipment_id in self._cache:
                if time.time() - self._timestamps[shipment_id] < self._ttl:
                    return self._cache[shipment_id]
                else:
                    del self._cache[shipment_id]
                    del self._timestamps[shipment_id]
        return None

    def set(self, shipment_id: int, risk_data: Dict[str, Any]):
        with self._lock:
            self._cache[shipment_id] = risk_data
            self._timestamps[shipment_id] = time.time()

    def invalidate(self, shipment_id: int):
        with self._lock:
            self._cache.pop(shipment_id, None)
            self._timestamps.pop(shipment_id, None)

    def invalidate_all(self):
        with self._lock:
            self._cache.clear()
            self._timestamps.clear()

    @property
    def size(self) -> int:
        return len(self._cache)


risk_cache = RiskCache(ttl_seconds=60)
