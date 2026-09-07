from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.shipment import Shipment
from app.models.disruption import ExternalDisruption, ShipmentDisruptionLink
from app.models.document import DocumentDiscrepancy
from app.models.tracking import TrackingEvent
from app.risk.engine import calculate_risk


def analyze_query(question: str, shipment_id: Optional[str], db: Session) -> Dict[str, Any]:
    context = {}
    if shipment_id:
        shipment = db.query(Shipment).filter(Shipment.shipment_ref == shipment_id).first()
        if shipment:
            risk = calculate_risk(shipment, db)

            discrepancies = db.query(DocumentDiscrepancy).filter(
                DocumentDiscrepancy.shipment_id == shipment.id
            ).all()

            disruption_links = db.query(ShipmentDisruptionLink).filter(
                ShipmentDisruptionLink.shipment_id == shipment.id
            ).all()
            disruptions = []
            for link in disruption_links:
                d = db.query(ExternalDisruption).filter(
                    ExternalDisruption.id == link.disruption_id
                ).first()
                if d:
                    disruptions.append({
                        "location": d.location_name,
                        "category": d.category.value,
                        "severity": d.severity.value
                    })

            latest_event = db.query(TrackingEvent).filter(
                TrackingEvent.shipment_id == shipment.id
            ).order_by(TrackingEvent.timestamp.desc()).first()

            context = {
                "shipment_ref": shipment.shipment_ref,
                "status": shipment.status.value,
                "transport_mode": shipment.transport_mode.value,
                "carrier": shipment.carrier,
                "origin": shipment.origin_name,
                "destination": shipment.destination_name,
                "risk_score": risk["score"] if risk else None,
                "risk_level": risk["level"] if risk else None,
                "risk_factors": risk.get("factors", []) if risk else [],
                "discrepancies": [{"field": d.field_name, "description": d.difference_description} for d in discrepancies],
                "disruptions": disruptions,
                "current_location": latest_event.location_name if latest_event else None,
                "eta": shipment.current_eta.isoformat() if shipment.current_eta else None
            }
    else:
        all_shipments = db.query(Shipment).all()
        high_risk_count = 0
        for s in all_shipments:
            risk = calculate_risk(s, db)
            if risk and risk["level"] in ["HIGH", "CRITICAL"]:
                high_risk_count += 1
        context = {
            "total_shipments": len(all_shipments),
            "high_risk_count": high_risk_count,
            "question": question
        }

    answer = _generate_answer(question, context)
    return {"answer": answer, "sections": context}


def _generate_answer(question: str, context: dict) -> str:
    question_lower = question.lower()
    ref = context.get('shipment_ref', 'N/A')
    status = context.get('status', 'N/A').replace('_', ' ') if context.get('status') else 'N/A'
    mode = context.get('transport_mode', 'N/A')
    carrier = context.get('carrier', 'N/A')
    origin = context.get('origin', 'N/A')
    destination = context.get('destination', 'N/A')
    risk_level = context.get("risk_level", "N/A")
    risk_score = context.get("risk_score", 0)
    eta = context.get("eta", None)
    current_loc = context.get("current_location", "Unknown")
    factors = context.get("risk_factors", [])
    discrepancies = context.get("discrepancies", [])
    disruptions = context.get("disruptions", [])

    def _is_risk_query():
        return "risk" in question_lower

    def _is_eta_query():
        return any(kw in question_lower for kw in ["eta", "arrival", "arrive", "when", "deliver", "time", "date", "late"])

    def _is_optimization_query():
        return any(kw in question_lower for kw in ["optim", "recommend", "suggest", "improve", "better", "faster", "cheaper", "action", "what should"])

    def _is_delay_query():
        return any(kw in question_lower for kw in ["delay", "late", "behind", "slow", "disruption", "problem", "issue", "congestion"])

    def _is_document_query():
        return any(kw in question_lower for kw in ["document", "paper", "customs", "compliance", "inconsistenc", "discrepancy", "invoice", "bill", "manifest"])

    def _is_status_query():
        return any(kw in question_lower for kw in ["status", "where", "location", "position", "track", "progress"])

    if _is_risk_query():
        factor_lines = ""
        if factors:
            factor_lines = "\n\nKEY RISK FACTORS:\n" + "\n".join([
                f"  {i+1}. {f['name']} (+{f['points']} pts) — {f['description']}"
                for i, f in enumerate(factors)
            ])
        else:
            factor_lines = "\n\nNo specific risk factors identified for this shipment."

        disruption_note = ""
        if disruptions:
            disruption_note = "\n\nACTIVE DISRUPTIONS:\n" + "\n".join([
                f"  - {d['location']}: {d['category'].replace('_', ' ').title()} ({d['severity']})"
                for d in disruptions
            ])

        assessment = "LOW RISK" if risk_level == "LOW" else "MODERATE RISK" if risk_level == "MEDIUM" else "ELEVATED RISK" if risk_level == "HIGH" else "CRITICAL RISK"
        if risk_level in ("HIGH", "CRITICAL"):
            recommendation = "Prioritize corrective actions on the highest-weighted risk factors immediately. Consider rerouting or expedited handling to reduce exposure."
        elif risk_level == "MEDIUM":
            recommendation = "Monitor risk factors closely. Pre-emptive action on the top contributors can prevent escalation to HIGH."
        else:
            recommendation = "Shipment is within acceptable risk parameters. Continue standard monitoring."

        return f"""NEXUS INTELLIGENCE

RISK ASSESSMENT — {ref}

Status: {status} | Mode: {mode} | Carrier: {carrier}
Route: {origin} → {destination}
Risk Level: {risk_level} ({risk_score}/100)
{factor_lines}{disruption_note}

ASSESSMENT
This shipment carries a {assessment.lower()} profile. {"Multiple compounding factors are increasing overall risk." if len(factors) > 2 else "Risk factors are present but manageable with proper monitoring." if factors else "No significant risk factors detected."}

RECOMMENDED ACTION
{recommendation}"""

    elif _is_eta_query():
        eta_str = "Not yet determined"
        if eta:
            from datetime import datetime
            try:
                eta_dt = datetime.fromisoformat(eta)
                eta_str = eta_dt.strftime("%B %d, %Y at %H:%M UTC")
            except Exception:
                eta_str = str(eta)

        delay_factors = []
        if disruptions:
            for d in disruptions:
                delay_factors.append(f"Port congestion at {d['location']} ({d['severity']} severity)")
        if risk_level in ("HIGH", "CRITICAL"):
            delay_factors.append("Elevated risk level may impact transit speed")
        if not delay_factors:
            delay_factors.append("No significant delay factors identified")

        delay_text = "\n".join([f"  - {f}" for f in delay_factors])

        return f"""NEXUS INTELLIGENCE

ETA ANALYSIS — {ref}

Current Status: {status}
Current Location: {current_loc}
Route: {origin} → {destination}
Transport Mode: {mode} via {carrier}

ESTIMATED ARRIVAL
  {eta_str}

FACTORS AFFECTING ETA
{delay_text}

CONFIDENCE
ETA projections are based on simulated tracking data. Actual arrival may vary based on real-time conditions, port operations, and customs clearance timelines."""

    elif _is_optimization_query():
        actions = []
        if disruptions:
            actions.append({
                "title": "Disruption Mitigation",
                "detail": f"Active disruption at {disruptions[0]['location']} ({disruptions[0]['category'].replace('_', ' ').title()}). Consider requesting priority docking or alternative routing to avoid congestion.",
                "priority": "HIGH"
            })
        if risk_level in ("HIGH", "CRITICAL"):
            actions.append({
                "title": "Risk Reduction",
                "detail": f"Current risk score is {risk_score}/100. Review and resolve the highest-weighted risk factors to reduce overall exposure. Priority should be given to time-sensitive items.",
                "priority": "HIGH"
            })
        if discrepancies:
            actions.append({
                "title": "Document Resolution",
                "detail": f"{len(discrepancies)} document discrepancy(ies) detected. Resolve before customs clearance to prevent holds.",
                "priority": "MEDIUM"
            })
        actions.append({
            "title": "Monitoring Enhancement",
            "detail": "Increase tracking frequency for remaining route segments to enable faster response to emerging issues.",
            "priority": "LOW"
        })

        action_text = "\n\n".join([
            f"[{a['priority']}] {a['title']}\n    {a['detail']}"
            for a in actions
        ])

        return f"""NEXUS INTELLIGENCE

OPTIMIZATION REPORT — {ref}

Status: {status} | Risk: {risk_level} ({risk_score}/100)
Route: {origin} → {destination} | Mode: {mode}

RECOMMENDED ACTIONS
{action_text}

SUMMARY
Implementing these recommendations can reduce risk exposure and improve delivery certainty for this shipment. Prioritize HIGH-priority actions first."""

    elif _is_delay_query():
        if disruptions:
            d_text = "\n".join([
                f"  - {d['location']}: {d['category'].replace('_', ' ').title()} (Severity: {d['severity']})"
                for d in disruptions
            ])
            return f"""NEXUS INTELLIGENCE

DELAY ANALYSIS — {ref}

Current Status: {status}
Current Location: {current_loc}
Route: {origin} → {destination}

ACTIVE DISRUPTIONS
{d_text}

IMPACT ASSESSMENT
{"These disruptions are directly impacting transit time for this shipment." if len(disruptions) > 1 else "This disruption is affecting the current transit schedule."}

RECOMMENDED ACTION
Monitor disruption status closely. Communicate revised ETAs to all stakeholders. Consider alternative routing if congestion persists at the affected location."""
        else:
            return f"""NEXUS INTELLIGENCE

DELAY ANALYSIS — {ref}

Current Status: {status}
Current Location: {current_loc}

No active external disruptions are currently affecting this shipment. If delays are being experienced, they may be due to standard transit variables such as weather, port scheduling, or customs processing.

RECOMMENDED ACTION
Continue monitoring. If delays persist, investigate internal scheduling and carrier performance."""

    elif _is_document_query():
        if discrepancies:
            disc_text = "\n".join([
                f"  - {d['field']}: {d['description']}"
                for d in discrepancies
            ])
            return f"""NEXUS INTELLIGENCE

DOCUMENT AUDIT — {ref}

Status: {status} | Route: {origin} → {destination}

DISCREPANCIES FOUND ({len(discrepancies)})
{disc_text}

COMPLIANCE RISK
Document inconsistencies may trigger customs holds, inspection delays, or fines. Immediate reconciliation is advised.

RECOMMENDED ACTION
Cross-reference original documents with declared values. Resolve mismatches before the shipment reaches the destination port."""
        else:
            return f"""NEXUS INTELLIGENCE

DOCUMENT AUDIT — {ref}

Status: {status}

No document inconsistencies detected. All shipping documents, manifests, and customs declarations appear to be in order for this shipment.

COMPLIANCE STATUS: CLEAR"""

    elif _is_status_query():
        return f"""NEXUS INTELLIGENCE

STATUS REPORT — {ref}

Current Status: {status}
Current Location: {current_loc}
Route: {origin} → {destination}
Transport Mode: {mode}
Carrier: {carrier}

RISK OVERVIEW
  Level: {risk_level} ({risk_score}/100)

ETA
  {eta.strftime('%B %d, %Y at %H:%M UTC') if eta else 'Not yet determined'}"""

    elif "fleet" in question_lower or "overview" in question_lower or "summary" in question_lower:
        total = context.get("total_shipments", 0)
        high = context.get("high_risk_count", 0)
        return f"""NEXUS INTELLIGENCE

FLEET OVERVIEW

Total Shipments: {total}
High/Critical Risk: {high}
On Track: {total - high}

The fleet is currently {'in good shape' if high == 0 else f'facing {high} high-risk shipment(s) that require attention'}."""

    else:
        risk_info = f"Risk Level: {risk_level} ({risk_score}/100)" if risk_level and risk_level != "N/A" else ""
        return f"""NEXUS INTELLIGENCE

Shipment {ref} — Overview

Status: {status}
Transport Mode: {mode} | Carrier: {carrier}
Route: {origin} → {destination}
{risk_info}

For more detailed analysis, try asking about:
  - Risk factors
  - Estimated arrival time
  - Optimization recommendations
  - Document status
  - Disruptions and delays"""
