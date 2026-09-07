from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.enums import AlertType


class AlertInDB(BaseModel):
    id: int
    shipment_id: Optional[int] = None
    type: AlertType
    message: str
    created_at: datetime

    class Config:
        from_attributes = True