from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.shipment import Shipment
from app.models.document import Document, DocumentDiscrepancy
from app.models.disruption import ShipmentDisruptionLink
from app.schemas.metrics import MetricsResponse
from app.risk.engine import calculate_risk
from app.models.enums import ShipmentStatus

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/", response_model=MetricsResponse)
def get_metrics(db: Session = Depends(get_db)):
    shipments = db.query(Shipment).all()
    active_statuses = {ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELAYED, ShipmentStatus.AT_PORT, ShipmentStatus.AWAITING_CLEARANCE}
    active_shipments = sum(1 for s in shipments if s.status in active_statuses)
    high_risk = 0
    delayed = 0
    exceptions = 0
    docs_pending = 0
    total_risk = 0
    risk_count = 0

    for s in shipments:
        risk = calculate_risk(s, db)
        if risk:
            total_risk += risk["score"]
            risk_count += 1
            if risk["level"] in ["HIGH", "CRITICAL"]:
                high_risk += 1
        if s.status == ShipmentStatus.DELAYED:
            delayed += 1
        has_disc = db.query(DocumentDiscrepancy).filter(DocumentDiscrepancy.shipment_id == s.id).first() is not None
        has_disr = db.query(ShipmentDisruptionLink).filter(ShipmentDisruptionLink.shipment_id == s.id).first() is not None
        if has_disc or has_disr:
            exceptions += 1
        doc_count = db.query(Document).filter(Document.shipment_id == s.id).count()
        if doc_count < 4:
            docs_pending += 4 - doc_count

    avg_risk = total_risk / risk_count if risk_count > 0 else 0

    return MetricsResponse(
        active_shipments=active_shipments,
        high_risk=high_risk,
        delayed=delayed,
        exceptions=exceptions,
        documents_pending=docs_pending,
        average_risk=round(avg_risk, 1)
    )
