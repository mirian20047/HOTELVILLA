from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.config import Base
from datetime import datetime

class Reserva(Base):
    __tablename__ = "Reservas"
    
    id_reserva = Column(Integer, primary_key=True, autoincrement=True)
    codigo_reserva = Column(String(20), unique=True, nullable=False)
    fecha_entrada = Column(Date, nullable=False, index=True)
    fecha_salida = Column(Date, nullable=False, index=True)
    canal_reserva = Column(String(30), nullable=False)
    estado_reserva = Column(String(20), nullable=False, default='Pendiente', index=True)
    fecha_registro = Column(DateTime, default=datetime.now)
    
    # Nuevos campos para control de pagos y adelantos
    monto_total_estimado = Column(Float, default=0.0)
    monto_pagado = Column(Float, default=0.0)
    estado_pago = Column(String, default="Pendiente")  # Pendiente, Parcial, Pagado
    
    # Foreign Keys
    id_cliente = Column(Integer, ForeignKey("Clientes.id_cliente"), nullable=False, index=True)
    id_tipo_habitacion = Column(Integer, ForeignKey("Tipos_Habitacion.id_tipo_habitacion"), nullable=False)
    id_habitacion = Column(Integer, ForeignKey("Habitaciones.id_habitacion"), nullable=True, index=True)  # ← NUEVO
    id_usuario_registro = Column(Integer, ForeignKey("Usuarios.id_usuario"), nullable=False)
    
    # Relationships
    cliente = relationship("Cliente", back_populates="reservas")
    tipo_habitacion = relationship("TipoHabitacion", back_populates="reservas")
    usuario_registro = relationship("Usuario", back_populates="reservas_registro")
    huesped = relationship("Huesped", back_populates="reserva", uselist=False)
    habitacion_reservada = relationship("Habitacion", back_populates="reservas")  # ← NUEVO