from typing import List, Dict, Any


def compare_documents(extractions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compare values extracted from two or more documents.

    `extractions` is a list of dicts shaped {"type": <doc type>, "data": <extracted_json>},
    as built by routers/documents.py. Keys the caller reads back are
    "field", "values" and "description".
    """
    discrepancies: List[Dict[str, Any]] = []
    if not extractions or len(extractions) < 2:
        return discrepancies

    fields_to_compare = ["quantity", "weight", "value", "cargo"]
    for field in fields_to_compare:
        values: Dict[str, Any] = {}
        for ext in extractions:
            data = ext.get("data") or {}
            if field in data:
                values[ext.get("type") or "UNKNOWN"] = data[field]

        if len(values) >= 2:
            unique_values = set()
            for v in values.values():
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    unique_values.add(round(float(v), 2))
                else:
                    unique_values.add(str(v).strip().lower())

            if len(unique_values) > 1:
                detail = ", ".join(f"{k}={v}" for k, v in values.items())
                discrepancies.append({
                    "field": field,
                    "values": values,
                    "description": f"Values differ across documents: {detail}",
                })

    return discrepancies
