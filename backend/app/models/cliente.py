from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.config import Base

class Cliente(Base):
    __tablename__ = "Clientes"
    
    id_cliente = Column(Integer, primary_key=True, autoincrement=True)
    tipo_documento = Column(String(20), nullable=False, index=True)
    numero_documento = Column(String(20), nullable=False, index=True)
    nombres = Column(String(100), nullable=False, index=True)
    apellidos = Column(String(100), nullable=False, index=True)
    email = Column(String(150), nullable=True)
    telefono = Column(String(20), nullable=True)
    nacionalidad = Column(String(50), nullable=True)
    tipo_cliente = Column(String(30), nullable=True)
    estado = Column(String(10), nullable=False, default='Activo')
    
    # Relaciones
    reservas = relationship("Reserva", back_populates="cliente")
    huespedes = relationship("Huesped", back_populates="cliente")