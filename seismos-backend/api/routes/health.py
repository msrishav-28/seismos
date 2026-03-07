"""Health route"""
from fastapi import APIRouter
from models.ensemble import MODELS_LOADED

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "mock_mode": __import__("config").MOCK_MODE,
        "models_loaded": MODELS_LOADED,
    }
