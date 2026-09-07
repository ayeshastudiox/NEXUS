from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database.session import get_db
from app.models.shipment import Shipment
from app.models.enums import ShipmentStatus
from app.schemas.shipment import ShipmentDetail
from app.risk.engine import calculate_risk, estimate_delay
from app.models.tracking import TrackingEvent
from app.models.document import Document
from app.risk.cache import risk_cache

router = APIRouter(prefix="/api/batch", tags=["batch"])


class BatchStatusUpdate(BaseModel):
    shipment_refs: List[str]
    status: ShipmentStatus


class BatchDeleteRequest(BaseModel):
    shipment_refs: List[str]


@router.post("/status")
def batch_update_status(data: BatchStatusUpdate, db: Session = Depends(get_db)):
    updated = []
    not_found = []
    for ref in data.shipment_refs:
        shipment = db.query(Shipment).filter(Shipment.shipment_ref == ref).first()
        if not shipment:
            not_found.append(ref)
            continue
        old_status = shipment.status.value
        shipment.status = data.status
        shipment.updated_at = datetime.utcnow()
        risk_cache.invalidate(shipment.id)
        updated.append({"ref": ref, "old_status": old_status, "new_status": data.status.value})

    db.commit()
    return {
        "updated": len(updated),
        "not_found": len(not_found),
        "details": updated,
        "not_found_refs": not_found
    }


@router.post("/delete")
def batch_delete(data: BatchDeleteRequest, db: Session = Depends(get_db)):
    deleted = []
    not_found = []
    import os
    from app.config import settings

    for ref in data.shipment_refs:
        shipment = db.query(Shipment).filter(Shipment.shipment_ref == ref).first()
        if not shipment:
            not_found.append(ref)
            continue

        docs = db.query(Document).filter(Document.shipment_id == shipment.id).all()
        for doc in docs:
            if doc.file_path and os.path.exists(doc.file_path):
                try:
                    os.remove(doc.file_path)
                except OSError:
                    pass

        db.delete(shipment)
        risk_cache.invalidate(shipment.id)
        deleted.append(ref)

    db.commit()
    return {
        "deleted": len(deleted),
        "not_found": len(not_found),
        "deleted_refs": deleted,
        "not_found_refs": not_found
    }


@router.post("/risk-recalculate")
def batch_risk_recalculate(db: Session = Depends(get_db)):
    risk_cache.invalidate_all()
    shipments = db.query(Shipment).all()
    results = []
    for s in shipments:
        risk = calculate_risk(s, db)
        results.append({
            "shipment_ref": s.shipment_ref,
            "risk_score": risk["score"],
            "risk_level": risk["level"],
        })
    return {
        "recalculated": len(results),
        "results": sorted(results, key=lambda x: x["risk_score"], reverse=True)
    }
