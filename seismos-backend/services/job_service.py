"""Job state management — in-memory store with WebSocket subscriber queues"""
import time
import asyncio
from typing import Optional, AsyncGenerator


# ── In-memory job store ───────────────────────────────────────────────────────
_jobs: dict = {}
_subscribers: dict = {}


def create_job(job_id: str, request_data: dict) -> None:
    _jobs[job_id] = {
        "job_id":     job_id,
        "status":     "queued",
        "progress":   {"stage": "queued", "percent": 0, "message": "Job queued"},
        "request":    request_data,
        "created_at": _ts(),
        "updated_at": _ts(),
    }
    _subscribers[job_id] = []


def update_job_progress(job_id: str, stage: str, percent: int, message: str) -> None:
    if job_id not in _jobs:
        return
    _jobs[job_id].update({
        "status":     "running",
        "progress":   {"stage": stage, "percent": percent, "message": message},
        "updated_at": _ts(),
    })
    _broadcast(job_id, {"type": "progress", "stage": stage, "percent": percent, "message": message})


def complete_job(job_id: str, result_id: str, summary: dict) -> None:
    _jobs[job_id].update({
        "status":     "complete",
        "progress":   {"stage": "done", "percent": 100, "message": "Analysis complete"},
        "result_id":  result_id,
        "summary":    summary,
        "updated_at": _ts(),
    })
    _broadcast(job_id, {"type": "complete", "result_id": result_id, "summary": summary})


def fail_job(job_id: str, message: str, detail: str = "") -> None:
    _jobs[job_id].update({
        "status":     "failed",
        "error":      {"code": "PROCESSING_FAILED", "message": message, "detail": detail[:500]},
        "updated_at": _ts(),
    })
    _broadcast(job_id, {"type": "error", "code": "PROCESSING_FAILED", "message": message})


def emit_event_found(job_id: str, event_summary: dict) -> None:
    _broadcast(job_id, {"type": "event_found", "event": event_summary})


def get_job(job_id: str) -> Optional[dict]:
    return _jobs.get(job_id)


def _broadcast(job_id: str, event: dict) -> None:
    for queue in _subscribers.get(job_id, []):
        queue.append(event)


async def subscribe_to_job_events(job_id: str) -> AsyncGenerator[dict, None]:
    queue: list = []
    if job_id in _subscribers:
        _subscribers[job_id].append(queue)
    try:
        while True:
            if queue:
                event = queue.pop(0)
                yield event
                if event.get("type") in ("complete", "error"):
                    break
            job = _jobs.get(job_id, {})
            if job.get("status") in ("complete", "failed") and not queue:
                break
            await asyncio.sleep(0.2)
    finally:
        if job_id in _subscribers and queue in _subscribers[job_id]:
            _subscribers[job_id].remove(queue)


def _ts() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
