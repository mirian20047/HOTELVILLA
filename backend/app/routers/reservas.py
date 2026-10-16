from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date

from app.config import get_db
from app.models.reserva import Reserva
from app.schemas.reserva import ReservaCreate, ReservaResponse
from app.services.auth_service import get_current_user
from app.models.usuario import Usuario

router = APIRouter()

def generar_codigo_reserva(db: Session) -> str:
    año_actual = datetime.now().year
    cantidad = db.query(Reserva).filter(Reserva.codigo_reserva.like(f"RES-{año_actual}-%")).count()
    nuevo_numero = cantidad + 1
    return f"RES-{año_actual}-{nuevo_numero:03d}"

@router.post("/reservas", response_model=ReservaResponse, status_code=status.HTTP_201_CREATED)
def crear_reserva(
    reserva: ReservaCreate, 
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)  # <--- OBTIENE AL USUARIO AUTENTICADO
):
    if reserva.fecha_salida <= reserva.fecha_entrada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de salida debe ser posterior a la fecha de entrada"
        )

    codigo = generar_codigo_reserva(db)

    nueva_reserva = Reserva(
        codigo_reserva=codigo,
        fecha_entrada=reserva.fecha_entrada,
        fecha_salida=reserva.fecha_salida,
        canal_reserva=reserva.canal_reserva,
        estado_reserva="Pendiente",
        id_cliente=reserva.id_cliente,
        id_tipo_habitacion=reserva.id_tipo_habitacion,
        id_usuario_registro=current_user.id_usuario  # <--- USA EL ID DEL USUARIO ACTUAL
    )
    
    db.add(nueva_reserva)
    db.commit()
    db.refresh(nueva_reserva)
    
    return nueva_reserva

@router.get("/reservas")
def listar_reservas(db: Session = Depends(get_db)):
    reservas = db.query(Reserva).order_by(Reserva.fecha_registro.desc()).all()
    
    resultado = []
    for r in reservas:
        resultado.append({
            "id_reserva": r.id_reserva,
            "codigo_reserva": r.codigo_reserva,
            "fecha_entrada": r.fecha_entrada.isoformat() if r.fecha_entrada else None,
            "fecha_salida": r.fecha_salida.isoformat() if r.fecha_salida else None,
            "estado_reserva": r.estado_reserva,
            "id_cliente": r.id_cliente,
            "id_tipo_habitacion": r.id_tipo_habitacion,
            "id_habitacion": r.id_habitacion,  # <-- CAMPO AGREGADO
            "monto_total_estimado": float(r.monto_total_estimado) if r.monto_total_estimado else 0.0,
            "monto_pagado": float(r.monto_pagado) if r.monto_pagado else 0.0,
            "estado_pago": r.estado_pago
        })
    
    return resultado

@router.get("/reservas/{id_reserva}", response_model=ReservaResponse)
def obtener_reserva(id_reserva: int, db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id_reserva == id_reserva).first()
    if not reserva:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")
    return reserva

@router.put("/reservas/{id_reserva}/estado", response_model=ReservaResponse)
def actualizar_estado_reserva(id_reserva: int, nuevo_estado: str, db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id_reserva == id_reserva).first()
    if not reserva:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")
    
    estados_validos = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada']
    if nuevo_estado not in estados_validos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Estado no válido. Debe ser uno de: {estados_validos}")
    
    reserva.estado_reserva = nuevo_estado
    db.commit()
    db.refresh(reserva)
    return reserva