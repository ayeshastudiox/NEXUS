from pydantic import BaseModel
from typing import List, Any
from datetime import datetime


class DelayEstimateInDB(BaseModel):
    id: int
    shipment_id: int
    current_eta: datetime
    predicted_eta: datetime
    expected_delay_hours: float
    contributors: List[Any]
    calculated_at: datetime

    class Config:
        from_attributes = True