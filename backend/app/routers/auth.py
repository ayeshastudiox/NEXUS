from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime
import hashlib
import hmac

from app.database.session import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.user import UserCreate, UserLogin, UserInDB, Token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)


def get_current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    elif authorization:
        token = authorization

    if not token or not token.isdigit():
        return User(id=0, email="guest@nexus.ai", name="Guest", role=UserRole.COMPANY, company_name=None)

    user = db.query(User).filter(User.id == int(token)).first()
    if not user:
        return User(id=0, email="guest@nexus.ai", name="Guest", role=UserRole.COMPANY, company_name=None)
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/register", response_model=Token)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        name=data.name,
        hashed_password=hash_password(data.password),
        role=data.role,
        company_name=data.company_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(
        access_token=str(user.id),
        user=UserInDB.model_validate(user)
    )


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(
        access_token=str(user.id),
        user=UserInDB.model_validate(user)
    )


@router.get("/me", response_model=UserInDB)
def get_me(user: User = Depends(get_current_user)):
    if user.id == 0:
        return UserInDB(
            id=0,
            email="guest@nexus.ai",
            name="Guest User",
            role=UserRole.COMPANY,
            company_name=None,
            created_at=datetime.utcnow()
        )
    return UserInDB.model_validate(user)
