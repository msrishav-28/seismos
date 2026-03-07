"""
SEISMOS Backend — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from api.routes import health, analysis, data, catalog
from api.websocket.progress import router as ws_router
from api.middleware.error_handler import global_exception_handler
from models.ensemble import load_all_models
from config import STATIC_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models once at startup — never per-request."""
    load_all_models()
    yield


app = FastAPI(
    title="SEISMOS API",
    description="Seismic Event Intelligence System — automated planetary waveform detection",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(Exception, global_exception_handler)

# ── Static files (spectrograms etc.) ─────────────────────────────────────────
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(analysis.router, prefix="/analyze", tags=["Analysis"])
app.include_router(data.router, tags=["Data"])
app.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])
app.include_router(ws_router, tags=["WebSocket"])
