from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.shipment import Shipment
from app.models.risk import RiskAssessment
from app.models.exception import ShipmentException
from app.models.document import DocumentDiscrepancy
from app.models.disruption import ShipmentDisruptionLink
from app.schemas.shipment import ShipmentDetail

router = APIRouter(prefix="/api/exceptions", tags=["exceptions"])


@router.get("/", response_model=List[ShipmentDetail])
def get_exceptions(db: Session = Depends(get_db)):
    shipments = db.query(Shipment).all()
    results = []
    for s in shipments:
        risk = db.query(RiskAssessment).filter(
            RiskAssessment.shipment_id == s.id
        ).order_by(RiskAssessment.calculated_at.desc()).first()
        has_discrepancy = db.query(DocumentDiscrepancy).filter(
            DocumentDiscrepancy.shipment_id == s.id
        ).first() is not None
        has_disruption = db.query(ShipmentDisruptionLink).filter(
            ShipmentDisruptionLink.shipment_id == s.id
        ).first() is not None

        if (risk and risk.level in ["MEDIUM", "HIGH", "CRITICAL"]) or has_discrepancy or has_disruption:
            results.append(s)

    details = []
    from app.routers.shipments import _build_shipment_detail
    for s in results:
        details.append(_build_shipment_detail(s, db))
    return details