from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ReservaBase(BaseModel):
    fecha_entrada: date
    fecha_salida: date
    canal_reserva: str
    estado_reserva: str = "Pendiente"
    id_cliente: int
    id_tipo_habitacion: int

class ReservaCreate(ReservaBase):
    pass

class ReservaResponse(ReservaBase):
    id_reserva: int
    codigo_reserva: str
    fecha_registro: datetime

    class Config:
        from_attributes = True