from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.config import Base
from datetime import datetime

class Huesped(Base):
    __tablename__ = "Huespedes"
    
    id_hospedaje = Column(Integer, primary_key=True, autoincrement=True)
    fecha_checkin = Column(DateTime, nullable=False, default=datetime.now, index=True)
    fecha_checkout = Column(DateTime, nullable=True)
    estado_hospedaje = Column(String(20), nullable=False, default='En curso', index=True)

    # Foreign Keys
    id_reserva = Column(Integer, ForeignKey("Reservas.id_reserva"), unique=True, nullable=False)
    id_cliente = Column(Integer, ForeignKey("Clientes.id_cliente"), nullable=False, index=True)
    id_habitacion = Column(Integer, ForeignKey("Habitaciones.id_habitacion"), nullable=False, index=True)
    id_usuario_checkin = Column(Integer, ForeignKey("Usuarios.id_usuario"), nullable=False)
    id_usuario_checkout = Column(Integer, ForeignKey("Usuarios.id_usuario"), nullable=True)
    
    # Relationships
    reserva = relationship("Reserva", back_populates="huesped")
    cliente = relationship("Cliente", back_populates="huespedes")
    habitacion = relationship("Habitacion", back_populates="huespedes")
    usuario_checkin = relationship("Usuario", foreign_keys=[id_usuario_checkin], back_populates="checkins_realizados")
    usuario_checkout = relationship("Usuario", foreign_keys=[id_usuario_checkout], back_populates="checkouts_realizados")