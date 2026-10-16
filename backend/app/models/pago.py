from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.config import Base
from datetime import datetime

class Pago(Base):
    __tablename__ = "Pagos"
    
    id_pago = Column(Integer, primary_key=True, autoincrement=True)
    monto = Column(DECIMAL(10, 2), nullable=False)
    fecha_pago = Column(DateTime, nullable=False, default=datetime.now)
    metodo_pago = Column(String(30), nullable=False)
    
    # Foreign Keys
    id_folio = Column(Integer, ForeignKey("Folios.id_folio"), nullable=False)
    
    # Relationships
    folio = relationship("Folio", backref="pagos")