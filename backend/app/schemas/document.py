from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import DocumentType, DocumentStatus


class DocumentBase(BaseModel):
    shipment_id: int
    type: DocumentType
    file_path: str
    status: DocumentStatus


class DocumentInDB(DocumentBase):
    id: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentExtractionInDB(BaseModel):
    id: int
    document_id: int
    extracted_json: Dict[str, Any]
    confidence: float

    class Config:
        from_attributes = True


class DocumentDiscrepancyInDB(BaseModel):
    id: int
    shipment_id: int
    field_name: str
    values_by_document: Dict[str, Any]
    difference_description: str
    potential_impact: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    document_id: int
    message: str
    extraction_status: str