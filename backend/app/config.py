import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Cargar variables del archivo .env
load_dotenv()

# =====================================================
# 1. CONFIGURACIÓN DE BASE DE DATOS
# =====================================================
DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/gestion_hotelera"

# =====================================================
# 2. CONFIGURACIÓN DE SEGURIDAD (JWT)
# =====================================================
# Si no están en el .env, usamos estos valores por defecto para que no falle
SECRET_KEY = os.getenv("SECRET_KEY", "super_secreto_hotel_villa_de_roel_2026_clave_larga")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# =====================================================
# 3. CONFIGURACIÓN DE SQLALCHEMY (OPTIMIZADA)
# =====================================================
# Pool de conexiones: reutiliza conexiones en vez de abrir una nueva
# por request (antes cada request pagaba el costo de conectar a MySQL).
engine = create_engine(
    DATABASE_URL,
    pool_size=10,          # conexiones persistentes
    max_overflow=20,       # extras bajo pico de recepción
    pool_pre_ping=True,    # descarta conexiones muertas sin fallar el request
    pool_recycle=3600,     # recicla cada hora (evita "MySQL has gone away")
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()