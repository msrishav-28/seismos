"""Global exception handler middleware"""
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback


async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {
            "code": "INTERNAL_ERROR",
            "message": str(exc),
            "detail": traceback.format_exc()[-500:],
        }},
    )
