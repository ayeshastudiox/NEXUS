from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.ai import AIQuery
from app.schemas.ai import AIQueryRequest, AIQueryResponse
from app.ai.analyst import analyze_query
from app.middleware.rate_limiter import ai_rate_limiter

router = APIRouter(prefix="/api/ai", tags=["ai"])


def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    allowed, info = ai_rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {info['limit']} requests per minute. Try again in {info['reset_in']}s."
        )


@router.post("/query", response_model=AIQueryResponse, dependencies=[Depends(check_rate_limit)])
def ai_query(request: AIQueryRequest, db: Session = Depends(get_db)):
    shipment_id_int = None
    if request.shipment_id:
        try:
            from app.models.shipment import Shipment
            s = db.query(Shipment).filter(Shipment.shipment_ref == request.shipment_id).first()
            if s:
                shipment_id_int = s.id
        except Exception:
            pass

    try:
        ai_query_record = AIQuery(
            question=request.question,
            shipment_id=shipment_id_int
        )
        db.add(ai_query_record)
        db.commit()
    except Exception:
        db.rollback()

    try:
        response = analyze_query(request.question, request.shipment_id, db)
        return AIQueryResponse(answer=response["answer"], sections=response.get("sections"))
    except Exception as e:
        return AIQueryResponse(
            answer=f"NEXUS INTELLIGENCE\n\nI encountered an error analyzing your query: {str(e)}\n\nPlease try rephrasing your question.",
            sections=None
        )
