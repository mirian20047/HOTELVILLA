import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
import bcrypt

from app.models.usuario import Usuario
from app.config import get_db, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# Configuración de seguridad (usando las variables de config.py)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ==========================================
# 1. FUNCIONES DE CONTRASEÑA (SIN PASSLIB)
# ==========================================
def verificar_password(password_plano: str, password_hash: str) -> bool:
    """Verifica la contraseña usando bcrypt nativo"""
    try:
        return bcrypt.checkpw(
            password_plano.encode('utf-8'), 
            password_hash.encode('utf-8')
        )
    except Exception:
        return False

def obtener_password_hash(password: str) -> str:
    """Genera el hash de la contraseña usando bcrypt nativo"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# ==========================================
# 2. FUNCIONES DE TOKEN Y AUTENTICACIÓN
# ==========================================
def crear_token_acceso(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def autenticar_usuario(db: Session, username: str, password: str) -> Optional[Usuario]:
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if not usuario or not verificar_password(password, usuario.password_hash) or usuario.estado != "Activo":
        return None
    return usuario

def generar_token_login(db: Session, username: str, password: str):
    usuario = autenticar_usuario(db, username, password)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = crear_token_acceso(
        data={"sub": usuario.username, "rol": usuario.rol, "id_usuario": usuario.id_usuario},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "usuario": {
            "id_usuario": usuario.id_usuario,
            "username": usuario.username,
            "nombres": usuario.nombres,
            "apellidos": usuario.apellidos,
            "email": usuario.email,
            "rol": usuario.rol
        }
    }


# ==========================================
# 3. DEPENDENCIAS DE PROTECCIÓN DE RUTAS
# ==========================================
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: list):
    def role_checker(current_user: Usuario = Depends(get_current_user)):
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción"
            )
        return current_user
    return role_checker