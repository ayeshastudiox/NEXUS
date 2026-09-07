from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import re
import os

from app.database.session import get_db
from app.models.shipment import Shipment
from app.models.tracking import TrackingEvent
from app.models.document import Document, DocumentDiscrepancy
from app.models.disruption import ShipmentDisruptionLink
from app.models.audit import AuditLog
from app.schemas.shipment import ShipmentDetail, ShipmentInDB, ShipmentCreate, ShipmentUpdate
from app.schemas.tracking import TrackingEventCreate, TrackingEventInDB
from app.tracking.service import get_current_location, compute_progress
from app.risk.engine import calculate_risk, estimate_delay
from app.risk.cache import risk_cache
from app.config import settings

router = APIRouter(prefix="/api/shipments", tags=["shipments"])

VALID_REF_PATTERN = re.compile(r'^NX-\d{4,6}$')


def _validate_shipment_ref(ref: str):
    if not VALID_REF_PATTERN.match(ref):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid shipment ref format: '{ref}'. Must match NX-XXXX (e.g. NX-1042)"
        )


def _validate_coordinates(lat: float, lng: float):
    if not (-90 <= lat <= 90):
        raise HTTPException(status_code=422, detail=f"Invalid latitude: {lat}. Must be between -90 and 90")
    if not (-180 <= lng <= 180):
        raise HTTPException(status_code=422, detail=f"Invalid longitude: {lng}. Must be between -180 and 180")


def _log_audit(db: Session, user_email: str, action: str, entity_type: str, entity_id: int = None, entity_ref: str = None, changes: dict = None):
    log = AuditLog(
        user_email=user_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_ref=entity_ref,
        changes=changes
    )
    db.add(log)


@router.get("/", response_model=dict)
def list_shipments(
    mode: Optional[str] = None,
    risk: Optional[str] = None,
    status: Optional[str] = None,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    delay: Optional[bool] = None,
    exception: Optional[bool] = None,
    company: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Shipment)
    if mode:
        query = query.filter(Shipment.transport_mode == mode.upper())
    if status:
        query = query.filter(Shipment.status == status.upper())
    if origin:
        query = query.filter(Shipment.origin_name.ilike(f"%{origin}%"))
    if destination:
        query = query.filter(Shipment.destination_name.ilike(f"%{destination}%"))
    if company:
        query = query.filter(Shipment.company_name == company)

    total = query.count()
    shipments = query.offset((page - 1) * limit).limit(limit).all()
    results = []
    for s in shipments:
        detail = _build_shipment_detail(s, db)
        if risk and detail.risk_level != risk.upper():
            continue
        if delay and (detail.delay_hours or 0) <= 0:
            continue
        if exception and not (detail.has_active_disruption or detail.has_discrepancy):
            continue
        results.append(detail)

    return {
        "items": results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.post("/", response_model=ShipmentDetail)
def create_shipment(data: ShipmentCreate, db: Session = Depends(get_db)):
    _validate_shipment_ref(data.shipment_ref)
    _validate_coordinates(data.origin_lat, data.origin_lng)
    _validate_coordinates(data.destination_lat, data.destination_lng)

    if data.original_eta >= data.current_eta:
        pass  # Allow same or current after original for flexibility

    existing = db.query(Shipment).filter(Shipment.shipment_ref == data.shipment_ref).first()
    if existing:
        raise HTTPException(status_code=400, detail="Shipment ref already exists")

    shipment = Shipment(
        shipment_ref=data.shipment_ref,
        container_number=data.container_number,
        booking_number=data.booking_number,
        awb_number=data.awb_number,
        bol_number=data.bol_number,
        transport_mode=data.transport_mode,
        carrier=data.carrier,
        company_name=data.company_name,
        cargo_description=data.cargo_description,
        cargo_weight_kg=data.cargo_weight_kg,
        cargo_value_usd=data.cargo_value_usd,
        origin_name=data.origin_name,
        origin_lat=data.origin_lat,
        origin_lng=data.origin_lng,
        destination_name=data.destination_name,
        destination_lat=data.destination_lat,
        destination_lng=data.destination_lng,
        route_waypoints=data.route_waypoints,
        status=data.status,
        original_eta=data.original_eta,
        current_eta=data.current_eta,
        data_source=data.data_source,
    )
    db.add(shipment)
    _log_audit(db, "system", "CREATE", "shipment", entity_ref=data.shipment_ref)
    db.commit()
    db.refresh(shipment)
    return _build_shipment_detail(shipment, db)


@router.get("/search", response_model=List[ShipmentInDB])
def search_shipments(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    pattern = f"%{q}%"
    shipments = db.query(Shipment).filter(
        (Shipment.shipment_ref.ilike(pattern)) |
        (Shipment.container_number.ilike(pattern)) |
        (Shipment.booking_number.ilike(pattern)) |
        (Shipment.awb_number.ilike(pattern)) |
        (Shipment.bol_number.ilike(pattern))
    ).all()
    return shipments


def _find_shipment(shipment_id: str, db: Session) -> Shipment:
    shipment = db.query(Shipment).filter(Shipment.shipment_ref == shipment_id).first()
    if not shipment:
        try:
            int_id = int(shipment_id)
            shipment = db.query(Shipment).filter(Shipment.id == int_id).first()
        except (ValueError, TypeError):
            pass
    return shipment


@router.get("/{shipment_id}", response_model=ShipmentDetail)
def get_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _find_shipment(shipment_id, db)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return _build_shipment_detail(shipment, db)


@router.put("/{shipment_id}", response_model=ShipmentDetail)
def update_shipment(shipment_id: str, data: ShipmentUpdate, db: Session = Depends(get_db)):
    shipment = _find_shipment(shipment_id, db)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    old_values = {}
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_val = getattr(shipment, field)
        if hasattr(old_val, 'value'):
            old_val = old_val.value
        old_values[field] = old_val
        setattr(shipment, field, value)
    shipment.updated_at = datetime.utcnow()

    risk_cache.invalidate(shipment.id)
    _log_audit(db, "system", "UPDATE", "shipment", entity_id=shipment.id, entity_ref=shipment.shipment_ref, changes=old_values)
    db.commit()
    db.refresh(shipment)
    return _build_shipment_detail(shipment, db)


@router.delete("/{shipment_id}")
def delete_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _find_shipment(shipment_id, db)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    ref = shipment.shipment_ref
    sid = shipment.id

    docs = db.query(Document).filter(Document.shipment_id == shipment.id).all()
    for doc in docs:
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except OSError:
                pass

    db.delete(shipment)
    risk_cache.invalidate(sid)
    _log_audit(db, "system", "DELETE", "shipment", entity_id=sid, entity_ref=ref)
    db.commit()
    return {"message": f"Shipment {ref} deleted"}


@router.post("/{shipment_id}/tracking", response_model=TrackingEventInDB)
def add_tracking_event(shipment_id: str, data: TrackingEventCreate, db: Session = Depends(get_db)):
    shipment = _find_shipment(shipment_id, db)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    _validate_coordinates(data.lat, data.lng)

    event = TrackingEvent(
        shipment_id=shipment.id,
        timestamp=data.timestamp,
        lat=data.lat,
        lng=data.lng,
        location_name=data.location_name,
        event_type=data.event_type,
        description=data.description,
        severity=data.severity
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return TrackingEventInDB.model_validate(event)


@router.get("/{shipment_id}/timeline")
def get_shipment_timeline(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _find_shipment(shipment_id, db)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    events = db.query(TrackingEvent).filter(
        TrackingEvent.shipment_id == shipment.id
    ).order_by(TrackingEvent.timestamp.asc()).all()
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp.isoformat(),
            "location_name": e.location_name,
            "event_type": e.event_type.value,
            "description": e.description,
            "severity": e.severity.value,
            "lat": e.lat,
            "lng": e.lng
        }
        for e in events
    ]


@router.get("/{shipment_id}/risk")
def get_shipment_risk(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _find_shipment(shipment_id, db)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    risk = calculate_risk(shipment, db)
    return risk


@router.get("/{shipment_id}/delay")
def get_shipment_delay(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _find_shipment(shipment_id, db)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    delay = estimate_delay(shipment, db)
    return delay


@router.get("/{shipment_id}/documents")
def get_shipment_documents(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _find_shipment(shipment_id, db)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    from app.models.document import DocumentExtraction, DocumentDiscrepancy
    docs = db.query(Document).filter(Document.shipment_id == shipment.id).all()
    discrepancies = db.query(DocumentDiscrepancy).filter(
        DocumentDiscrepancy.shipment_id == shipment.id
    ).all()
    result = []
    for doc in docs:
        extractions = db.query(DocumentExtraction).filter(
            DocumentExtraction.document_id == doc.id
        ).all()
        result.append({
            "id": doc.id,
            "type": doc.type.value,
            "status": doc.status.value,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "extractions": [
                {"id": e.id, "extracted_json": e.extracted_json, "confidence": e.confidence}
                for e in extractions
            ]
        })
    return {
        "documents": result,
        "discrepancies": [
            {
                "id": d.id,
                "field_name": d.field_name,
                "values_by_document": d.values_by_document,
                "difference_description": d.difference_description,
                "potential_impact": d.potential_impact
            }
            for d in discrepancies
        ]
    }


def _build_shipment_detail(shipment: Shipment, db: Session) -> ShipmentDetail:
    risk = calculate_risk(shipment, db)
    delay = estimate_delay(shipment, db)
    latest_event = db.query(TrackingEvent).filter(
        TrackingEvent.shipment_id == shipment.id
    ).order_by(TrackingEvent.timestamp.desc()).first()
    docs = db.query(Document).filter(Document.shipment_id == shipment.id).all()
    has_discrepancy = len(shipment.document_discrepancies) > 0
    has_disruption = len(shipment.disruption_links) > 0
    progress, dist_travelled, dist_remaining = compute_progress(shipment, latest_event)

    return ShipmentDetail(
        id=shipment.id,
        shipment_ref=shipment.shipment_ref,
        container_number=shipment.container_number,
        booking_number=shipment.booking_number,
        awb_number=shipment.awb_number,
        bol_number=shipment.bol_number,
        transport_mode=shipment.transport_mode,
        carrier=shipment.carrier,
        company_name=shipment.company_name,
        cargo_description=shipment.cargo_description,
        cargo_weight_kg=shipment.cargo_weight_kg,
        cargo_value_usd=shipment.cargo_value_usd,
        origin_name=shipment.origin_name,
        origin_lat=shipment.origin_lat,
        origin_lng=shipment.origin_lng,
        destination_name=shipment.destination_name,
        destination_lat=shipment.destination_lat,
        destination_lng=shipment.destination_lng,
        route_waypoints=shipment.route_waypoints,
        status=shipment.status,
        original_eta=shipment.original_eta,
        current_eta=shipment.current_eta,
        data_source=shipment.data_source,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
        risk_score=risk["score"] if risk else None,
        risk_level=risk["level"] if risk else None,
        delay_hours=delay["expected_delay_hours"] if delay else None,
        documents_uploaded=len(docs),
        documents_total=4,
        has_discrepancy=has_discrepancy,
        has_active_disruption=has_disruption,
        latest_tracking={
            "lat": latest_event.lat,
            "lng": latest_event.lng,
            "location_name": latest_event.location_name,
            "timestamp": latest_event.timestamp.isoformat(),
            "event_type": latest_event.event_type.value
        } if latest_event else None,
        progress_percent=progress,
        distance_travelled_km=dist_travelled,
        distance_remaining_km=dist_remaining
    )
