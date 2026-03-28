import os
import sys

# Agrega la ruta del proyecto actual al PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.database.db import init_db

# Importar todos los routers
from backend.api.auth import router as auth_router
from backend.api.dashboard import router as dashboard_router
from backend.api.documents import router as documents_router
from backend.api.purchases import router as purchases_router
from backend.api.bids import router as bids_router
from backend.api.suppliers import router as suppliers_router

app = FastAPI(
    title="Papyser IA",
    description="Sistema inteligente de gestión de Compras y Licitaciones con IA",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Registrar Routers ──
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])
app.include_router(purchases_router, prefix="/api/purchases", tags=["Purchases"])
app.include_router(bids_router, prefix="/api/bids", tags=["Bids"])
app.include_router(suppliers_router, prefix="/api/suppliers", tags=["Suppliers"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# ── Servir Frontend estático ──
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

@app.on_event("startup")
async def startup():
    """Inicializar DB al arrancar."""
    init_db()
