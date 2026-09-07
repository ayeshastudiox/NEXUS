from sqlalchemy import Column, Integer, String, DateTime, Enum, JSON, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base
from app.models.enums import TransportMode, ShipmentStatus, DataSource


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    shipment_ref = Column(String, unique=True, index=True, nullable=False)
    container_number = Column(String, unique=True, index=True, nullable=True)
    booking_number = Column(String, unique=True, index=True, nullable=True)
    awb_number = Column(String, unique=True, index=True, nullable=True)
    bol_number = Column(String, unique=True, index=True, nullable=True)
    train_number = Column(String, unique=True, index=True, nullable=True)
    transport_mode = Column(Enum(TransportMode), nullable=False)
    carrier = Column(String, nullable=False)
    company_name = Column(String, nullable=True, index=True)
    cargo_description = Column(String, nullable=True)
    cargo_weight_kg = Column(Float, nullable=True)
    cargo_value_usd = Column(Float, nullable=True)
    origin_name = Column(String, nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_name = Column(String, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    route_waypoints = Column(JSON, nullable=False)
    status = Column(Enum(ShipmentStatus), nullable=False, default=ShipmentStatus.IN_TRANSIT)
    original_eta = Column(DateTime, nullable=False)
    current_eta = Column(DateTime, nullable=False)
    data_source = Column(Enum(DataSource), nullable=False, default=DataSource.SIMULATED)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tracking_events = relationship("TrackingEvent", back_populates="shipment", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="shipment", cascade="all, delete-orphan")
    document_discrepancies = relationship("DocumentDiscrepancy", back_populates="shipment", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="shipment", cascade="all, delete-orphan")
    delay_estimates = relationship("DelayEstimate", back_populates="shipment", cascade="all, delete-orphan")
    disruption_links = relationship("ShipmentDisruptionLink", back_populates="shipment", cascade="all, delete-orphan")
    exceptions = relationship("ShipmentException", back_populates="shipment", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="shipment", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="shipment", cascade="all, delete-orphan")
