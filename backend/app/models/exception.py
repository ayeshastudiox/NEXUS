from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base
from app.models.enums import ExceptionPriority


class ShipmentException(Base):
    __tablename__ = "shipment_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False)
    reason_summary = Column(String, nullable=False)
    priority = Column(Enum(ExceptionPriority), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    shipment = relationship("Shipment", back_populates="exceptions")