"""
Authentication API Routes.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from backend.database.db import get_db
from backend.core.auth_utils import hash_password, verify_password, create_jwt, get_current_user

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (data.username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_jwt({
        "user_id": user["id"],
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
        "email": user["email"]
    })
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@router.get("/me")
async def get_me(request: Request):
    user = get_current_user(request)
    return user
