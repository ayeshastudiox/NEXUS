from pydantic import BaseModel
from typing import List


class NetworkHubInDB(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    location_type: str
    active_shipments: int = 0
    active_disruptions: List[dict] = []

    class Config:
        from_attributes = True
