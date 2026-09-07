from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.location import Location
from app.models.shipment import Shipment
from app.models.disruption import ExternalDisruption, ShipmentDisruptionLink
from app.schemas.network import NetworkHubInDB
from app.tracking.service import haversine_distance

router = APIRouter(prefix="/api/network", tags=["network"])


@router.get("/hubs", response_model=list[NetworkHubInDB])
def list_network_hubs(db: Session = Depends(get_db)):
    hubs = db.query(Location).filter(Location.is_hub == True).all()
    all_shipments = db.query(Shipment).all()
    all_active_disruptions = db.query(ExternalDisruption).filter(ExternalDisruption.active == True).all()
    all_links = db.query(ShipmentDisruptionLink).all()

    disruption_by_shipment = {}
    for link in all_links:
        disruption_by_shipment.setdefault(link.shipment_id, set()).add(link.disruption_id)

    disruption_ids_active = {d.id for d in all_active_disruptions}

    result = []
    for hub in hubs:
        active_count = 0
        hub_disruptions = []
        seen_shipments = set()

        for s in all_shipments:
            if s.id in seen_shipments:
                continue
            if _is_near_hub(s, hub):
                seen_shipments.add(s.id)
                active_count += 1
                linked_disruptions = disruption_by_shipment.get(s.id, set())
                for did in linked_disruptions:
                    if did in disruption_ids_active:
                        disruption = next((d for d in all_active_disruptions if d.id == did), None)
                        if disruption and disruption.id not in {d.id for d in hub_disruptions}:
                            hub_disruptions.append(disruption)

        result.append(NetworkHubInDB(
            id=hub.id,
            name=hub.name,
            lat=hub.lat,
            lng=hub.lng,
            location_type=hub.location_type.value,
            active_shipments=active_count,
            active_disruptions=[{
                "id": d.id,
                "category": d.category.value,
                "severity": d.severity.value,
                "description": d.description
            } for d in hub_disruptions]
        ))

    return result


def _is_near_hub(shipment: Shipment, hub: Location, threshold_km: float = 500) -> bool:
    if shipment.origin_lat and shipment.origin_lng:
        dist = haversine_distance(shipment.origin_lat, shipment.origin_lng, hub.lat, hub.lng)
        if dist < threshold_km:
            return True
    if shipment.destination_lat and shipment.destination_lng:
        dist = haversine_distance(shipment.destination_lat, shipment.destination_lng, hub.lat, hub.lng)
        if dist < threshold_km:
            return True
    if shipment.route_waypoints:
        for wp in shipment.route_waypoints:
            if len(wp) >= 2:
                dist = haversine_distance(wp[0], wp[1], hub.lat, hub.lng)
                if dist < threshold_km:
                    return True
    return False
