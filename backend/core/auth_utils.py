"""
JWT Authentication + Password Hashing Utilities.
"""
import hashlib
import hmac
import json
import time
import base64
import os
from functools import wraps
from fastapi import Request, HTTPException

# Secret key para JWT — en producción usar variable de entorno
JWT_SECRET = os.getenv("JWT_SECRET", "papyser-mvp-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """Hash password con SHA-256 + salt. Para MVP es suficiente."""
    salt = "papyser-salt-mvp"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verificar password contra hash."""
    return hash_password(password) == password_hash

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def _base64url_decode(data: str) -> bytes:
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)

def create_jwt(payload: dict) -> str:
    """Crear JWT token manualmente (sin dependencia PyJWT para MVP ligero)."""
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    
    payload["exp"] = int(time.time()) + (JWT_EXPIRATION_HOURS * 3600)
    payload["iat"] = int(time.time())
    
    header_b64 = _base64url_encode(json.dumps(header).encode())
    payload_b64 = _base64url_encode(json.dumps(payload).encode())
    
    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(JWT_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)
    
    return f"{message}.{signature_b64}"

def decode_jwt(token: str) -> dict:
    """Decodificar y verificar JWT token."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Token inválido")
        
        header_b64, payload_b64, signature_b64 = parts
        
        # Verificar firma
        message = f"{header_b64}.{payload_b64}"
        expected_signature = hmac.new(JWT_SECRET.encode(), message.encode(), hashlib.sha256).digest()
        actual_signature = _base64url_decode(signature_b64)
        
        if not hmac.compare_digest(expected_signature, actual_signature):
            raise ValueError("Firma inválida")
        
        # Decodificar payload
        payload = json.loads(_base64url_decode(payload_b64))
        
        # Verificar expiración
        if payload.get("exp", 0) < time.time():
            raise ValueError("Token expirado")
        
        return payload
    except Exception as e:
        raise ValueError(f"Token inválido: {str(e)}")

def get_current_user(request: Request) -> dict:
    """Extraer usuario actual del JWT en el header Authorization."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    
    token = auth_header[7:]
    try:
        payload = decode_jwt(token)
        return payload
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

def require_role(*roles):
    """Decorator factory para requerir roles específicos."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get('request') or args[0]
            user = get_current_user(request)
            if user.get("role") not in roles:
                raise HTTPException(status_code=403, detail="No tienes permisos para esta acción")
            kwargs['current_user'] = user
            return await func(*args, **kwargs)
        return wrapper
    return decorator
