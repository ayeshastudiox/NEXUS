from sqlalchemy import Column, Integer, String, Enum, Boolean, Float
from app.database.session import Base
import enum


class LocationType(str, enum.Enum):
    PORT = "PORT"
    AIRPORT = "AIRPORT"
    RAIL_STATION = "RAIL_STATION"
    ROAD_CHECKPOINT = "ROAD_CHECKPOINT"


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    location_type = Column(Enum(LocationType), nullable=False)
    is_hub = Column(Boolean, default=False)