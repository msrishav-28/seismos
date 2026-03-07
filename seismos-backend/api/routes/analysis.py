"""Analysis routes — submit job, poll status, fetch results"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from api.schemas.analysis import AnalysisRequest, JobResponse, AnalysisResult
from services.analysis_service import run_analysis
from services.job_service import create_job, get_job
from services.result_store import get_result
import uuid

router = APIRouter()


def _estimate_duration(req: AnalysisRequest) -> int:
    hours = (req.end_time - req.start_time).total_seconds() / 3600
    base = 15 if req.body == "moon" else 20
    return int(base + hours * 8)


@router.post("", response_model=JobResponse, status_code=202)
async def submit_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    job_id = f"j_{uuid.uuid4().hex[:8]}"
    create_job(job_id, request.model_dump(mode="json"))
    background_tasks.add_task(run_analysis, job_id, request)
    return JobResponse(
        job_id=job_id,
        status="queued",
        estimated_duration_seconds=_estimate_duration(request),
        websocket_url=f"/ws/job/{job_id}",
    )


@router.get("/jobs/{job_id}")
async def poll_job(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/results/{result_id}", response_model=AnalysisResult)
async def fetch_result(result_id: str):
    result = get_result(result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
