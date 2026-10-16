from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime

class PagoBase(BaseModel):
    id_folio: int
    monto: Decimal
    metodo_pago: str

class PagoCreate(PagoBase):
    pass

class PagoResponse(PagoBase):
    id_pago: int
    fecha_pago: datetime

    class Config:
        from_attributes = True