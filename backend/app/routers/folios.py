from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.config import get_db
from app.models.folio import Folio
from app.models.pago import Pago
from app.models.huesped import Huesped
from app.schemas.folio import FolioResponse
from app.schemas.pago import PagoCreate, PagoResponse
from app.services.auth_service import get_current_user
from app.models.usuario import Usuario

router = APIRouter()

# ==========================================
# 1. OBTENER FOLIO POR HOSPEDAJE
# ==========================================
@router.get("/folios/{id_hospedaje}", response_model=FolioResponse)
def obtener_folio(id_hospedaje: int, db: Session = Depends(get_db)):
    folio = db.query(Folio).filter(Folio.id_hospedaje == id_hospedaje).first()
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")
    return folio

# ==========================================
# 2. REGISTRAR PAGO
# ==========================================
@router.post("/pagos", response_model=PagoResponse, status_code=status.HTTP_201_CREATED)
def registrar_pago(
    pago: PagoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # Verificar que el folio existe y está abierto
    folio = db.query(Folio).filter(Folio.id_folio == pago.id_folio).first()
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")
    if folio.estado_folio != "Abierto":
        raise HTTPException(status_code=400, detail="El folio ya está cerrado")

    # Crear el pago
    nuevo_pago = Pago(
        id_folio=pago.id_folio,
        monto=pago.monto,
        metodo_pago=pago.metodo_pago
    )
    db.add(nuevo_pago)
    db.commit()
    db.refresh(nuevo_pago)
    return nuevo_pago

# ==========================================
# 3. LISTAR PAGOS DE UN FOLIO
# ==========================================
@router.get("/folios/{id_folio}/pagos", response_model=List[PagoResponse])
def listar_pagos_folio(id_folio: int, db: Session = Depends(get_db)):
    pagos = db.query(Pago).filter(Pago.id_folio == id_folio).all()
    return pagos