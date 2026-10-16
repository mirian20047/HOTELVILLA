from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.config import get_db
from app.models.reserva import Reserva
from app.models.huesped import Huesped
from app.models.habitacion import Habitacion, Historial_Estado_Habitaciones
from app.models.folio import Folio
from app.models.pago import Pago
from app.models.cliente import Cliente
from app.schemas.huesped import CheckInCreate, HuespedResponse
from app.services.auth_service import get_current_user
from app.models.usuario import Usuario
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# ==========================================
# ESQUEMAS
# ==========================================
class ClienteMinimo(BaseModel):
    tipo_documento: str = "DNI"
    numero_documento: str
    nombres: str
    apellidos: str
    email: Optional[str] = None
    telefono: Optional[str] = None

class OcupacionDirectaRequest(BaseModel):
    tipo_documento: str = "DNI"
    numero_documento: str
    nombres: str = ""
    apellidos: str = ""
    email: Optional[str] = None
    telefono: Optional[str] = None
    id_habitacion: int
    fecha_entrada: str
    fecha_salida: str
    canal_reserva: str = "Presencial"
    monto_pagado: float
    metodo_pago: str = "Efectivo"

class PagoParcialRequest(BaseModel):
    monto: float
    metodo_pago: str = "Efectivo"

class CheckoutConPagoRequest(BaseModel):
    monto_pagado: float
    metodo_pago: str = "Efectivo"


# ==========================================
# 1. CHECK-IN (con detección de adelanto)
# ==========================================
@router.post("/checkin", response_model=HuespedResponse, status_code=status.HTTP_201_CREATED)
def realizar_checkin(
    datos_checkin: CheckInCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    try:
        reserva = db.query(Reserva).filter(Reserva.id_reserva == datos_checkin.id_reserva).first()
        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        if reserva.estado_reserva not in ["Pendiente", "Confirmada"]:
            raise HTTPException(status_code=400, detail=f"La reserva ya está en estado: {reserva.estado_reserva}")

        habitacion = db.query(Habitacion).options(joinedload(Habitacion.tipo_habitacion)).filter(Habitacion.id_habitacion == datos_checkin.id_habitacion).first()
        if not habitacion:
            raise HTTPException(status_code=404, detail="Habitación no encontrada")
        if habitacion.estado_actual != "Disponible":
            raise HTTPException(status_code=400, detail=f"La habitación {habitacion.numero_habitacion} no está disponible")

        noches = max(1, (reserva.fecha_salida - reserva.fecha_entrada).days)
        tarifa = float(habitacion.tipo_habitacion.tarifa_base) if habitacion.tipo_habitacion else 0.0
        total_estadia = noches * tarifa

        nuevo_huesped = Huesped(
            id_reserva=reserva.id_reserva,
            id_cliente=reserva.id_cliente,
            id_habitacion=habitacion.id_habitacion,
            fecha_checkin=datetime.now(),
            estado_hospedaje="En curso",
            id_usuario_checkin=current_user.id_usuario
        )
        db.add(nuevo_huesped)
        db.flush()

        estado_anterior = habitacion.estado_actual
        habitacion.estado_actual = "Ocupada"
        historial = Historial_Estado_Habitaciones(
            id_habitacion=habitacion.id_habitacion,
            estado_anterior=estado_anterior,
            estado_nuevo="Ocupada",
            fecha_cambio=datetime.now()
        )
        db.add(historial)

        nuevo_folio = Folio(
            id_hospedaje=nuevo_huesped.id_hospedaje,
            subtotal=total_estadia,
            igv=0.00,
            estado_folio="Abierto"
        )
        db.add(nuevo_folio)
        db.flush()

        # Si la reserva tiene adelanto, registrarlo como pago en el folio
        if reserva.monto_pagado > 0:
            pago_adelanto = Pago(
                id_folio=nuevo_folio.id_folio,
                monto=reserva.monto_pagado,
                metodo_pago="Efectivo"
            )
            db.add(pago_adelanto)

        reserva.estado_reserva = "Completada"

        db.commit()
        db.refresh(nuevo_huesped)

        total_pagado = float(reserva.monto_pagado or 0)
        saldo = total_estadia - total_pagado

        return {
            "id_hospedaje": nuevo_huesped.id_hospedaje,
            "id_reserva": nuevo_huesped.id_reserva,
            "id_cliente": nuevo_huesped.id_cliente,
            "id_habitacion": nuevo_huesped.id_habitacion,
            "fecha_checkin": nuevo_huesped.fecha_checkin,
            "fecha_checkout": nuevo_huesped.fecha_checkout,
            "estado_hospedaje": nuevo_huesped.estado_hospedaje,
            "id_usuario_checkin": nuevo_huesped.id_usuario_checkin,
            "id_usuario_checkout": nuevo_huesped.id_usuario_checkout,
            "total_estadia": total_estadia,
            "monto_previamente_pagado": total_pagado,
            "saldo_pendiente": saldo
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno al realizar check-in: {str(e)}")


# ==========================================
# 2. CHECK-OUT CON PAGO OBLIGATORIO (CORREGIDO - SIN DUPLICADOS)
# ==========================================
@router.post("/checkout/{id_hospedaje}")
def realizar_checkout(
    id_hospedaje: int,
    datos: CheckoutConPagoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    try:
        huesped = db.query(Huesped).filter(Huesped.id_hospedaje == id_hospedaje).first()
        if not huesped:
            raise HTTPException(status_code=404, detail="Hospedaje no encontrado")
        if huesped.estado_hospedaje != "En curso":
            raise HTTPException(status_code=400, detail=f"El hospedaje ya está en estado: {huesped.estado_hospedaje}")

        folio = db.query(Folio).filter(Folio.id_hospedaje == id_hospedaje).first()
        if not folio:
            raise HTTPException(status_code=404, detail="Folio no encontrado")

        reserva = db.query(Reserva).filter(Reserva.id_reserva == huesped.id_reserva).first()
        habitacion = db.query(Habitacion).options(joinedload(Habitacion.tipo_habitacion)).filter(Habitacion.id_habitacion == huesped.id_habitacion).first()

        if reserva and reserva.fecha_salida and reserva.fecha_entrada:
            noches = max(1, (reserva.fecha_salida - reserva.fecha_entrada).days)
        else:
            noches = 1

        tarifa = float(habitacion.tipo_habitacion.tarifa_base) if habitacion and habitacion.tipo_habitacion else 0.0
        total_estadia = noches * tarifa

        pagos_existentes = db.query(Pago).filter(Pago.id_folio == folio.id_folio).all()
        total_pagado = sum(float(p.monto) for p in pagos_existentes)

        saldo_pendiente = total_estadia - total_pagado

        if datos.monto_pagado < saldo_pendiente:
            raise HTTPException(
                status_code=400,
                detail=f"El monto pagado (S/ {datos.monto_pagado:.2f}) no cubre el saldo pendiente (S/ {saldo_pendiente:.2f}). Falta S/ {saldo_pendiente - datos.monto_pagado:.2f}"
            )

        # ✅ IMPORTANTE: Solo registrar pago si el monto es mayor a 0
        if datos.monto_pagado > 0:
            pago_final = Pago(
                id_folio=folio.id_folio,
                monto=datos.monto_pagado,
                metodo_pago=datos.metodo_pago
            )
            db.add(pago_final)

        folio.estado_folio = "Cerrado"

        huesped.fecha_checkout = datetime.now()
        huesped.estado_hospedaje = "Finalizado"
        huesped.id_usuario_checkout = current_user.id_usuario

        estado_anterior = habitacion.estado_actual
        habitacion.estado_actual = "En limpieza"
        historial = Historial_Estado_Habitaciones(
            id_habitacion=habitacion.id_habitacion,
            estado_anterior=estado_anterior,
            estado_nuevo="En limpieza",
            fecha_cambio=datetime.now()
        )
        db.add(historial)

        db.commit()
        db.refresh(huesped)

        vuelto = datos.monto_pagado - saldo_pendiente

        return {
            "mensaje": "Check-out realizado correctamente",
            "id_hospedaje": huesped.id_hospedaje,
            "total_estadia": total_estadia,
            "total_pagado_anteriormente": total_pagado,
            "monto_pagado_ahora": datos.monto_pagado,
            "saldo_pendiente_anterior": saldo_pendiente,
            "vuelto": vuelto if vuelto > 0 else 0,
            "estado_habitacion": "En limpieza"
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno al realizar check-out: {str(e)}")


# ==========================================
# 2.1. REGISTRAR PAGO PARCIAL (durante la estadía)
# ==========================================
@router.post("/huespedes/{id_hospedaje}/pago")
def registrar_pago_parcial(
    id_hospedaje: int,
    datos: PagoParcialRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    try:
        huesped = db.query(Huesped).filter(Huesped.id_hospedaje == id_hospedaje).first()
        if not huesped:
            raise HTTPException(status_code=404, detail="Hospedaje no encontrado")
        if huesped.estado_hospedaje != "En curso":
            raise HTTPException(status_code=400, detail="El hospedaje no está en curso")

        folio = db.query(Folio).filter(Folio.id_hospedaje == id_hospedaje).first()
        if not folio:
            raise HTTPException(status_code=404, detail="Folio no encontrado")

        reserva = db.query(Reserva).filter(Reserva.id_reserva == huesped.id_reserva).first()
        habitacion = db.query(Habitacion).options(joinedload(Habitacion.tipo_habitacion)).filter(Habitacion.id_habitacion == huesped.id_habitacion).first()

        if reserva and reserva.fecha_salida and reserva.fecha_entrada:
            noches = max(1, (reserva.fecha_salida - reserva.fecha_entrada).days)
        else:
            noches = 1

        tarifa = float(habitacion.tipo_habitacion.tarifa_base) if habitacion and habitacion.tipo_habitacion else 0.0
        total_estadia = noches * tarifa

        pagos_existentes = db.query(Pago).filter(Pago.id_folio == folio.id_folio).all()
        total_pagado = sum(float(p.monto) for p in pagos_existentes)
        saldo_pendiente = total_estadia - total_pagado

        if datos.monto > saldo_pendiente:
            raise HTTPException(
                status_code=400,
                detail=f"El monto excede el saldo pendiente. Saldo: S/ {saldo_pendiente:.2f}"
            )

        nuevo_pago = Pago(
            id_folio=folio.id_folio,
            monto=datos.monto,
            metodo_pago=datos.metodo_pago
        )
        db.add(nuevo_pago)

        if reserva:
            reserva.monto_pagado = total_pagado + datos.monto
            if reserva.monto_pagado >= total_estadia:
                reserva.estado_pago = "Pagado"
            else:
                reserva.estado_pago = "Parcial"

        db.commit()

        nuevo_saldo = total_estadia - (total_pagado + datos.monto)

        return {
            "mensaje": "Pago registrado correctamente",
            "monto_pagado": datos.monto,
            "total_pagado_acumulado": total_pagado + datos.monto,
            "total_estadia": total_estadia,
            "saldo_pendiente": nuevo_saldo,
            "estado_pago": reserva.estado_pago if reserva else "N/A"
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno al registrar pago: {str(e)}")


# ==========================================
# 3. LISTAR TODOS LOS HOSPEDAJES (con info de pagos)
# ==========================================
@router.get("/huespedes")
def listar_huespedes(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from datetime import date
    
    hospedajes = db.query(Huesped).options(
        joinedload(Huesped.habitacion).joinedload(Habitacion.tipo_habitacion),
        joinedload(Huesped.reserva)
    ).order_by(Huesped.fecha_checkin.desc()).all()
    
    resultado = []
    hoy = date.today()
    
    for h in hospedajes:
        fecha_salida = h.reserva.fecha_salida if h.reserva else None
        noches_restantes = None
        
        if fecha_salida:
            dias_restantes = (fecha_salida - hoy).days
            noches_restantes = max(0, dias_restantes)
        
        total_estadia = 0.0
        total_pagado = 0.0
        saldo_pendiente = 0.0
        
        if h.reserva:
            if h.reserva.fecha_salida and h.reserva.fecha_entrada:
                noches = max(1, (h.reserva.fecha_salida - h.reserva.fecha_entrada).days)
            else:
                noches = 1
            tarifa = float(h.habitacion.tipo_habitacion.tarifa_base) if h.habitacion and h.habitacion.tipo_habitacion else 0.0
            total_estadia = noches * tarifa
            total_pagado = float(h.reserva.monto_pagado or 0)
            saldo_pendiente = total_estadia - total_pagado
        
        resultado.append({
            "id_hospedaje": h.id_hospedaje,
            "id_reserva": h.id_reserva,
            "id_cliente": h.id_cliente,
            "id_habitacion": h.id_habitacion,
            "fecha_checkin": h.fecha_checkin.isoformat() if h.fecha_checkin else None,
            "fecha_checkout": h.fecha_checkout.isoformat() if h.fecha_checkout else None,
            "estado_hospedaje": h.estado_hospedaje,
            "id_usuario_checkin": h.id_usuario_checkin,
            "id_usuario_checkout": h.id_usuario_checkout,
            "fecha_salida": fecha_salida.isoformat() if fecha_salida else None,
            "noches_restantes": noches_restantes,
            "total_estadia": total_estadia,
            "total_pagado": total_pagado,
            "saldo_pendiente": saldo_pendiente,
            "estado_pago": h.reserva.estado_pago if h.reserva else "N/A",
            "habitacion": {
                "id_habitacion": h.habitacion.id_habitacion,
                "numero_habitacion": h.habitacion.numero_habitacion,
                "estado_actual": h.habitacion.estado_actual
            } if h.habitacion else None
        })
    return resultado


# ==========================================
# 4. BUSCAR CLIENTE POR DNI
# ==========================================
@router.get("/buscar-cliente/{numero_documento}")
def buscar_cliente_por_documento(numero_documento: str, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.numero_documento == numero_documento).first()
    if not cliente:
        return {"existe": False, "cliente": None}
    return {
        "existe": True,
        "cliente": {
            "id_cliente": cliente.id_cliente,
            "tipo_documento": cliente.tipo_documento,
            "numero_documento": cliente.numero_documento,
            "nombres": cliente.nombres,
            "apellidos": cliente.apellidos,
            "email": cliente.email,
            "telefono": cliente.telefono
        }
    }


# ==========================================
# 5. OCUPACIÓN DIRECTA O RESERVA FUTURA
# ==========================================
@router.post("/ocupacion-directa", status_code=status.HTTP_201_CREATED)
def ocupacion_directa(
    datos: OcupacionDirectaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from sqlalchemy import or_, and_
    from datetime import datetime, date
    
    try:
        cliente = db.query(Cliente).filter(
            Cliente.numero_documento == datos.numero_documento,
            Cliente.tipo_documento == datos.tipo_documento
        ).first()
        
        if not cliente:
            cliente = Cliente(
                tipo_documento=datos.tipo_documento,
                numero_documento=datos.numero_documento,
                nombres=datos.nombres,
                apellidos=datos.apellidos,
                email=datos.email,
                telefono=datos.telefono,
                estado="Activo"
            )
            db.add(cliente)
            db.flush()
        
        habitacion = db.query(Habitacion).options(joinedload(Habitacion.tipo_habitacion)).filter(Habitacion.id_habitacion == datos.id_habitacion).first()
        if not habitacion:
            raise HTTPException(status_code=404, detail="Habitación no encontrada")
        
        anio = datetime.now().year
        total_reservas = db.query(Reserva).count()
        consecutivo = total_reservas + 1
        codigo_reserva = f"RES-{anio}-{consecutivo:04d}"
        
        fecha_entrada = datetime.strptime(datos.fecha_entrada, "%Y-%m-%d").date()
        fecha_salida = datetime.strptime(datos.fecha_salida, "%Y-%m-%d").date()
        hoy = date.today()
        
        es_reserva_futura = fecha_entrada > hoy
        
        noches = max(1, (fecha_salida - fecha_entrada).days)
        tarifa = float(habitacion.tipo_habitacion.tarifa_base) if habitacion.tipo_habitacion else 0.0
        monto_total = noches * tarifa
        
        if es_reserva_futura:
            estado_pago = "Pendiente"
            if datos.monto_pagado >= monto_total:
                estado_pago = "Pagado"
            elif datos.monto_pagado > 0:
                estado_pago = "Parcial"
            
            reservas_conflicto = db.query(Reserva).filter(
                Reserva.id_habitacion == habitacion.id_habitacion,
                Reserva.estado_reserva.in_(['Pendiente', 'Confirmada', 'Completada']),
                or_(
                    and_(Reserva.fecha_entrada <= fecha_entrada, Reserva.fecha_salida >= fecha_entrada),
                    and_(Reserva.fecha_entrada <= fecha_salida, Reserva.fecha_salida >= fecha_salida),
                    and_(Reserva.fecha_entrada >= fecha_entrada, Reserva.fecha_salida <= fecha_salida)
                )
            ).first()
            
            if reservas_conflicto:
                raise HTTPException(
                    status_code=400,
                    detail=f"La habitación {habitacion.numero_habitacion} ya está reservada para esas fechas (Reserva: {reservas_conflicto.codigo_reserva})"
                )
            
            estado_reserva = "Confirmada" if datos.monto_pagado > 0 else "Pendiente"
            
            reserva = Reserva(
                codigo_reserva=codigo_reserva,
                id_cliente=cliente.id_cliente,
                id_tipo_habitacion=habitacion.id_tipo_habitacion,
                id_habitacion=habitacion.id_habitacion,
                fecha_entrada=fecha_entrada,
                fecha_salida=fecha_salida,
                canal_reserva=datos.canal_reserva,
                estado_reserva=estado_reserva,
                fecha_registro=datetime.now(),
                id_usuario_registro=current_user.id_usuario,
                monto_total_estimado=monto_total,
                monto_pagado=datos.monto_pagado,
                estado_pago=estado_pago
            )
            db.add(reserva)
            db.flush()
            
            db.commit()
            
            mensaje_pago = ""
            if datos.monto_pagado > 0:
                mensaje_pago = f" (Adelanto: S/ {datos.monto_pagado:.2f} de S/ {monto_total:.2f})"
            
            return {
                "mensaje": f"Reserva futura registrada exitosamente{mensaje_pago}",
                "tipo": "reserva_futura",
                "codigo_reserva": reserva.codigo_reserva,
                "cliente": {
                    "id_cliente": cliente.id_cliente,
                    "nombre": f"{cliente.nombres} {cliente.apellidos}"
                },
                "habitacion": habitacion.numero_habitacion,
                "fecha_entrada": fecha_entrada.isoformat(),
                "fecha_salida": fecha_salida.isoformat(),
                "monto_total": monto_total,
                "monto_pagado": datos.monto_pagado,
                "estado_pago": estado_pago,
                "estado_reserva": estado_reserva
            }
        else:
            reservas_conflicto = db.query(Reserva).filter(
                Reserva.id_habitacion == habitacion.id_habitacion,
                Reserva.estado_reserva.in_(['Pendiente', 'Confirmada', 'Completada']),
                or_(
                    and_(Reserva.fecha_entrada <= fecha_entrada, Reserva.fecha_salida >= fecha_entrada),
                    and_(Reserva.fecha_entrada <= fecha_salida, Reserva.fecha_salida >= fecha_salida),
                    and_(Reserva.fecha_entrada >= fecha_entrada, Reserva.fecha_salida <= fecha_salida)
                )
            ).first()
            
            if reservas_conflicto:
                raise HTTPException(
                    status_code=400,
                    detail=f"La habitación {habitacion.numero_habitacion} ya está reservada para esas fechas (Reserva: {reservas_conflicto.codigo_reserva})"
                )
            
            estado_reserva = "Completada"
            
            reserva = Reserva(
                codigo_reserva=codigo_reserva,
                id_cliente=cliente.id_cliente,
                id_tipo_habitacion=habitacion.id_tipo_habitacion,
                id_habitacion=habitacion.id_habitacion,
                fecha_entrada=fecha_entrada,
                fecha_salida=fecha_salida,
                canal_reserva=datos.canal_reserva,
                estado_reserva=estado_reserva,
                fecha_registro=datetime.now(),
                id_usuario_registro=current_user.id_usuario,
                monto_total_estimado=monto_total,
                monto_pagado=datos.monto_pagado,
                estado_pago="Pagado" if datos.monto_pagado >= monto_total else "Parcial"
            )
            db.add(reserva)
            db.flush()
            
            huesped = Huesped(
                id_reserva=reserva.id_reserva,
                id_cliente=cliente.id_cliente,
                id_habitacion=habitacion.id_habitacion,
                fecha_checkin=datetime.now(),
                estado_hospedaje="En curso",
                id_usuario_checkin=current_user.id_usuario
            )
            db.add(huesped)
            db.flush()
            
            estado_anterior = habitacion.estado_actual
            habitacion.estado_actual = "Ocupada"
            historial = Historial_Estado_Habitaciones(
                id_habitacion=habitacion.id_habitacion,
                estado_anterior=estado_anterior,
                estado_nuevo="Ocupada",
                fecha_cambio=datetime.now()
            )
            db.add(historial)
            
            folio = Folio(
                id_hospedaje=huesped.id_hospedaje,
                subtotal=monto_total,
                igv=0.00,
                estado_folio="Abierto"
            )
            db.add(folio)
            db.flush()
            
            pago = Pago(
                id_folio=folio.id_folio,
                monto=datos.monto_pagado,
                metodo_pago=datos.metodo_pago
            )
            db.add(pago)
            
            db.commit()
            db.refresh(huesped)
            
            return {
                "mensaje": "Ocupación directa registrada exitosamente",
                "tipo": "ocupacion_inmediata",
                "id_hospedaje": huesped.id_hospedaje,
                "codigo_reserva": reserva.codigo_reserva,
                "cliente": {
                    "id_cliente": cliente.id_cliente,
                    "nombre": f"{cliente.nombres} {cliente.apellidos}"
                },
                "habitacion": habitacion.numero_habitacion,
                "monto_pagado": datos.monto_pagado,
                "monto_total": monto_total
            }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# ==========================================
# 6. ESTADÍSTICAS DE CHECK-OUTS
# ==========================================
@router.get("/checkouts-estadisticas")
def obtener_estadisticas_checkouts(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from datetime import date, timedelta
    
    hoy = date.today()
    manana = hoy + timedelta(days=1)
    
    huespedes_activos = db.query(Huesped).options(
        joinedload(Huesped.reserva),
        joinedload(Huesped.cliente),
        joinedload(Huesped.habitacion)
    ).filter(Huesped.estado_hospedaje == "En curso").all()
    
    salen_hoy = []
    salen_manana = []
    vencidos = []
    
    for h in huespedes_activos:
        if h.reserva and h.reserva.fecha_salida:
            fecha_salida = h.reserva.fecha_salida
            nombre_cliente = f"{h.cliente.nombres} {h.cliente.apellidos}" if h.cliente else "Sin nombre"
            numero_hab = h.habitacion.numero_habitacion if h.habitacion else "N/A"
            
            if fecha_salida == hoy:
                salen_hoy.append({
                    "id_hospedaje": h.id_hospedaje,
                    "nombre": nombre_cliente,
                    "numero_habitacion": numero_hab,
                    "fecha_salida": fecha_salida.isoformat()
                })
            elif fecha_salida == manana:
                salen_manana.append({
                    "id_hospedaje": h.id_hospedaje,
                    "nombre": nombre_cliente,
                    "numero_habitacion": numero_hab,
                    "fecha_salida": fecha_salida.isoformat()
                })
            elif fecha_salida < hoy:
                vencidos.append({
                    "id_hospedaje": h.id_hospedaje,
                    "nombre": nombre_cliente,
                    "numero_habitacion": numero_hab,
                    "fecha_salida": fecha_salida.isoformat(),
                    "dias_vencido": (hoy - fecha_salida).days
                })
    
    return {
        "total_activos": len(huespedes_activos),
        "salen_hoy": salen_hoy,
        "salen_manana": salen_manana,
        "vencidos": vencidos,
        "total_salen_hoy": len(salen_hoy),
        "total_salen_manana": len(salen_manana),
        "total_vencidos": len(vencidos)
    }


# ==========================================
# 7. ALERTAS DE LIMPIEZA
# ==========================================
@router.get("/alertas-limpieza")
def obtener_alertas_limpieza(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from datetime import date
    
    hoy = date.today()
    
    checkouts_hoy = db.query(Huesped).options(
        joinedload(Huesped.reserva),
        joinedload(Huesped.habitacion),
        joinedload(Huesped.cliente)
    ).filter(
        Huesped.estado_hospedaje == "En curso",
        Huesped.reserva.has(Reserva.fecha_salida == hoy)
    ).all()
    
    checkins_hoy = db.query(Reserva).options(
        joinedload(Reserva.cliente)
    ).filter(
        Reserva.fecha_entrada == hoy,
        Reserva.estado_reserva.in_(['Pendiente', 'Confirmada'])
    ).all()
    
    alertas = []
    
    for checkout in checkouts_hoy:
        if not checkout.habitacion:
            continue
            
        id_habitacion = checkout.habitacion.id_habitacion
        numero_habitacion = checkout.habitacion.numero_habitacion
        
        checkin_relacionado = None
        for reserva in checkins_hoy:
            if reserva.id_habitacion == id_habitacion:
                checkin_relacionado = reserva
                break
        
        if checkin_relacionado:
            alertas.append({
                "id_habitacion": id_habitacion,
                "numero_habitacion": numero_habitacion,
                "tipo_alerta": "limpieza_urgente",
                "mensaje": f"Habitación {numero_habitacion} necesita limpieza urgente",
                "checkout": {
                    "huesped_id": checkout.id_hospedaje,
                    "cliente": f"{checkout.cliente.nombres} {checkout.cliente.apellidos}" if checkout.cliente else "N/A",
                    "hora_salida": "11:00 AM"
                },
                "checkin": {
                    "reserva_id": checkin_relacionado.id_reserva,
                    "codigo_reserva": checkin_relacionado.codigo_reserva,
                    "cliente": f"{checkin_relacionado.cliente.nombres} {checkin_relacionado.cliente.apellidos}" if checkin_relacionado.cliente else "N/A",
                    "hora_entrada": "3:00 PM"
                },
                "tiempo_disponible": "4 horas"
            })
    
    return {
        "total_alertas": len(alertas),
        "alertas": alertas
    }