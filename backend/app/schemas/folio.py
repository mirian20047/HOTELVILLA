from pydantic import BaseModel
from decimal import Decimal

class FolioBase(BaseModel):
    id_hospedaje: int
    subtotal: Decimal = 0.00
    igv: Decimal = 0.00
    estado_folio: str = "Abierto"

class FolioCreate(FolioBase):
    pass

class FolioResponse(FolioBase):
    id_folio: int

    class Config:
        from_attributes = True