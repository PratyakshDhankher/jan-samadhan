from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
import requests
import os

# Configuration (should be in .env)
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# ------------------- AUTH SCHEMES -------------------
# 1. Standard Scheme (For Citizens logging in via /auth/login)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# 2. Admin Scheme (For Admins logging in via /auth/admin/login)
admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/admin/login")


# ------------------- PASSWORD HASHING -------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ------------------- TOKEN GENERATION & VERIFICATION -------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_google_token(token: str):
    """
    Verifies a Google ID token.
    In production, use the `google-auth` library for local verification to avoid network calls.
    Here we use the tokeninfo endpoint for simplicity.
    """
    try:
        response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google Token")
        claims = response.json()
        if GOOGLE_CLIENT_ID and claims.get("aud") != GOOGLE_CLIENT_ID:
             raise HTTPException(status_code=400, detail="Invalid Client ID")
        return claims
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=400, detail="Token verification failed")


# ------------------- DEPENDENCIES -------------------

# Dependency for Standard/Citizen Users
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return email

# Dependency for Strict Admin Verification
async def get_current_admin(token: str = Depends(admin_oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        
        # STRICT CHECK: Must be an admin
        if email is None or role != "admin":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    return email