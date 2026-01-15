"""User authentication and authorization with SQLAlchemy database.

Features:
- PostgreSQL/SQLite user storage
- JWT tokens with 7-day expiration
- BCrypt password hashing
- Protected endpoints with authentication
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from storage.database import get_db
from storage.models import User

router = APIRouter(prefix="/v1/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    name: str | None = Field(None, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: str
    email: str
    name: str | None
    createdAt: str


class UserProfileUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    """Dependency to get current authenticated user"""
    token = None
    if credentials and getattr(credentials, "credentials", None):
        token = credentials.credentials
    # Fallback to cookie (httpOnly) if header not provided
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
        ) from None
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    # Return as dict for compatibility with existing code
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "createdAt": user.created_at.isoformat(),
    }


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> dict | None:
    """Return the current user if authenticated, else None.

    If credentials are provided but invalid/expired, raise 401. We do not
    silently downgrade invalid auth to anonymous.
    """

    token = None
    if credentials and getattr(credentials, "credentials", None):
        token = credentials.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        return None

    return await get_current_user(request=request, credentials=credentials, db=db)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    response: Response,
    db: Session = Depends(get_db),
):
    """Register a new user"""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create user with hashed password
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create access token
    access_token = create_access_token(data={"sub": user.id})

    # Set httpOnly cookie for browser clients. Keep JSON body for API clients.
    try:
        secure_cookie = os.getenv("JWT_COOKIE_SECURE", "1") == "1"
        max_age = ACCESS_TOKEN_EXPIRE_MINUTES * 60
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=max_age,
            path="/",
        )
    except Exception:
        # If cookie can't be set (unlikely), fall back to returning token in body only
        pass

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    """Login user and return JWT token"""
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Create access token
    access_token = create_access_token(data={"sub": user.id})

    # Set httpOnly cookie for browser clients. Keep JSON body for API clients.
    try:
        secure_cookie = os.getenv("JWT_COOKIE_SECURE", "1") == "1"
        max_age = ACCESS_TOKEN_EXPIRE_MINUTES * 60
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=max_age,
            path="/",
        )
    except Exception:
        pass

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """Logout by clearing the access_token cookie for browser clients."""
    # Create the response we will return and ensure the delete-cookie header
    resp = Response(status_code=status.HTTP_204_NO_CONTENT)
    try:
        resp.delete_cookie(key="access_token", path="/")
    except Exception:
        pass

    return resp


@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "createdAt": current_user["createdAt"],
    }


@router.patch("/me", response_model=UserProfile)
async def update_profile(
    updates: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile"""
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields if provided
    if updates.name is not None:
        user.name = updates.name
    if updates.email is not None:
        # Check if new email is already taken
        existing = (
            db.query(User)
            .filter(User.email == updates.email, User.id != user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use"
            )
        user.email = updates.email

    user.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "createdAt": user.created_at.isoformat(),
    }
