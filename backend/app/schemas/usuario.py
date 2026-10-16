from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ==========================================
# ESQUEMAS PARA USUARIOS (NUEVOS)
# ==========================================

class UsuarioCreate(BaseModel):
    username: str
    password: str
    nombres: str
    apellidos: str
    email: str
    rol: str
    estado: str = "Activo"

class UsuarioResponse(BaseModel):
    id_usuario: int
    username: str
    nombres: str
    apellidos: str
    email: str
    rol: str
    estado: str
    fecha_registro: datetime
    
    class Config:
        from_attributes = True

class UsuarioUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[str] = None
    estado: Optional[str] = None
    password: Optional[str] = None


# ==========================================
# ESQUEMAS PARA AUTENTICACIÓN (EXISTENTES)
# ==========================================

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse