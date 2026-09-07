import asyncio
import json
import math
import random
from datetime import datetime
from typing import Dict, List, Set
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.shipment import Shipment
from app.models.enums import ShipmentStatus


class LiveTracker:
    """Manages WebSocket connections and simulated live position updates."""

    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._positions: Dict[str, Dict] = {}
        self._running = False
        self._task = None

    async def connect(self, ws: WebSocket, shipment_ref: str):
        await ws.accept()
        if shipment_ref not in self._connections:
            self._connections[shipment_ref] = set()
        self._connections[shipment_ref].add(ws)

        if shipment_ref in self._positions:
            await ws.send_json({
                "type": "position",
                "shipment_ref": shipment_ref,
                "data": self._positions[shipment_ref]
            })

    def disconnect(self, ws: WebSocket, shipment_ref: str):
        if shipment_ref in self._connections:
            self._connections[shipment_ref].discard(ws)
            if not self._connections[shipment_ref]:
                del self._connections[shipment_ref]

    async def broadcast(self, shipment_ref: str, data: dict):
        if shipment_ref in self._connections:
            dead = []
            for ws in self._connections[shipment_ref]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self._connections[shipment_ref].discard(ws)

    async def start_simulation(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._simulation_loop())

    async def stop_simulation(self):
        self._running = False
        if self._task:
            self._task.cancel()

    async def _simulation_loop(self):
        while self._running:
            try:
                db = SessionLocal()
                try:
                    shipments = db.query(Shipment).filter(
                        Shipment.status.in_([ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELAYED])
                    ).all()

                    for s in shipments:
                        if not s.route_waypoints or len(s.route_waypoints) < 2:
                            continue

                        ref = s.shipment_ref
                        if ref not in self._positions:
                            self._positions[ref] = {
                                "waypoint_index": 0,
                                "progress": 0.0,
                                "lat": s.route_waypoints[0][0],
                                "lng": s.route_waypoints[0][1],
                            }

                        pos = self._positions[ref]
                        idx = pos["waypoint_index"]
                        progress = pos["progress"] + random.uniform(0.02, 0.08)

                        if progress >= 1.0:
                            idx += 1
                            progress = 0.0
                            if idx >= len(s.route_waypoints) - 1:
                                idx = 0
                                progress = 0.0

                        wp_from = s.route_waypoints[idx]
                        wp_to = s.route_waypoints[min(idx + 1, len(s.route_waypoints) - 1)]

                        lat = wp_from[0] + (wp_to[0] - wp_from[0]) * progress
                        lng = wp_from[1] + (wp_to[1] - wp_from[1]) * progress

                        lat += random.uniform(-0.05, 0.05)
                        lng += random.uniform(-0.05, 0.05)

                        pos["waypoint_index"] = idx
                        pos["progress"] = progress
                        pos["lat"] = round(lat, 4)
                        pos["lng"] = round(lng, 4)

                        update = {
                            "type": "position",
                            "shipment_ref": ref,
                            "data": {
                                "lat": pos["lat"],
                                "lng": pos["lng"],
                                "timestamp": datetime.utcnow().isoformat(),
                                "speed_knots": round(random.uniform(8, 25), 1),
                                "heading": round(random.uniform(0, 360), 1),
                            }
                        }
                        self._positions[ref] = pos
                        await self.broadcast(ref, update)

                finally:
                    db.close()
            except Exception:
                pass

            await asyncio.sleep(3)


live_tracker = LiveTracker()
