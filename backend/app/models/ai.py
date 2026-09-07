from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from datetime import datetime
from app.database.session import Base
import enum


class AIQueryScope(str, enum.Enum):
    GLOBAL = "GLOBAL"
    SHIPMENT = "SHIPMENT"


class AIQuery(Base):
    __tablename__ = "ai_queries"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    scope = Column(Enum(AIQueryScope), nullable=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class InsightSourceType(str, enum.Enum):
    RISK = "RISK"
    DISRUPTION = "DISRUPTION"
    DOCUMENT = "DOCUMENT"
    DELAY = "DELAY"
    NETWORK = "NETWORK"


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    source_type = Column(Enum(InsightSourceType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)