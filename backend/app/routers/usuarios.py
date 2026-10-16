from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.config import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.services.auth_service import get_current_user, require_role, obtener_password_hash
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# ==========================================
# ESQUEMAS
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
# 1. LISTAR TODOS LOS USUARIOS (Solo Admin)
# ==========================================
@router.get("/usuarios", response_model=List[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["Administrador"]))
):
    usuarios = db.query(Usuario).all()
    return usuarios


# ==========================================
# 2. CREAR USUARIO (Solo Admin)
# ==========================================
@router.post("/usuarios", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    datos: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["Administrador"]))
):
    # Verificar que el username no exista
    existe = db.query(Usuario).filter(Usuario.username == datos.username).first()
    if existe:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    # Verificar que el email no exista
    existe_email = db.query(Usuario).filter(Usuario.email == datos.email).first()
    if existe_email:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Validar rol
    roles_validos = ["Administrador", "Recepcionista"]
    if datos.rol not in roles_validos:
        raise HTTPException(status_code=400, detail=f"Rol no válido. Debe ser uno de: {roles_validos}")
    
    nuevo_usuario = Usuario(
        username=datos.username,
        password_hash=obtener_password_hash(datos.password),
        nombres=datos.nombres,
        apellidos=datos.apellidos,
        email=datos.email,
        rol=datos.rol,
        estado=datos.estado,
        fecha_registro=datetime.now()
    )
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    return nuevo_usuario


# ==========================================
# 3. ACTUALIZAR USUARIO (Solo Admin)
# ==========================================
@router.put("/usuarios/{id_usuario}", response_model=UsuarioResponse)
def actualizar_usuario(
    id_usuario: int,
    datos: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["Administrador"]))
):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Actualizar campos si se proporcionaron
    if datos.nombres is not None:
        usuario.nombres = datos.nombres
    if datos.apellidos is not None:
        usuario.apellidos = datos.apellidos
    if datos.email is not None:
        # Verificar que el email no esté en uso por otro usuario
        existe_email = db.query(Usuario).filter(Usuario.email == datos.email, Usuario.id_usuario != id_usuario).first()
        if existe_email:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        usuario.email = datos.email
    if datos.rol is not None:
        roles_validos = ["Administrador", "Recepcionista"]
        if datos.rol not in roles_validos:
            raise HTTPException(status_code=400, detail=f"Rol no válido")
        usuario.rol = datos.rol
    if datos.estado is not None:
        estados_validos = ["Activo", "Inactivo"]
        if datos.estado not in estados_validos:
            raise HTTPException(status_code=400, detail=f"Estado no válido")
        usuario.estado = datos.estado
    if datos.password is not None:
        usuario.password_hash = obtener_password_hash(datos.password)
    
    db.commit()
    db.refresh(usuario)
    
    return usuario


# ==========================================
# 4. ELIMINAR USUARIO (Solo Admin)
# ==========================================
@router.delete("/usuarios/{id_usuario}")
def eliminar_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["Administrador"]))
):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # No permitir que un admin se elimine a sí mismo
    if usuario.id_usuario == current_user.id_usuario:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    
    db.delete(usuario)
    db.commit()
    
    return {"mensaje": "Usuario eliminado correctamente"}