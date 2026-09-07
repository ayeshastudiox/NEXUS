from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base
from app.models.enums import RiskLevel


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False)
    score = Column(Integer, nullable=False)
    level = Column(Enum(RiskLevel), nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    shipment = relationship("Shipment", back_populates="risk_assessments")
    factors = relationship("RiskFactor", back_populates="risk_assessment", cascade="all, delete-orphan")


class RiskFactor(Base):
    __tablename__ = "risk_factors"

    id = Column(Integer, primary_key=True, index=True)
    risk_assessment_id = Column(Integer, ForeignKey("risk_assessments.id"), nullable=False)
    name = Column(String, nullable=False)
    points = Column(Integer, nullable=False)
    description = Column(String, nullable=False)

    # Relationships
    risk_assessment = relationship("RiskAssessment", back_populates="factors")