from sqlalchemy import Column, Integer, String, DECIMAL
from sqlalchemy.orm import relationship
from app.config import Base

class TipoServicio(Base):
    __tablename__ = "Tipos_Servicio"
    
    id_tipo_servicio = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(String(255), nullable=True)
    precio_unitario = Column(DECIMAL(10, 2), nullable=False)
    estado = Column(String(10), nullable=False, default='Activo')