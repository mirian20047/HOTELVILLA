from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session
import os
from app.config import get_db, engine
from app.routers import usuarios

# Importar TODOS los routers
from app.routers import clientes, habitaciones, auth, reservas, huespedes, folios, reportes

app = FastAPI(
    title="Sistema de Gestión Hotelera - Hotel La Villa de Roel 🟠",
    description="API REST para la gestión de reservas, huéspedes y facturación.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Comprime respuestas JSON grandes (listas de clientes/reservas/huéspedes).
# Reduce ~70% el tamaño transferido sin cambiar el contenido.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Archivos subidos (fotos de tipos de habitación).
# Se monta en /api/... para que el proxy de Vite (/api → 8000) también lo cubra en desarrollo.
UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(os.path.join(UPLOAD_ROOT, "tipos"), exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")


@app.on_event("startup")
def _migracion_imagen_url():
    # Agrega la columna imagen_url si la BD ya existía sin ella. Idempotente.
    try:
        with engine.begin() as conn:
            cols = [r[0] for r in conn.execute(text("SHOW COLUMNS FROM `Tipos_Habitacion`"))]
            if "imagen_url" not in cols:
                conn.execute(text("ALTER TABLE `Tipos_Habitacion` ADD COLUMN `imagen_url` VARCHAR(500) NULL"))
    except Exception:
        pass


# Registrar TODOS los routers
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(clientes.router, prefix="/api", tags=["Gestión de Clientes"])
app.include_router(habitaciones.router, prefix="/api", tags=["Gestión de Habitaciones"])
app.include_router(reservas.router, prefix="/api", tags=["Gestión de Reservas"])
app.include_router(huespedes.router, prefix="/api", tags=["Check-in / Check-out"])
app.include_router(folios.router, prefix="/api", tags=["Folios y Pagos"])
app.include_router(reportes.router, prefix="/api", tags=["Reportes"])
app.include_router(usuarios.router, prefix="/api", tags=["Usuarios"])

@app.get("/")
def read_root():
    return {"mensaje": "¡Bienvenido a la API del Hotel La Villa de Roel! 🟠⚪"}

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "Conectado a MySQL exitosamente"}
    except Exception as e:
        return {"status": "Error de conexión", "detalle": str(e)}