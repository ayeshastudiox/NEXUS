from sqlalchemy import Column, Integer, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base


class DelayEstimate(Base):
    __tablename__ = "delay_estimates"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False)
    current_eta = Column(DateTime, nullable=False)
    predicted_eta = Column(DateTime, nullable=False)
    expected_delay_hours = Column(Float, nullable=False)
    contributors = Column(JSON, nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    shipment = relationship("Shipment", back_populates="delay_estimates")