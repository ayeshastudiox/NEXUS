from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RecommendationInDB(BaseModel):
    id: int
    shipment_id: int
    text: str
    source_factor: str
    created_at: datetime

    class Config:
        from_attributes = True