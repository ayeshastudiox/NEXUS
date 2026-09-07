from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.shipment import Shipment
from app.models.tracking import TrackingEvent
from app.models.document import Document, DocumentDiscrepancy
from app.models.disruption import ExternalDisruption, ShipmentDisruptionLink
from app.models.enums import RiskLevel
from app.risk.cache import risk_cache


def calculate_risk(shipment: Shipment, db: Session, use_cache: bool = True) -> Dict[str, Any]:
    if use_cache:
        cached = risk_cache.get(shipment.id)
        if cached:
            return cached

    factors = []
    total_score = 0

    discrepancies = db.query(DocumentDiscrepancy).filter(
        DocumentDiscrepancy.shipment_id == shipment.id
    ).all()
    if discrepancies:
        points = min(25, len(discrepancies) * 25)
        total_score += points
        factors.append({
            "name": "Document discrepancy",
            "points": points,
            "description": f"{len(discrepancies)} document mismatch(es) detected"
        })

    disruption_links = db.query(ShipmentDisruptionLink).filter(
        ShipmentDisruptionLink.shipment_id == shipment.id
    ).all()
    for link in disruption_links:
        disruption = db.query(ExternalDisruption).filter(
            ExternalDisruption.id == link.disruption_id
        ).first()
        if disruption and disruption.category.value in ["PORT_CONGESTION", "AIRPORT_DISRUPTION"]:
            severity_map = {"LOW": 5, "MEDIUM": 12, "HIGH": 20}
            points = severity_map.get(disruption.severity.value, 5)
            total_score += points
            factors.append({
                "name": "Port/airport congestion",
                "points": points,
                "description": f"{disruption.location_name}: {disruption.severity.value} severity"
            })
        elif disruption and disruption.category.value == "WEATHER":
            severity_map = {"LOW": 3, "MEDIUM": 8, "HIGH": 15}
            points = severity_map.get(disruption.severity.value, 3)
            total_score += points
            factors.append({
                "name": "Weather disruption",
                "points": points,
                "description": f"{disruption.location_name}: {disruption.description}"
            })

    if shipment.original_eta and shipment.current_eta:
        eta_diff_hours = (shipment.current_eta - shipment.original_eta).total_seconds() / 3600
        if eta_diff_hours > 0:
            points = min(20, int(eta_diff_hours / 2))
            total_score += points
            factors.append({
                "name": "ETA variance",
                "points": points,
                "description": f"Current ETA is {int(eta_diff_hours)}h later than original"
            })

    docs = db.query(Document).filter(Document.shipment_id == shipment.id).all()
    doc_types_uploaded = {d.type.value for d in docs}
    required_types = {"BILL_OF_LADING", "COMMERCIAL_INVOICE", "PACKING_LIST"}
    missing = required_types - doc_types_uploaded
    if missing:
        points = min(10, len(missing) * 5)
        total_score += points
        factors.append({
            "name": "Missing documentation",
            "points": points,
            "description": f"Missing: {', '.join(missing)}"
        })

    total_score = min(100, total_score)
    if total_score < 30:
        level = RiskLevel.LOW
    elif total_score < 55:
        level = RiskLevel.MEDIUM
    elif total_score < 80:
        level = RiskLevel.HIGH
    else:
        level = RiskLevel.CRITICAL

    result = {
        "score": total_score,
        "level": level.value,
        "factors": factors,
        "calculated_at": datetime.utcnow().isoformat()
    }

    if use_cache:
        risk_cache.set(shipment.id, result)

    return result


def estimate_delay(shipment: Shipment, db: Session) -> Dict[str, Any]:
    base_delay_hours = 0.0
    if shipment.original_eta and shipment.current_eta:
        base_delay_hours = max(0, (shipment.current_eta - shipment.original_eta).total_seconds() / 3600)

    additional_hours = 0.0
    contributors = []

    disruption_links = db.query(ShipmentDisruptionLink).filter(
        ShipmentDisruptionLink.shipment_id == shipment.id
    ).all()
    for link in disruption_links:
        disruption = db.query(ExternalDisruption).filter(
            ExternalDisruption.id == link.disruption_id
        ).first()
        if disruption:
            avg_impact = (disruption.potential_impact_hours_min + disruption.potential_impact_hours_max) / 2
            additional_hours += avg_impact * 0.3
            contributors.append(disruption.location_name)

    discrepancies = db.query(DocumentDiscrepancy).filter(
        DocumentDiscrepancy.shipment_id == shipment.id
    ).all()
    if discrepancies:
        additional_hours += 8
        contributors.append("Documentation discrepancy")

    current_eta = shipment.current_eta or shipment.original_eta or datetime.utcnow()
    predicted_eta = current_eta
    if additional_hours > 0:
        from datetime import timedelta
        predicted_eta = current_eta + timedelta(hours=additional_hours)

    return {
        "current_eta": current_eta.isoformat(),
        "predicted_eta": predicted_eta.isoformat(),
        "expected_delay_hours": round(additional_hours, 1),
        "base_delay_hours": round(base_delay_hours, 1),
        "contributors": contributors,
        "calculated_at": datetime.utcnow().isoformat()
    }


def calculate_risk_batch(shipments: List[Shipment], db: Session) -> Dict[int, Dict[str, Any]]:
    results = {}
    for s in shipments:
        results[s.id] = calculate_risk(s, db)
    return results
