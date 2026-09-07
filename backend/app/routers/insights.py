from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.ai import AIInsight
from app.schemas.ai import AIInsightInDB

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("/", response_model=List[AIInsightInDB])
def list_insights(db: Session = Depends(get_db)):
    insights = db.query(AIInsight).order_by(AIInsight.created_at.desc()).limit(10).all()
    return insights