from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
import bcrypt
from app.config import get_db, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.models.usuario import Usuario
from app.schemas.usuario import LoginRequest, TokenResponse, UsuarioResponse

router = APIRouter()

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica la contraseña usando bcrypt nativo de forma segura"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            str(hashed_password).encode('utf-8')
        )
    except Exception:
        # Si el hash está corrupto, falla de forma segura (devuelve False) en vez de crashear
        return False

@router.post("/login", response_model=TokenResponse)
def login(datos_login: LoginRequest, db: Session = Depends(get_db)):
    # 1. Buscar usuario en la base de datos
    usuario = db.query(Usuario).filter(Usuario.username == datos_login.username).first()
    
    # 2. Validar que exista y que la contraseña sea correcta
    if not usuario or not verificar_password(datos_login.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Validar que esté activo
    if usuario.estado != "Activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )
    
    # 4. Generar token JWT real
    access_token = jwt.encode(
        {
            "sub": usuario.username,
            "rol": usuario.rol,
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
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
            "rol": usuario.rol,
            "estado": usuario.estado,
            "fecha_registro": usuario.fecha_registro
        }
    }