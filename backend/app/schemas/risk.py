from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.models.enums import RiskLevel


class RiskFactorInDB(BaseModel):
    id: int
    risk_assessment_id: int
    name: str
    points: int
    description: str

    class Config:
        from_attributes = True


class RiskAssessmentInDB(BaseModel):
    id: int
    shipment_id: int
    score: int
    level: RiskLevel
    calculated_at: datetime
    factors: List[RiskFactorInDB]

    class Config:
        from_attributes = True