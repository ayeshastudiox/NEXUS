from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.disruption import ExternalDisruption, ShipmentDisruptionLink
from app.schemas.disruption import ExternalDisruptionInDB

router = APIRouter(prefix="/api/disruptions", tags=["disruptions"])


@router.get("/", response_model=List[ExternalDisruptionInDB])
def list_disruptions(db: Session = Depends(get_db)):
    disruptions = db.query(ExternalDisruption).filter(ExternalDisruption.active == True).all()
    results = []
    for d in disruptions:
        count = db.query(ShipmentDisruptionLink).filter(
            ShipmentDisruptionLink.disruption_id == d.id
        ).count()
        results.append(ExternalDisruptionInDB(
            id=d.id,
            category=d.category,
            location_name=d.location_name,
            lat=d.lat,
            lng=d.lng,
            severity=d.severity,
            potential_impact_hours_min=d.potential_impact_hours_min,
            potential_impact_hours_max=d.potential_impact_hours_max,
            description=d.description,
            active=d.active,
            affected_shipment_count=count
        ))
    return results


@router.get("/{disruption_id}/shipments")
def get_disruption_shipments(disruption_id: int, db: Session = Depends(get_db)):
    links = db.query(ShipmentDisruptionLink).filter(
        ShipmentDisruptionLink.disruption_id == disruption_id
    ).all()
    from app.models.shipment import Shipment
    shipments = []
    for link in links:
        s = db.query(Shipment).filter(Shipment.id == link.shipment_id).first()
        if s:
            shipments.append({
                "id": s.id,
                "shipment_ref": s.shipment_ref,
                "status": s.status.value,
                "transport_mode": s.transport_mode.value
            })
    return shipments