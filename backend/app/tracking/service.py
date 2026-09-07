import math
from typing import Tuple, Optional
from app.models.shipment import Shipment
from app.models.tracking import TrackingEvent


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def compute_route_distance(waypoints: list) -> float:
    total = 0
    for i in range(len(waypoints) - 1):
        total += haversine_distance(
            waypoints[i][0], waypoints[i][1],
            waypoints[i + 1][0], waypoints[i + 1][1]
        )
    return total


def compute_progress(shipment: Shipment, latest_event: Optional[TrackingEvent]) -> Tuple[float, float, float]:
    if not shipment.route_waypoints or len(shipment.route_waypoints) < 2:
        return 0.0, 0.0, 0.0

    total_distance = compute_route_distance(shipment.route_waypoints)

    if not latest_event:
        return 0.0, 0.0, total_distance

    origin = shipment.route_waypoints[0]
    distance_to_current = haversine_distance(
        origin[0], origin[1],
        latest_event.lat, latest_event.lng
    )

    progress = min(100.0, (distance_to_current / total_distance) * 100) if total_distance > 0 else 0
    distance_remaining = max(0, total_distance - distance_to_current)

    return round(progress, 1), round(distance_to_current, 1), round(distance_remaining, 1)


def get_current_location(latest_event: Optional[TrackingEvent]) -> dict:
    if not latest_event:
        return {"lat": 0, "lng": 0, "location_name": "Unknown"}
    return {
        "lat": latest_event.lat,
        "lng": latest_event.lng,
        "location_name": latest_event.location_name,
        "timestamp": latest_event.timestamp.isoformat()
    }