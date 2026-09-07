from typing import Dict, Any
from app.config import settings


def get_llm_config() -> Dict[str, str]:
    return {
        "provider": settings.LLM_PROVIDER,
        "api_key": settings.LLM_API_KEY,
        "model": settings.LLM_MODEL,
        "base_url": settings.LLM_BASE_URL
    }


def generate_response(context: dict, query: str) -> str:
    config = get_llm_config()
    system_prompt = f"""You are NEXUS AI Logistics Analyst. Answer based ONLY on the provided context data.
Never invent shipment data, dates, or numbers not present in the context.

CONTEXT DATA:
{context}

RULES:
1. Only use facts from the context
2. If data is not available, say so
3. Be concise and professional
4. Format answers with sections: WHY?, IMPACT, RECOMMENDED ACTION"""
    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=config["api_key"],
            base_url=config["base_url"]
        )
        response = client.chat.completions.create(
            model=config["model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception:
        return "LLM provider not available. Using rule-based analysis."