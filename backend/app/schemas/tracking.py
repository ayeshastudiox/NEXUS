from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.enums import TrackingEventType, EventSeverity


class TrackingEventBase(BaseModel):
    timestamp: datetime
    lat: float
    lng: float
    location_name: str
    event_type: TrackingEventType
    description: Optional[str] = None
    severity: EventSeverity = EventSeverity.NORMAL


class TrackingEventCreate(TrackingEventBase):
    pass


class TrackingEventInDB(TrackingEventBase):
    id: int
    shipment_id: int

    class Config:
        from_attributes = True
