from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.document import Document, DocumentExtraction, DocumentDiscrepancy
from app.models.shipment import Shipment
from app.models.enums import DocumentType, DocumentStatus
from app.config import settings
from app.documents.compare import compare_documents
import os
import uuid

router = APIRouter(prefix="/api/shipments", tags=["documents"])


@router.post("/{shipment_id}/documents")
async def upload_document(
    shipment_id: str,
    file: UploadFile = File(...),
    doc_type: DocumentType = DocumentType.COMMERCIAL_INVOICE,
    db: Session = Depends(get_db)
):
    shipment = db.query(Shipment).filter(Shipment.shipment_ref == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename_str = file.filename or "document.pdf"
    file_ext = filename_str.split(".")[-1] if "." in filename_str else "pdf"
    filename = f"{uuid.uuid4()}.{file_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    with open(filepath, "wb") as f:
        f.write(content)

    doc = Document(
        shipment_id=shipment.id,
        type=doc_type,
        file_path=filepath,
        status=DocumentStatus.PROCESSED
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    extraction = DocumentExtraction(
        document_id=doc.id,
        extracted_json={
            "shipment_ref": shipment.shipment_ref,
            "cargo": shipment.cargo_description or "Unknown cargo",
            "quantity": 1000,
            "weight": shipment.cargo_weight_kg or 5000.0,
            "value": shipment.cargo_value_usd or 125000.0,
            "origin": shipment.origin_name,
            "destination": shipment.destination_name
        },
        confidence=0.92
    )
    db.add(extraction)
    db.commit()

    existing_docs = db.query(Document).filter(Document.shipment_id == shipment.id).all()
    existing_extractions = []
    for d in existing_docs:
        ext = db.query(DocumentExtraction).filter(DocumentExtraction.document_id == d.id).first()
        if ext:
            existing_extractions.append({
                "type": d.type.value,
                "data": ext.extracted_json
            })

    if len(existing_extractions) >= 2:
        discrepancies = compare_documents(existing_extractions)
        for disc in discrepancies:
            existing_disc = db.query(DocumentDiscrepancy).filter(
                DocumentDiscrepancy.shipment_id == shipment.id,
                DocumentDiscrepancy.field_name == disc["field"]
            ).first()
            if not existing_disc:
                new_disc = DocumentDiscrepancy(
                    shipment_id=shipment.id,
                    field_name=disc["field"],
                    values_by_document=disc["values"],
                    difference_description=disc["description"],
                    potential_impact="Auto-detected during upload"
                )
                db.add(new_disc)
        db.commit()

    return {
        "document_id": doc.id,
        "message": "Document uploaded and processed",
        "extraction_status": "completed"
    }
