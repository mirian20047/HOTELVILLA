from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.config import Base

class Folio(Base):
    __tablename__ = "Folios"
    
    id_folio = Column(Integer, primary_key=True, autoincrement=True)
    subtotal = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    igv = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    estado_folio = Column(String(20), nullable=False, default='Abierto')
    
    # Foreign Keys
    id_hospedaje = Column(Integer, ForeignKey("Huespedes.id_hospedaje"), unique=True, nullable=False)
    
    # Relationships
    hospedaje = relationship("Huesped", backref="folio")