from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.shipment import Shipment
from app.models.document import Document, DocumentDiscrepancy
from app.models.disruption import ExternalDisruption, ShipmentDisruptionLink
from app.models.enums import ShipmentStatus, TransportMode
from app.risk.engine import calculate_risk

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/admin")
def admin_dashboard(db: Session = Depends(get_db)):
    shipments = db.query(Shipment).all()
    total = len(shipments)
    high_risk_count = 0
    medium_risk_count = 0
    low_risk_count = 0
    critical_risk_count = 0
    delayed = 0
    in_transit = 0
    delivered = 0
    at_port = 0
    awaiting = 0
    total_risk = 0
    risk_count = 0
    docs_pending = 0
    exceptions = 0

    ocean = 0
    air = 0
    road = 0
    rail = 0

    high_risk_shipments = []
    low_risk_shipments = []

    for s in shipments:
        risk = calculate_risk(s, db)
        if risk:
            total_risk += risk["score"]
            risk_count += 1
            level = risk["level"]
            if level == "CRITICAL":
                critical_risk_count += 1
            elif level == "HIGH":
                high_risk_count += 1
            elif level == "MEDIUM":
                medium_risk_count += 1
            else:
                low_risk_count += 1

            entry = {
                "shipment_ref": s.shipment_ref,
                "risk_score": risk["score"],
                "risk_level": risk["level"],
                "origin_name": s.origin_name,
                "destination_name": s.destination_name,
                "transport_mode": s.transport_mode.value,
                "status": s.status.value,
                "carrier": s.carrier,
                "company_name": s.company_name,
            }
            if level in ["HIGH", "CRITICAL"]:
                high_risk_shipments.append(entry)
            elif level == "LOW":
                low_risk_shipments.append(entry)

        if s.status == ShipmentStatus.DELAYED:
            delayed += 1
        elif s.status == ShipmentStatus.IN_TRANSIT:
            in_transit += 1
        elif s.status == ShipmentStatus.DELIVERED:
            delivered += 1
        elif s.status == ShipmentStatus.AT_PORT:
            at_port += 1
        elif s.status == ShipmentStatus.AWAITING_CLEARANCE:
            awaiting += 1

        if s.transport_mode == TransportMode.OCEAN:
            ocean += 1
        elif s.transport_mode == TransportMode.AIR:
            air += 1
        elif s.transport_mode == TransportMode.ROAD:
            road += 1
        elif s.transport_mode == TransportMode.RAIL:
            rail += 1

        doc_count = db.query(Document).filter(Document.shipment_id == s.id).count()
        if doc_count < 4:
            docs_pending += 4 - doc_count

        has_disc = db.query(DocumentDiscrepancy).filter(DocumentDiscrepancy.shipment_id == s.id).first() is not None
        has_disr = db.query(ShipmentDisruptionLink).filter(ShipmentDisruptionLink.shipment_id == s.id).first() is not None
        if has_disc or has_disr:
            exceptions += 1

    active_disruptions = db.query(ExternalDisruption).filter(ExternalDisruption.active == True).count()
    avg_risk = total_risk / risk_count if risk_count > 0 else 0

    high_risk_shipments.sort(key=lambda x: x["risk_score"], reverse=True)
    low_risk_shipments.sort(key=lambda x: x["risk_score"])

    return {
        "total_shipments": total,
        "active_shipments": in_transit + delayed + at_port + awaiting,
        "high_risk": high_risk_count,
        "medium_risk": medium_risk_count,
        "low_risk": low_risk_count,
        "critical_risk": critical_risk_count,
        "delayed": delayed,
        "in_transit": in_transit,
        "delivered": delivered,
        "at_port": at_port,
        "awaiting_clearance": awaiting,
        "documents_pending": docs_pending,
        "exceptions": exceptions,
        "active_disruptions": active_disruptions,
        "average_risk": round(avg_risk, 1),
        "by_mode": {"ocean": ocean, "air": air, "road": road, "rail": rail},
        "high_risk_shipments": high_risk_shipments[:10],
        "low_risk_shipments": low_risk_shipments[:10],
    }


@router.get("/company/{company_name}")
def company_dashboard(company_name: str, db: Session = Depends(get_db)):
    shipments = db.query(Shipment).filter(Shipment.company_name == company_name).all()
    total = len(shipments)
    high_risk_count = 0
    low_risk_count = 0
    delayed = 0
    in_transit = 0
    delivered = 0
    total_risk = 0
    risk_count = 0
    docs_pending = 0
    exceptions = 0

    high_risk_shipments = []
    low_risk_shipments = []

    for s in shipments:
        risk = calculate_risk(s, db)
        if risk:
            total_risk += risk["score"]
            risk_count += 1
            if risk["level"] in ["HIGH", "CRITICAL"]:
                high_risk_count += 1
                high_risk_shipments.append({
                    "shipment_ref": s.shipment_ref,
                    "risk_score": risk["score"],
                    "risk_level": risk["level"],
                    "origin_name": s.origin_name,
                    "destination_name": s.destination_name,
                    "transport_mode": s.transport_mode.value,
                    "status": s.status.value,
                    "carrier": s.carrier,
                })
            elif risk["level"] == "LOW":
                low_risk_count += 1
                low_risk_shipments.append({
                    "shipment_ref": s.shipment_ref,
                    "risk_score": risk["score"],
                    "risk_level": risk["level"],
                    "origin_name": s.origin_name,
                    "destination_name": s.destination_name,
                    "transport_mode": s.transport_mode.value,
                    "status": s.status.value,
                    "carrier": s.carrier,
                })

        if s.status == ShipmentStatus.DELAYED:
            delayed += 1
        elif s.status == ShipmentStatus.IN_TRANSIT:
            in_transit += 1
        elif s.status == ShipmentStatus.DELIVERED:
            delivered += 1

        doc_count = db.query(Document).filter(Document.shipment_id == s.id).count()
        if doc_count < 4:
            docs_pending += 4 - doc_count

        has_disc = db.query(DocumentDiscrepancy).filter(DocumentDiscrepancy.shipment_id == s.id).first() is not None
        has_disr = db.query(ShipmentDisruptionLink).filter(ShipmentDisruptionLink.shipment_id == s.id).first() is not None
        if has_disc or has_disr:
            exceptions += 1

    avg_risk = total_risk / risk_count if risk_count > 0 else 0
    high_risk_shipments.sort(key=lambda x: x["risk_score"], reverse=True)
    low_risk_shipments.sort(key=lambda x: x["risk_score"])

    return {
        "company_name": company_name,
        "total_shipments": total,
        "active_shipments": in_transit + delayed,
        "high_risk": high_risk_count,
        "low_risk": low_risk_count,
        "delayed": delayed,
        "in_transit": in_transit,
        "delivered": delivered,
        "documents_pending": docs_pending,
        "exceptions": exceptions,
        "average_risk": round(avg_risk, 1),
        "high_risk_shipments": high_risk_shipments[:10],
        "low_risk_shipments": low_risk_shipments[:10],
    }
