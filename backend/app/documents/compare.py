from typing import List, Dict, Any
from app.models.document import DocumentExtraction, DocumentDiscrepancy


def compare_documents(extractions: List[DocumentExtraction], shipment_id: int) -> List[Dict[str, Any]]:
    discrepancies = []
    if len(extractions) < 2:
        return discrepancies

    fields_to_compare = ["quantity", "weight", "value", "cargo"]
    for field in fields_to_compare:
        values = {}
        for ext in extractions:
            if field in ext.extracted_json:
                values[ext.document_id] = ext.extracted_json[field]

        if len(values) >= 2:
            unique_values = set()
            for v in values.values():
                if isinstance(v, (int, float)):
                    unique_values.add(round(float(v), 2))
                else:
                    unique_values.add(str(v).strip().lower())

            if len(unique_values) > 1:
                discrepancies.append({
                    "field_name": field,
                    "values_by_document": {str(k): v for k, v in values.items()},
                    "difference_description": f"Values differ across documents: {values}",
                    "potential_impact": f"Potential customs / clearance risk for {field}"
                })

    return discrepancies