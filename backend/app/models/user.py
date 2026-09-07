from sqlalchemy import Column, Integer, String, DateTime, Enum
from datetime import datetime
from app.database.session import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.COMPANY)
    company_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
