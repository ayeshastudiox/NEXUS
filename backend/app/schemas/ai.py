from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AIQueryRequest(BaseModel):
    question: str
    shipment_id: Optional[str] = None


class AIQueryResponse(BaseModel):
    answer: str
    sections: Optional[dict] = None


class AIInsightInDB(BaseModel):
    id: int
    text: str
    source_type: str
    created_at: datetime

    class Config:
        from_attributes = True