from sqlalchemy import Column, Integer, String, Enum, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.models.enums import DisruptionCategory, DisruptionSeverity


class ExternalDisruption(Base):
    __tablename__ = "external_disruptions"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(Enum(DisruptionCategory), nullable=False)
    location_name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    severity = Column(Enum(DisruptionSeverity), nullable=False)
    potential_impact_hours_min = Column(Integer, nullable=False)
    potential_impact_hours_max = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    active = Column(Boolean, default=True)

    # Relationships
    shipment_links = relationship("ShipmentDisruptionLink", back_populates="disruption", cascade="all, delete-orphan")


class ShipmentDisruptionLink(Base):
    __tablename__ = "shipment_disruption_links"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False)
    disruption_id = Column(Integer, ForeignKey("external_disruptions.id"), nullable=False)

    # Relationships
    shipment = relationship("Shipment", back_populates="disruption_links")
    disruption = relationship("ExternalDisruption", back_populates="shipment_links")