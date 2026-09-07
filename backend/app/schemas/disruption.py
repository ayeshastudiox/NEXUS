from pydantic import BaseModel
from typing import List
from app.models.enums import DisruptionCategory, DisruptionSeverity


class ExternalDisruptionInDB(BaseModel):
    id: int
    category: DisruptionCategory
    location_name: str
    lat: float
    lng: float
    severity: DisruptionSeverity
    potential_impact_hours_min: int
    potential_impact_hours_max: int
    description: str
    active: bool
    affected_shipment_count: int = 0

    class Config:
        from_attributes = True


class ShipmentDisruptionLinkInDB(BaseModel):
    id: int
    shipment_id: int
    disruption_id: int

    class Config:
        from_attributes = True