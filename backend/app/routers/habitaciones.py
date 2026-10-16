from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import io

from app.config import get_db
from app.models.habitacion import Habitacion, TipoHabitacion
from app.schemas.habitacion import HabitacionCreate, HabitacionResponse

router = APIRouter()

# 1. CREAR una nueva habitación
@router.post("/habitaciones", response_model=HabitacionResponse, status_code=status.HTTP_201_CREATED)
def crear_habitacion(habitacion: HabitacionCreate, db: Session = Depends(get_db)):
    # Verificar si el número de habitación ya existe
    existe = db.query(Habitacion).filter(
        Habitacion.numero_habitacion == habitacion.numero_habitacion
    ).first()
    
    if existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Ya existe una habitación con ese número"
        )
    
    nueva_habitacion = Habitacion(**habitacion.dict())
    db.add(nueva_habitacion)
    db.commit()
    db.refresh(nueva_habitacion)
    
    return nueva_habitacion

# 2. LISTAR todas las habitaciones
@router.get("/habitaciones", response_model=List[HabitacionResponse])
def listar_habitaciones(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    habitaciones = db.query(Habitacion).options(joinedload(Habitacion.tipo_habitacion)).all()
    return habitaciones

# 3. OBTENER una habitación por su ID
@router.get("/habitaciones/{id_habitacion}", response_model=HabitacionResponse)
def obtener_habitacion(id_habitacion: int, db: Session = Depends(get_db)):
    habitacion = db.query(Habitacion).filter(Habitacion.id_habitacion == id_habitacion).first()
    
    if not habitacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Habitación no encontrada"
        )
    return habitacion

# 4. ACTUALIZAR el estado de una habitación
@router.put("/habitaciones/{id_habitacion}/estado", response_model=HabitacionResponse)
def actualizar_estado_habitacion(id_habitacion: int, nuevo_estado: str, db: Session = Depends(get_db)):
    habitacion = db.query(Habitacion).filter(Habitacion.id_habitacion == id_habitacion).first()
    
    if not habitacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Habitación no encontrada"
        )
    
    # Validar que el estado sea uno de los permitidos
    estados_validos = ['Disponible', 'Ocupada', 'En limpieza', 'En mantenimiento', 'Reservada']
    if nuevo_estado not in estados_validos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado no válido. Debe ser uno de: {estados_validos}"
        )
    
    habitacion.estado_actual = nuevo_estado
    db.commit()
    db.refresh(habitacion)
    return habitacion

# 5. ELIMINAR una habitación
@router.delete("/habitaciones/{id_habitacion}")
def eliminar_habitacion(id_habitacion: int, db: Session = Depends(get_db)):
    habitacion = db.query(Habitacion).filter(Habitacion.id_habitacion == id_habitacion).first()
    
    if not habitacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Habitación no encontrada"
        )
    
    db.delete(habitacion)
    db.commit()
    return {"mensaje": "Habitación eliminada exitosamente"}

# 6. ACTUALIZAR una habitación completa
@router.put("/habitaciones/{id_habitacion}", response_model=HabitacionResponse)
def actualizar_habitacion(
    id_habitacion: int, 
    habitacion_data: HabitacionCreate, 
    db: Session = Depends(get_db)
):
    habitacion = db.query(Habitacion).filter(Habitacion.id_habitacion == id_habitacion).first()
    
    if not habitacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Habitación no encontrada"
        )
    
    # Verificar que el nuevo número no esté en uso por otra habitación
    if habitacion_data.numero_habitacion != habitacion.numero_habitacion:
        existe = db.query(Habitacion).filter(
            Habitacion.numero_habitacion == habitacion_data.numero_habitacion
        ).first()
        if existe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una habitación con ese número"
            )
    
    # Actualizar campos
    habitacion.numero_habitacion = habitacion_data.numero_habitacion
    habitacion.id_tipo_habitacion = habitacion_data.id_tipo_habitacion
    habitacion.piso = habitacion_data.piso
    habitacion.estado_actual = habitacion_data.estado_actual
    
    db.commit()
    db.refresh(habitacion)
    return habitacion

# 7. LISTAR HABITACIONES DISPONIBLES CON PRECIOS
@router.get("/habitaciones-disponibles")
def habitaciones_disponibles_con_precios(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from app.models.habitacion import TipoHabitacion
    
    habitaciones = db.query(Habitacion).options(
        joinedload(Habitacion.tipo_habitacion)
    ).filter(Habitacion.estado_actual == "Disponible").all()
    
    resultado = []
    for h in habitaciones:
        resultado.append({
            "id_habitacion": h.id_habitacion,
            "numero_habitacion": h.numero_habitacion,
            "piso": h.piso,
            "estado_actual": h.estado_actual,
            "tipo_habitacion": {
                "id_tipo_habitacion": h.tipo_habitacion.id_tipo_habitacion,
                "nombre": h.tipo_habitacion.nombre,
                "capacidad_personas": h.tipo_habitacion.capacidad_personas,
                "tarifa_base": float(h.tipo_habitacion.tarifa_base),
                "descripcion": h.tipo_habitacion.descripcion,
                "tipo_cama": h.tipo_habitacion.tipo_cama,
                "amenities": h.tipo_habitacion.amenities,
                "imagen_url": getattr(h.tipo_habitacion, "imagen_url", None)
            } if h.tipo_habitacion else None
        })
    return resultado


# ==========================================
# 8. LISTAR TIPOS DE HABITACIÓN
# ==========================================
@router.get("/tipos-habitacion")
def listar_tipos_habitacion(db: Session = Depends(get_db)):
    tipos = db.query(TipoHabitacion).all()
    return tipos

# ==========================================
# 9. CREAR TIPO DE HABITACIÓN (FLEXIBLE)
# ==========================================
@router.post("/tipos-habitacion", status_code=status.HTTP_201_CREATED)
def crear_tipo_habitacion(
    db: Session = Depends(get_db),
    body: dict = None
):
    print(f"\n🔍 CREACIÓN - Body recibido: {body}")
    
    try:
        if not body:
            raise HTTPException(status_code=400, detail="No se recibieron datos")
        
        # Validar que no exista el nombre
        nombre = body.get('nombre', '').strip()
        existe = db.query(TipoHabitacion).filter(TipoHabitacion.nombre == nombre).first()
        if existe:
            raise HTTPException(status_code=400, detail="Ya existe un tipo de habitación con ese nombre")
        
        # Crear explícitamente campo por campo
        nuevo_tipo = TipoHabitacion(
            nombre=nombre,
            capacidad_personas=int(body.get('capacidad_personas', 1)),
            descripcion=body.get('descripcion') if body.get('descripcion') else None,
            tipo_cama=body.get('tipo_cama') if body.get('tipo_cama') else None,
            amenities=body.get('amenities') if body.get('amenities') else None,
            tarifa_base=float(body.get('tarifa_base', 0)),
            estado=body.get('estado', 'Activo'),
            imagen_url=body.get('imagen_url') if body.get('imagen_url') else None
        )
        
        db.add(nuevo_tipo)
        db.commit()
        db.refresh(nuevo_tipo)
        
        print(f"✅ Tipo creado: {nuevo_tipo.nombre}\n")
        return nuevo_tipo
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}\n")
        raise HTTPException(status_code=500, detail=f"Error al crear: {str(e)}")

# ==========================================
# 10. ACTUALIZAR TIPO DE HABITACIÓN (FLEXIBLE)
# ==========================================
@router.put("/tipos-habitacion/{id_tipo}")
def actualizar_tipo_habitacion(
    id_tipo: int,
    db: Session = Depends(get_db),
    body: dict = None  # Aceptar dict genérico
):
    print(f"\n🔍 RECEPCIÓN - ID: {id_tipo}")
    print(f"   Body recibido: {body}")
    print(f"   Tipo de body: {type(body)}\n")
    
    try:
        if not body:
            raise HTTPException(status_code=400, detail="No se recibieron datos")
        
        # Buscar el tipo existente
        tipo = db.query(TipoHabitacion).filter(TipoHabitacion.id_tipo_habitacion == id_tipo).first()
        if not tipo:
            raise HTTPException(status_code=404, detail="Tipo de habitación no encontrado")
        
        # Validar nombre único
        nombre = body.get('nombre', '').strip()
        if nombre != tipo.nombre:
            existe = db.query(TipoHabitacion).filter(
                TipoHabitacion.nombre == nombre,
                TipoHabitacion.id_tipo_habitacion != id_tipo
            ).first()
            if existe:
                raise HTTPException(status_code=400, detail="Ya existe otro tipo con ese nombre")
        
        # Actualizar campos manualmente
        tipo.nombre = nombre
        tipo.capacidad_personas = int(body.get('capacidad_personas', 1))
        tipo.descripcion = body.get('descripcion') if body.get('descripcion') else None
        tipo.tipo_cama = body.get('tipo_cama') if body.get('tipo_cama') else None
        tipo.amenities = body.get('amenities') if body.get('amenities') else None
        tipo.tarifa_base = float(body.get('tarifa_base', 0))
        tipo.estado = body.get('estado', 'Activo')
        # Solo se toca la foto si el frontend envía la clave (permite conservarla al editar)
        if 'imagen_url' in body:
            tipo.imagen_url = body.get('imagen_url') or None
        
        print(f"✅ Actualizando: {tipo.nombre}, tarifa: {tipo.tarifa_base}")
        db.commit()
        db.refresh(tipo)
        
        print(f"✅ Éxito\n")
        return tipo
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}\n")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==========================================
# 11. ELIMINAR TIPO DE HABITACIÓN
# ==========================================
@router.delete("/tipos-habitacion/{id_tipo}")
def eliminar_tipo_habitacion(id_tipo: int, db: Session = Depends(get_db)):
    tipo = db.query(TipoHabitacion).filter(TipoHabitacion.id_tipo_habitacion == id_tipo).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de habitación no encontrado")
    
    # Verificar que no haya habitaciones usando este tipo
    habitaciones_usando = db.query(Habitacion).filter(Habitacion.id_tipo_habitacion == id_tipo).count()
    if habitaciones_usando > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar: hay {habitaciones_usando} habitación(es) usando este tipo"
        )
    
    db.delete(tipo)
    db.commit()
    return {"mensaje": "Tipo de habitación eliminado"}


# ==========================================
# 12. FOTOS DE TIPOS DE HABITACIÓN
# Subida real de imágenes (cualquier formato de imagen).
# Se normalizan a JPEG liviano (máx 1280px) para no relentizar el sistema.
# ==========================================
UPLOAD_DIR_TIPOS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads",
    "tipos",
)
MAX_IMAGEN_BYTES = 5 * 1024 * 1024  # 5 MB


def _normalizar_imagen(contenido: bytes) -> bytes:
    """Convierte cualquier imagen a JPEG optimizado. Lanza ValueError si no es imagen."""
    try:
        from PIL import Image
    except ImportError:
        return contenido
    try:
        img = Image.open(io.BytesIO(contenido))
        img = img.convert("RGB")
        img.thumbnail((1280, 1280), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82, optimize=True)
        return buf.getvalue()
    except Exception:
        raise ValueError("El archivo no es una imagen válida")


def _guardar_foto_tipo(id_tipo: int, contenido: bytes) -> str:
    os.makedirs(UPLOAD_DIR_TIPOS, exist_ok=True)
    # Borra fotos anteriores de este tipo para no acumular archivos
    for f in os.listdir(UPLOAD_DIR_TIPOS):
        if f.startswith(f"tipo_{id_tipo}_"):
            try:
                os.remove(os.path.join(UPLOAD_DIR_TIPOS, f))
            except OSError:
                pass
    nombre = f"tipo_{id_tipo}_{uuid.uuid4().hex[:8]}.jpg"
    with open(os.path.join(UPLOAD_DIR_TIPOS, nombre), "wb") as fh:
        fh.write(_normalizar_imagen(contenido))
    return f"/api/uploads/tipos/{nombre}"


def _borrar_archivo_local(imagen_url: str | None) -> None:
    if not imagen_url or not imagen_url.startswith("/api/uploads/"):
        return
    ruta = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        imagen_url.replace("/api/uploads/", "uploads/").lstrip("/"),
    )
    try:
        if os.path.isfile(ruta):
            os.remove(ruta)
    except OSError:
        pass


@router.post("/tipos-habitacion/{id_tipo}/imagen")
def subir_imagen_tipo(
    id_tipo: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    tipo = db.query(TipoHabitacion).filter(TipoHabitacion.id_tipo_habitacion == id_tipo).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de habitación no encontrado")

    if not (archivo.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen (JPG, PNG, WEBP, GIF, etc.)")

    contenido = archivo.file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    if len(contenido) > MAX_IMAGEN_BYTES:
        raise HTTPException(status_code=400, detail="La imagen supera los 5 MB")

    try:
        url = _guardar_foto_tipo(id_tipo, contenido)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    _borrar_archivo_local(getattr(tipo, "imagen_url", None))
    tipo.imagen_url = url
    db.commit()
    db.refresh(tipo)
    return tipo


@router.delete("/tipos-habitacion/{id_tipo}/imagen")
def eliminar_imagen_tipo(id_tipo: int, db: Session = Depends(get_db)):
    tipo = db.query(TipoHabitacion).filter(TipoHabitacion.id_tipo_habitacion == id_tipo).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de habitación no encontrado")

    _borrar_archivo_local(getattr(tipo, "imagen_url", None))
    tipo.imagen_url = None
    db.commit()
    db.refresh(tipo)
    return tipo