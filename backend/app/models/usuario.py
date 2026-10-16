from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.config import Base
from datetime import datetime

class Usuario(Base):
    __tablename__ = "Usuarios"
    
    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    rol = Column(String(20), nullable=False)
    estado = Column(String(10), nullable=False, default='Activo')
    fecha_registro = Column(DateTime, default=datetime.now)
    
    # Relaciones
    reservas_registro = relationship("Reserva", back_populates="usuario_registro")
    checkins_realizados = relationship("Huesped", foreign_keys="Huesped.id_usuario_checkin", back_populates="usuario_checkin")
    checkouts_realizados = relationship("Huesped", foreign_keys="Huesped.id_usuario_checkout", back_populates="usuario_checkout")