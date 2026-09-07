from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.enums import UserRole


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: UserRole = UserRole.COMPANY
    company_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserInDB(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    company_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInDB
