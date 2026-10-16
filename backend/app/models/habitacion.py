from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL, DateTime, Text
from sqlalchemy.orm import relationship
from app.config import Base
from datetime import datetime

# ==========================================
# 1. TIPOS DE HABITACIÓN
# ==========================================
class TipoHabitacion(Base):
    __tablename__ = "Tipos_Habitacion"
    
    id_tipo_habitacion = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), unique=True, nullable=False)
    capacidad_personas = Column(Integer, nullable=False)
    descripcion = Column(String(255), nullable=True)
    tipo_cama = Column(String(100), nullable=True)  # NUEVO
    amenities = Column(Text, nullable=True)          # NUEVO
    tarifa_base = Column(DECIMAL(10, 2), nullable=False)
    estado = Column(String(10), nullable=False, default='Activo')
    # Foto del tipo de habitación (subida por el usuario, servida en /api/uploads)
    imagen_url = Column(String(500), nullable=True)
    
    # Relaciones
    habitaciones = relationship("Habitacion", back_populates="tipo_habitacion")
    reservas = relationship("Reserva", back_populates="tipo_habitacion")


# ==========================================
# 2. HABITACIONES (Unidades físicas)
# ==========================================
class Habitacion(Base):
    __tablename__ = "Habitaciones"
    
    id_habitacion = Column(Integer, primary_key=True, autoincrement=True)
    numero_habitacion = Column(String(10), unique=True, nullable=False)
    id_tipo_habitacion = Column(Integer, ForeignKey("Tipos_Habitacion.id_tipo_habitacion"), nullable=False, index=True)
    piso = Column(Integer, nullable=False)
    estado_actual = Column(String(30), nullable=False, default='Disponible', index=True)
    
    # Relaciones
    tipo_habitacion = relationship("TipoHabitacion", back_populates="habitaciones")
    huespedes = relationship("Huesped", back_populates="habitacion")
    historial_estados = relationship("Historial_Estado_Habitaciones", back_populates="habitacion")
    reservas = relationship("Reserva", back_populates="habitacion_reservada")  # <-- NUEVA LÍNEA


# ==========================================
# 3. HISTORIAL DE ESTADOS DE HABITACIÓN
# ==========================================
class Historial_Estado_Habitaciones(Base):
    __tablename__ = "Historial_Estado_Habitaciones"
    
    id_historial = Column(Integer, primary_key=True, autoincrement=True)
    id_habitacion = Column(Integer, ForeignKey("Habitaciones.id_habitacion"), nullable=False)
    estado_anterior = Column(String(30), nullable=True)
    estado_nuevo = Column(String(30), nullable=False)
    fecha_cambio = Column(DateTime, nullable=False, default=datetime.now)
    
    # Relación
    habitacion = relationship("Habitacion", back_populates="historial_estados")