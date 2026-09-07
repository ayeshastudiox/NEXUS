from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.database.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)
    entity_ref = Column(String, nullable=True)
    changes = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
