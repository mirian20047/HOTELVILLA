from pydantic import BaseModel
from decimal import Decimal
from typing import Optional

class ServicioBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio_unitario: Decimal
    estado: str = "Activo"

class ServicioCreate(ServicioBase):
    pass

class ServicioResponse(ServicioBase):
    id_tipo_servicio: int

    class Config:
        from_attributes = True