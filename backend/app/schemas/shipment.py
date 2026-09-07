from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.enums import TransportMode, ShipmentStatus, DataSource


class ShipmentBase(BaseModel):
    shipment_ref: str
    container_number: Optional[str] = None
    booking_number: Optional[str] = None
    awb_number: Optional[str] = None
    bol_number: Optional[str] = None
    transport_mode: TransportMode
    carrier: str
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    route_waypoints: List[List[float]]
    status: ShipmentStatus
    original_eta: datetime
    current_eta: datetime
    data_source: DataSource


class ShipmentCreate(BaseModel):
    shipment_ref: str
    container_number: Optional[str] = None
    booking_number: Optional[str] = None
    awb_number: Optional[str] = None
    bol_number: Optional[str] = None
    transport_mode: TransportMode
    carrier: str
    company_name: Optional[str] = None
    cargo_description: Optional[str] = None
    cargo_weight_kg: Optional[float] = None
    cargo_value_usd: Optional[float] = None
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    route_waypoints: List[List[float]]
    original_eta: datetime
    current_eta: datetime
    data_source: DataSource = DataSource.SIMULATED
    status: ShipmentStatus = ShipmentStatus.IN_TRANSIT


class ShipmentUpdate(BaseModel):
    status: Optional[ShipmentStatus] = None
    current_eta: Optional[datetime] = None
    data_source: Optional[DataSource] = None
    carrier: Optional[str] = None
    cargo_description: Optional[str] = None
    cargo_weight_kg: Optional[float] = None
    cargo_value_usd: Optional[float] = None


class ShipmentInDB(ShipmentBase):
    id: int
    company_name: Optional[str] = None
    cargo_description: Optional[str] = None
    cargo_weight_kg: Optional[float] = None
    cargo_value_usd: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShipmentDetail(ShipmentInDB):
    risk_score: Optional[int] = None
    risk_level: Optional[str] = None
    delay_hours: Optional[float] = None
    documents_uploaded: int = 0
    documents_total: int = 4
    has_discrepancy: bool = False
    has_active_disruption: bool = False
    latest_tracking: Optional[dict] = None
    progress_percent: float = 0.0
    distance_travelled_km: float = 0.0
    distance_remaining_km: float = 0.0
