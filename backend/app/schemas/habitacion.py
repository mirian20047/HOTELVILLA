from pydantic import BaseModel, field_validator
from typing import Optional

class TipoHabitacionBase(BaseModel):
    nombre: str
    capacidad_personas: int
    descripcion: Optional[str] = None
    tipo_cama: Optional[str] = None   # NUEVO
    amenities: Optional[str] = None   # NUEVO
    tarifa_base: float
    estado: str = "Activo"
    imagen_url: Optional[str] = None

    @field_validator('nombre', mode='before')
    @classmethod
    def validate_nombre(cls, v):
        if v is None:
            raise ValueError('El nombre es obligatorio')
        return str(v).strip()
    
    @field_validator('capacidad_personas', mode='before')
    @classmethod
    def validate_capacidad(cls, v):
        return int(v)
    
    @field_validator('tarifa_base', mode='before')
    @classmethod
    def validate_tarifa(cls, v):
        return float(v)
    
    @field_validator('descripcion', mode='before')
    @classmethod
    def validate_descripcion(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return str(v).strip()
    
    @field_validator('tipo_cama', mode='before')
    @classmethod
    def validate_tipo_cama(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return str(v).strip()
    
    @field_validator('amenities', mode='before')
    @classmethod
    def validate_amenities(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return str(v).strip()
    
    @field_validator('estado', mode='before')
    @classmethod
    def validate_estado(cls, v):
        return str(v).strip() if v else "Activo"

class TipoHabitacionResponse(TipoHabitacionBase):
    id_tipo_habitacion: int
    
    model_config = {'from_attributes': True}

class HabitacionBase(BaseModel):
    numero_habitacion: str
    id_tipo_habitacion: int
    piso: int
    estado_actual: str = "Disponible"

class HabitacionCreate(HabitacionBase):
    pass

class HabitacionResponse(HabitacionBase):
    id_habitacion: int
    tipo_habitacion: Optional[TipoHabitacionResponse] = None
    
    model_config = {'from_attributes': True}

class TipoHabitacionCreate(TipoHabitacionBase):
    pass