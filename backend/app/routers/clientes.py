from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

# Importaciones locales
from app.config import get_db
from app.models.cliente import Cliente
from app.schemas.cliente import ClienteCreate, ClienteResponse

# Crear el router
router = APIRouter()

# 1. CREAR un nuevo cliente
@router.post("/clientes", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def crear_cliente(cliente: ClienteCreate, db: Session = Depends(get_db)):
    # Verificar si el documento ya existe
    cliente_existente = db.query(Cliente).filter(
        Cliente.tipo_documento == cliente.tipo_documento,
        Cliente.numero_documento == cliente.numero_documento
    ).first()
    
    if cliente_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Ya existe un cliente registrado con ese documento"
        )
    
    # Crear el nuevo cliente en la base de datos
    nuevo_cliente = Cliente(**cliente.dict())
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    
    return nuevo_cliente

# 2. LISTAR todos los clientes
@router.get("/clientes", response_model=List[ClienteResponse])
def listar_clientes(db: Session = Depends(get_db)):
    clientes = db.query(Cliente).all()
    return clientes

# 3. OBTENER un cliente por su ID
@router.get("/clientes/{id_cliente}", response_model=ClienteResponse)
def obtener_cliente(id_cliente: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id_cliente == id_cliente).first()
    
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Cliente no encontrado"
        )
    return cliente

# 4. ACTUALIZAR un cliente
@router.put("/clientes/{id_cliente}", response_model=ClienteResponse)
def actualizar_cliente(id_cliente: int, cliente_data: ClienteCreate, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id_cliente == id_cliente).first()
    
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Cliente no encontrado"
        )
    
    # Actualizar los campos
    for key, value in cliente_data.dict().items():
        setattr(cliente, key, value)
        
    db.commit()
    db.refresh(cliente)
    return cliente

# 5. ELIMINAR un cliente
@router.delete("/clientes/{id_cliente}")
def eliminar_cliente(id_cliente: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id_cliente == id_cliente).first()
    
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Cliente no encontrado"
        )
    
    db.delete(cliente)
    db.commit()
    return {"mensaje": "Cliente eliminado exitosamente"}