from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List
import time

from app.config import get_db
from app.models.reserva import Reserva
from app.models.huesped import Huesped
from app.models.habitacion import Habitacion
from app.models.cliente import Cliente
from app.models.folio import Folio
from app.models.pago import Pago
from app.services.auth_service import get_current_user
from app.models.usuario import Usuario

router = APIRouter()

# Caché en memoria con TTL corto para los conteos más caros
# (ocupación e ingresos se piden en cada visita al Dashboard/Reportes).
# Misma respuesta, solo evita repetir COUNT/SUM en cada request.
_cache: dict = {}
_CACHE_TTL = 30  # segundos


def _get_cached(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < _CACHE_TTL:
        return entry[1]
    return None


def _set_cached(key: str, value):
    _cache[key] = (time.time(), value)

# ==========================================
# 1. REPORTE DE OCUPACIÓN
# ==========================================
@router.get("/reportes/ocupacion")
def reporte_ocupacion(db: Session = Depends(get_db)):
    cached = _get_cached("ocupacion")
    if cached is not None:
        return cached
    total_habitaciones = db.query(Habitacion).count()
    habitaciones_ocupadas = db.query(Habitacion).filter(Habitacion.estado_actual == "Ocupada").count()
    porcentaje_ocupacion = (habitaciones_ocupadas / total_habitaciones * 100) if total_habitaciones > 0 else 0

    result = {
        "total_habitaciones": total_habitaciones,
        "habitaciones_ocupadas": habitaciones_ocupadas,
        "habitaciones_disponibles": total_habitaciones - habitaciones_ocupadas,
        "porcentaje_ocupacion": round(porcentaje_ocupacion, 2)
    }
    _set_cached("ocupacion", result)
    return result

# ==========================================
# 2. REPORTE DE INGRESOS
# ==========================================
@router.get("/reportes/ingresos")
def reporte_ingresos(db: Session = Depends(get_db)):
    cached = _get_cached("ingresos")
    if cached is not None:
        return cached
    total_pagos = db.query(func.sum(Pago.monto)).scalar() or 0
    total_folios_cerrados = db.query(Folio).filter(Folio.estado_folio == "Cerrado").count()

    result = {
        "total_ingresos": float(total_pagos),
        "total_folios_cerrados": total_folios_cerrados
    }
    _set_cached("ingresos", result)
    return result

# ==========================================
# 3. REPORTE DE RESERVAS POR ESTADO
# ==========================================
@router.get("/reportes/reservas")
def reporte_reservas(db: Session = Depends(get_db)):
    reservas = db.query(
        Reserva.estado_reserva,
        func.count(Reserva.id_reserva).label("cantidad")
    ).group_by(Reserva.estado_reserva).all()
    
    return [{"estado": r.estado_reserva, "cantidad": r.cantidad} for r in reservas]

# ==========================================
# 4. REPORTE DE HUÉSPEDES RECIENTES
# ==========================================
@router.get("/reportes/huespedes-recientes")
def reporte_huespedes_recientes(db: Session = Depends(get_db)):
    huespedes = db.query(
        Huesped.id_hospedaje,
        Cliente.nombres,
        Cliente.apellidos,
        Huesped.fecha_checkin,
        Huesped.estado_hospedaje
    ).join(Cliente, Huesped.id_cliente == Cliente.id_cliente)\
     .order_by(Huesped.fecha_checkin.desc())\
     .limit(10).all()
    
    return [
        {
            "id_hospedaje": h.id_hospedaje,
            "nombres": h.nombres,
            "apellidos": h.apellidos,
            "fecha_checkin": h.fecha_checkin,
            "estado": h.estado_hospedaje
        }
        for h in huespedes
    ]