from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database.session import engine, Base, SessionLocal
from app.routers import shipments, documents, disruptions, exceptions, alerts, insights, network, ai, metrics, auth, dashboard, batch, export
from app.tracking.live import live_tracker
from app.risk.cache import risk_cache
from app.models.audit import AuditLog
import os
import time

app = FastAPI(title="NEXUS - Autonomous Logistics Intelligence", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(shipments.router)
app.include_router(documents.router)
app.include_router(disruptions.router)
app.include_router(exceptions.router)
app.include_router(alerts.router)
app.include_router(insights.router)
app.include_router(network.router)
app.include_router(ai.router)
app.include_router(metrics.router)
app.include_router(batch.router)
app.include_router(export.router)

os.makedirs("uploads", exist_ok=True)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.on_event("shutdown")
def shutdown():
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(live_tracker.stop_simulation())
    except Exception:
        pass


@app.get("/api/health")
def health_check():
    start = time.time()
    try:
        db = SessionLocal()
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db.close()
        db_latency_ms = round((time.time() - start) * 1000, 2)
        db_status = "healthy"
    except Exception as e:
        db_latency_ms = -1
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "NEXUS Backend",
        "version": "4.0.0",
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms
        },
        "cache": {
            "size": risk_cache.size,
            "ttl_seconds": risk_cache._ttl
        }
    }


@app.websocket("/ws/tracking/{shipment_ref}")
async def websocket_tracking(websocket: WebSocket, shipment_ref: str):
    await live_tracker.connect(websocket, shipment_ref)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        live_tracker.disconnect(websocket, shipment_ref)


@app.post("/api/simulation/start")
async def start_simulation():
    await live_tracker.start_simulation()
    return {"status": "simulation_started", "message": "Live tracking simulation is now running"}


@app.post("/api/simulation/stop")
async def stop_simulation():
    await live_tracker.stop_simulation()
    return {"status": "simulation_stopped"}


@app.get("/api/audit")
def get_audit_logs(limit: int = 50, db=None):
    from app.database.session import get_db as _get_db
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
        return [
            {
                "id": l.id,
                "user_email": l.user_email,
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "entity_ref": l.entity_ref,
                "changes": l.changes,
                "timestamp": l.timestamp.isoformat()
            }
            for l in logs
        ]
    finally:
        db.close()
