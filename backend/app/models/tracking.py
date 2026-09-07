from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base
from app.models.enums import TrackingEventType, EventSeverity


class TrackingEvent(Base):
    __tablename__ = "tracking_events"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    location_name = Column(String, nullable=False)
    event_type = Column(Enum(TrackingEventType), nullable=False)
    description = Column(String, nullable=True)
    severity = Column(Enum(EventSeverity), nullable=False, default=EventSeverity.NORMAL)

    # Relationships
    shipment = relationship("Shipment", back_populates="tracking_events")