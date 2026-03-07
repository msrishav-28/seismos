"""WebSocket progress stream for job updates"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.job_service import subscribe_to_job_events
import json, asyncio

router = APIRouter()


@router.websocket("/ws/job/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    try:
        async for event in subscribe_to_job_events(job_id):
            await websocket.send_text(json.dumps(event))
            if event.get("type") in ("complete", "error"):
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
