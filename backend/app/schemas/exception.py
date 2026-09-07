from pydantic import BaseModel
from datetime import datetime
from app.models.enums import ExceptionPriority


class ShipmentExceptionInDB(BaseModel):
    id: int
    shipment_id: int
    reason_summary: str
    priority: ExceptionPriority
    created_at: datetime

    class Config:
        from_attributes = True