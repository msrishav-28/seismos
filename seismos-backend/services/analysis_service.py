"""
Analysis Orchestrator — full 9-stage pipeline per job.
"""
import uuid
import traceback
import asyncio
from datetime import timezone

from pipeline.loader import load_waveform
from pipeline.preprocessor import (
    preprocess_stream, apply_filter_banks,
    remove_glitches, flag_thermal_windows,
)
from pipeline.detector import run_multi_band_stalta
from pipeline.features import extract_all_features
from pipeline.transmit import package_output
from models.ensemble import classify_candidates
from services.job_service import (
    update_job_progress, complete_job, fail_job, emit_event_found,
)
from services.result_store import save_result
from config import CODA_MAP, PRE_BUFFER


async def run_analysis(job_id: str, request) -> None:
    result_id = f"r_{uuid.uuid4().hex[:8]}"
    try:
        # ── Stage 1 ──────────────────────────────────────────────────────────
        update_job_progress(job_id, "loading_data", 5,
                            "Fetching waveform data from IRIS / local cache…")
        await asyncio.sleep(0.1)
        stream, inventory = load_waveform(
            body=request.body,
            station=request.station,
            start=request.start_time,
            end=request.end_time,
        )

        # ── Stage 2 ──────────────────────────────────────────────────────────
        update_job_progress(job_id, "preprocessing", 15,
                            "Removing instrument response, detrending, tapering…")
        await asyncio.sleep(0.1)
        stream = preprocess_stream(stream, inventory, body=request.body)

        # ── Stage 3 ──────────────────────────────────────────────────────────
        update_job_progress(job_id, "glitch_removal", 25,
                            "Detecting and correcting instrumental glitches…")
        await asyncio.sleep(0.1)
        thermal_windows = []
        if request.body == "mars":
            stream = remove_glitches(stream)
        if request.body == "moon":
            thermal_windows = flag_thermal_windows(stream)

        # ── Stage 4 ──────────────────────────────────────────────────────────
        update_job_progress(job_id, "filtering", 35,
                            "Applying multi-band filter banks…")
        await asyncio.sleep(0.1)
        filtered_bands = apply_filter_banks(
            stream, request.body, request.options.filter_bands,
        )

        # ── Stage 5 ──────────────────────────────────────────────────────────
        update_job_progress(job_id, "stalta_detection", 50,
                            "Running multi-band STA/LTA coincidence trigger…")
        await asyncio.sleep(0.1)
        candidates = run_multi_band_stalta(
            filtered_bands, request.body, request.options.stalta_sensitivity,
        )
        update_job_progress(job_id, "stalta_detection", 55,
                            f"STA/LTA found {len(candidates)} candidate windows")
        await asyncio.sleep(0.1)

        # ── Stage 6 ──────────────────────────────────────────────────────────
        update_job_progress(job_id, "feature_extraction", 65,
                            f"Extracting features from {len(candidates)} candidate windows…")
        await asyncio.sleep(0.1)
        feature_list = extract_all_features(stream, candidates, request.body)

        # ── Stage 7 ──────────────────────────────────────────────────────────
        update_job_progress(job_id, "ml_classification", 80,
                            "Classifying candidates with ML ensemble…")
        await asyncio.sleep(0.1)
        classified = classify_candidates(
            feature_list, stream, body=request.body, tier=request.options.ml_tier,
        )

        # Emit partial events as they arrive
        for ev in classified:
            emit_event_found(job_id, {
                "event_id":       ev["event_id"],
                "detection_time": str(ev["detection_time"]),
                "event_type":     ev["event_type"],
                "confidence":     ev["confidence"],
            })

        # ── Stage 8 ──────────────────────────────────────────────────────────
        update_job_progress(job_id, "packaging", 90,
                            f"Packaging {len(classified)} confirmed events for transmission…")
        await asyncio.sleep(0.1)
        result = package_output(
            result_id=result_id,
            job_id=job_id,
            stream=stream,
            events=classified,
            request=request,
            include_waveforms=request.options.include_waveforms,
            include_spectrograms=request.options.include_spectrograms,
        )

        # ── Done ─────────────────────────────────────────────────────────────
        save_result(result_id, result)
        complete_job(job_id, result_id, result["transmission"])

    except Exception as exc:
        fail_job(job_id, str(exc), traceback.format_exc())
        raise
