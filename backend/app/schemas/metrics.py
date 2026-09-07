from pydantic import BaseModel


class MetricsResponse(BaseModel):
    active_shipments: int
    high_risk: int
    delayed: int
    exceptions: int
    documents_pending: int
    average_risk: float