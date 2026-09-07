from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import csv
import io

from app.database.session import get_db
from app.models.shipment import Shipment
from app.models.enums import ShipmentStatus, TransportMode
from app.risk.engine import calculate_risk

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/shipments")
def export_shipments(
    format: str = Query("csv", regex="^(csv|json)$"),
    company: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Shipment)
    if company:
        query = query.filter(Shipment.company_name == company)
    shipments = query.all()

    rows = []
    for s in shipments:
        risk = calculate_risk(s, db)
        rows.append({
            "shipment_ref": s.shipment_ref,
            "status": s.status.value,
            "transport_mode": s.transport_mode.value,
            "carrier": s.carrier,
            "company_name": s.company_name or "",
            "origin": s.origin_name,
            "destination": s.destination_name,
            "cargo_description": s.cargo_description or "",
            "cargo_weight_kg": s.cargo_weight_kg or 0,
            "cargo_value_usd": s.cargo_value_usd or 0,
            "risk_score": risk["score"] if risk else 0,
            "risk_level": risk["level"] if risk else "UNKNOWN",
            "original_eta": s.original_eta.isoformat() if s.original_eta else "",
            "current_eta": s.current_eta.isoformat() if s.current_eta else "",
            "created_at": s.created_at.isoformat() if s.created_at else "",
        })

    if format == "json":
        return {"shipments": rows, "count": len(rows)}

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    from fastapi.responses import Response
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=nexus_shipments_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
