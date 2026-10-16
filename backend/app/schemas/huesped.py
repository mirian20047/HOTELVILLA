from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Esquema base para hospedaje
class HuespedBase(BaseModel):
    id_reserva: int
    id_habitacion: int
    estado_hospedaje: str = "En curso"

# Esquema específico para solicitar un Check-in
class CheckInCreate(BaseModel):
    id_reserva: int
    id_habitacion: int

# Esquema para crear un hospedaje (por si se necesita en el futuro)
class HuespedCreate(HuespedBase):
    pass

# Esquema de respuesta para un Huésped (Hospedaje)
class HuespedResponse(BaseModel):
    id_hospedaje: int
    id_reserva: int
    id_cliente: int
    id_habitacion: int
    fecha_checkin: datetime
    fecha_checkout: Optional[datetime] = None
    estado_hospedaje: str
    id_usuario_checkin: int
    id_usuario_checkout: Optional[int] = None

    class Config:
        from_attributes = True