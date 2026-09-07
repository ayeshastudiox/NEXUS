from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.shipment import Shipment
from app.models.disruption import ExternalDisruption, ShipmentDisruptionLink
from app.models.document import DocumentDiscrepancy
from app.risk.engine import calculate_risk


def generate_insights(db: Session) -> List[Dict[str, str]]:
    insights = []

    disruptions = db.query(ExternalDisruption).filter(ExternalDisruption.active == True).all()
    for d in disruptions:
        link_count = db.query(ShipmentDisruptionLink).filter(
            ShipmentDisruptionLink.disruption_id == d.id
        ).count()
        if link_count > 0:
            insights.append({
                "text": f"{link_count} shipments may be affected by {d.location_name} {d.category.value.replace('_', ' ').lower()}.",
                "source_type": "DISRUPTION"
            })

    high_risk_shipments = []
    shipments = db.query(Shipment).all()
    for s in shipments:
        risk = calculate_risk(s, db)
        if risk and risk["level"] in ["HIGH", "CRITICAL"]:
            high_risk_shipments.append(s)

    if high_risk_shipments:
        refs = [s.shipment_ref for s in high_risk_shipments[:3]]
        insights.append({
            "text": f"Highest risk shipments: {', '.join(refs)}.",
            "source_type": "RISK"
        })

    discrepancy_shipments = set()
    discrepancies = db.query(DocumentDiscrepancy).all()
    for disc in discrepancies:
        discrepancy_shipments.add(disc.shipment_id)
    if discrepancy_shipments:
        insights.append({
            "text": f"{len(discrepancy_shipments)} shipment(s) have documentation inconsistencies.",
            "source_type": "DOCUMENT"
        })

    return insights[:5]
