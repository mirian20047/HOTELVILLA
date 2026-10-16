from pydantic import BaseModel, EmailStr
from typing import Optional

class ClienteBase(BaseModel):
    tipo_documento: str
    numero_documento: str
    nombres: str
    apellidos: str
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    nacionalidad: Optional[str] = None
    tipo_cliente: Optional[str] = None
    estado: str = "Activo"

class ClienteCreate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id_cliente: int

    class Config:
        from_attributes = True