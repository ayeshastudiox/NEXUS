from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base
from app.models.enums import DocumentType, DocumentStatus


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False)
    type = Column(Enum(DocumentType), nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(Enum(DocumentStatus), nullable=False, default=DocumentStatus.PENDING)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    shipment = relationship("Shipment", back_populates="documents")
    extractions = relationship("DocumentExtraction", back_populates="document", cascade="all, delete-orphan")


class DocumentExtraction(Base):
    __tablename__ = "document_extractions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    extracted_json = Column(JSON, nullable=False)
    confidence = Column(Float, nullable=False)

    # Relationships
    document = relationship("Document", back_populates="extractions")


class DocumentDiscrepancy(Base):
    __tablename__ = "document_discrepancies"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False)
    field_name = Column(String, nullable=False)
    values_by_document = Column(JSON, nullable=False)
    difference_description = Column(String, nullable=False)
    potential_impact = Column(String, nullable=True)

    # Relationships
    shipment = relationship("Shipment", back_populates="document_discrepancies")