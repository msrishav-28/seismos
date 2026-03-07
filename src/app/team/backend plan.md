This is a pure software architecture and engineering problem — I have everything needed to design this completely. Let me build the full specification.

***

# SEISMOS — Full Backend + Middleware Architecture

## System Overview

```
Frontend (React/Next.js)
        │
        │  HTTP REST + WebSocket
        ▼
┌──────────────────────────────┐
│   API Gateway Layer          │  FastAPI — all routes, auth, validation
│   (middleware/)              │
└────────────┬─────────────────┘
             │
┌────────────▼─────────────────┐
│   Service Layer              │  Business logic, orchestration
│   (services/)                │
└────────────┬─────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌─────────┐    ┌────────────┐
│ Pipeline│    │  ML Engine │
│ Engine  │    │  (models/) │
└────────┬┘    └─────┬──────┘
         │           │
    ┌────▼───────────▼────┐
    │   Job Queue          │  Redis + Celery (async long-running jobs)
    │   + Result Store     │  Redis cache + local filesystem
    └─────────────────────┘
```

***

## 1. Repository Structure

```
seismos-backend/
├── main.py                        # FastAPI app entrypoint
├── config.py                      # All env vars, constants
├── requirements.txt
│
├── api/                           # API Gateway Layer
│   ├── __init__.py
│   ├── routes/
│   │   ├── analysis.py            # POST /analyze, GET /jobs/:id
│   │   ├── catalog.py             # GET /catalog/moon, GET /catalog/mars
│   │   ├── data.py                # GET /waveform, GET /spectrogram
│   │   └── health.py              # GET /health
│   ├── schemas/                   # Pydantic models (request/response shapes)
│   │   ├── analysis.py
│   │   ├── catalog.py
│   │   └── waveform.py
│   ├── middleware/
│   │   ├── cors.py
│   │   ├── error_handler.py
│   │   └── logging.py
│   └── websocket/
│       └── progress.py            # WS /ws/job/:id  (real-time progress)
│
├── services/                      # Service Layer (orchestration)
│   ├── analysis_service.py        # Coordinates entire pipeline per job
│   ├── catalog_service.py         # Serves event catalog data
│   ├── waveform_service.py        # Serves raw/processed waveform slices
│   └── job_service.py             # CRUD on job state
│
├── pipeline/                      # Core signal processing
│   ├── loader.py                  # Data acquisition (FDSN / local files)
│   ├── preprocessor.py            # Response removal, filtering, glitch removal
│   ├── detector.py                # Multi-band STA/LTA engine
│   ├── features.py                # Feature extraction
│   └── transmit.py                # Output packaging
│
├── models/                        # ML models
│   ├── random_forest.py
│   ├── cnn_1d.py
│   ├── lstm_autoencoder.py
│   ├── ensemble.py
│   └── artifacts/                 # Saved .pkl / .pt model files
│       ├── moon_rf.pkl
│       ├── moon_cnn.pt
│       ├── mars_rf.pkl
│       └── mars_cnn.pt
│
├── workers/                       # Celery async workers
│   ├── celery_app.py
│   └── analysis_worker.py
│
├── store/                         # Data persistence
│   ├── job_store.py               # Redis-backed job state
│   └── result_store.py            # File + Redis result caching
│
├── data/                          # Local data cache (gitignored)
│   ├── raw/moon/ /mars/
│   ├── processed/
│   ├── catalogs/
│   └── results/
│
└── tests/
    ├── test_pipeline.py
    ├── test_api.py
    └── test_models.py
```

***

## 2. Complete API Contract

This is your frontend's bible. Every endpoint, every request shape, every response shape — fully typed.

***

### `GET /health`

```json
Response 200:
{
  "status": "ok",
  "version": "1.0.0",
  "models_loaded": {
    "moon_rf": true,
    "moon_cnn": true,
    "mars_rf": true,
    "mars_cnn": true
  },
  "data_cache": {
    "moon_days_available": 2922,
    "mars_days_available": 1460
  }
}
```

***

### `POST /analyze` — **Core Endpoint**

Kicks off an async analysis job. Returns immediately with a `job_id`. Frontend polls or subscribes via WebSocket.

```json
Request Body:
{
  "body":        "moon" | "mars",
  "start_time":  "1970-03-01T00:00:00Z",      // ISO 8601 UTC
  "end_time":    "1970-03-01T06:00:00Z",
  "station":     "S12" | "S14" | "S15" | "S16" | "ELYS",
  "options": {
    "filter_bands":      ["deep", "shallow", "thermal"],  // which bands to run
    "use_ml":            true,
    "ml_tier":           "ensemble" | "rf_only" | "cnn_only",
    "stalta_sensitivity": "low" | "medium" | "high",     // maps to preset thresholds
    "include_waveforms":  true,    // include raw waveform arrays in results
    "include_spectrograms": true   // include spectrogram images
  }
}

Response 202 (Accepted):
{
  "job_id":    "j_7f3a2c1b",
  "status":    "queued",
  "estimated_duration_seconds": 45,
  "websocket_url": "/ws/job/j_7f3a2c1b"
}
```

***

### `GET /jobs/{job_id}` — **Poll Job Status**

```json
Response 200 (while running):
{
  "job_id":    "j_7f3a2c1b",
  "status":    "running",       // queued | running | complete | failed
  "progress":  {
    "stage":      "feature_extraction",  // See stage list below
    "percent":    62,
    "message":    "Extracting features from 14 candidate windows..."
  },
  "created_at":  "2026-03-07T17:00:00Z",
  "updated_at":  "2026-03-07T17:00:45Z"
}

Response 200 (on completion):
{
  "job_id":    "j_7f3a2c1b",
  "status":    "complete",
  "progress":  { "stage": "done", "percent": 100, "message": "Analysis complete" },
  "result_id": "r_9d4e1a2f",   // Use this to fetch full results
  "summary": {
    "total_events_detected": 7,
    "data_reduction_percent": 91.3,
    "duration_seconds": 43.2
  }
}

Response 200 (on failure):
{
  "job_id":    "j_7f3a2c1b",
  "status":    "failed",
  "error": {
    "code":    "DATA_UNAVAILABLE",
    "message": "No waveform data available for requested time range",
    "detail":  "IRIS returned 204 for XA.S12..MHZ for 1970-03-01"
  }
}
```

**Stage progression** (what the frontend progress bar maps to):

```
queued → loading_data → preprocessing → glitch_removal →
filtering → stalta_detection → feature_extraction →
ml_classification → packaging → done
```

***

### `GET /results/{result_id}` — **Full Analysis Results**

```json
Response 200:
{
  "result_id":  "r_9d4e1a2f",
  "job_id":     "j_7f3a2c1b",
  "body":       "moon",
  "station":    "S12",
  "time_range": {
    "start": "1970-03-01T00:00:00Z",
    "end":   "1970-03-01T06:00:00Z"
  },
  "events": [
    {
      "event_id":       "e_001",
      "detection_time": "1970-03-01T01:43:22.4Z",  // UTC onset time
      "event_type":     "deep_moonquake",
      "confidence":     0.94,                        // 0.0–1.0
      "class_probabilities": {
        "noise":             0.02,
        "deep_moonquake":    0.94,
        "shallow_moonquake": 0.02,
        "thermal_moonquake": 0.01,
        "meteorite_impact":  0.01
      },
      "features": {
        "dominant_frequency":    0.87,
        "coda_duration_seconds": 1843,
        "kurtosis":              6.21,
        "decay_coefficient_b":   0.0003,
        "max_stalta_ratio":      4.7,
        "max_template_cc":       0.82
      },
      "window": {
        "start": "1970-03-01T01:41:22.4Z",   // 2 min pre-onset
        "end":   "1970-03-01T02:43:22.4Z"    // + coda duration
      },
      "catalog_match": {                      // null if no catalog match
        "catalog_event_id": "apollo.deep.12.0047",
        "catalog_time":     "1970-03-01T01:43:20.0Z",
        "time_delta_seconds": 2.4,
        "catalog_type":     "deep_moonquake",
        "type_match":       true
      },
      "waveform": {                           // only if options.include_waveforms=true
        "sampling_rate": 6.625,
        "times_relative": [0.0, 0.15, 0.30, ...],   // seconds from window start
        "amplitudes":     [1.2e-9, 1.4e-9, ...],     // m/s
        "channel":        "MHZ"
      },
      "spectrogram_url": "/results/r_9d4e1a2f/events/e_001/spectrogram.png"
    }
    // ... more events
  ],
  "transmission": {
    "total_raw_bytes":        86400000,
    "transmitted_bytes":      7603200,
    "data_reduction_percent": 91.2,
    "events_packaged":        7
  },
  "pipeline_metadata": {
    "preprocessing": {
      "response_removed":   true,
      "glitches_removed":   0,
      "thermal_windows_flagged": 2
    },
    "detection": {
      "candidates_from_stalta":  14,
      "candidates_after_ml":     7
    },
    "model_versions": {
      "rf_version":  "1.0.0",
      "cnn_version": "1.0.0"
    }
  }
}
```

***

### `GET /results/{result_id}/events/{event_id}/spectrogram.png`

Returns a PNG image directly (binary). Frontend renders with `<img src=...>`.

```
Response 200: Content-Type: image/png  (binary stream)
Response 404: { "error": "Spectrogram not found" }
```

***

### `GET /catalog/{body}` — **Reference Catalog**

Returns known events from official catalogs for comparison overlays.

```json
Request params:
  body:       "moon" | "mars"
  start_time: ISO string
  end_time:   ISO string
  types:      "deep_moonquake,shallow_moonquake" (comma-separated, optional)
  page:       1
  per_page:   50

Response 200:
{
  "body":   "moon",
  "total":  312,
  "page":   1,
  "per_page": 50,
  "events": [
    {
      "catalog_event_id": "apollo.deep.12.0047",
      "time":             "1970-03-01T01:43:20.0Z",
      "event_type":       "deep_moonquake",
      "cluster_id":       "A01",        // Deep moonquake cluster ID (Moon only)
      "magnitude":        null,         // Often unknown for moonquakes
      "station":          "S12",
      "source":           "Apollo PSE Expanded Catalog"
    }
  ]
}
```

***

### `GET /waveform` — **Raw Waveform Slice**

For the frontend waveform viewer — returns time-series data for any arbitrary time window.

```json
Request params:
  body:        "moon" | "mars"
  station:     "S12"
  start_time:  ISO string
  end_time:    ISO string
  channel:     "MHZ" | "MH1" | "MH2" | "SHZ" | "BHV"  (default: vertical)
  filter:      "raw" | "deep" | "shallow" | "thermal" | "lf" | "hf"
  decimation:  100   // downsample factor for large ranges (optional)

Response 200:
{
  "station":       "S12",
  "channel":       "MHZ",
  "filter_applied": "deep",
  "sampling_rate":  6.625,
  "start_time":    "1970-03-01T00:00:00Z",
  "end_time":      "1970-03-01T06:00:00Z",
  "n_samples":     143100,
  "times_utc":     ["1970-03-01T00:00:00.000Z", ...],
  "amplitudes":    [1.2e-9, 1.1e-9, ...]
}
```

> **Frontend note**: For long time windows, always pass `decimation` to avoid sending millions of points. At 1× zoom → `decimation=1000`, at max zoom → `decimation=1`.

***

### `GET /stations` — **Available Stations**

```json
Response 200:
{
  "moon": [
    { "id": "S12", "name": "Apollo 12", "lat": -3.04, "lon": -23.42,
      "active_from": "1969-11-19", "active_to": "1977-09-30",
      "channels": ["MHZ", "MH1", "MH2", "SHZ"] },
    { "id": "S14", ... },
    { "id": "S15", ... },
    { "id": "S16", ... }
  ],
  "mars": [
    { "id": "ELYS", "name": "InSight SEIS", "lat": 4.50, "lon": 135.62,
      "active_from": "2018-12-19", "active_to": "2022-12-21",
      "channels": ["BHV", "BHU", "BHW", "SHZ"] }
  ]
}
```

***

### `WS /ws/job/{job_id}` — **Real-Time Progress**

WebSocket connection. Server pushes events; frontend never sends.

```json
// Server → Client message types:

// 1. Stage progress update
{
  "type":    "progress",
  "stage":   "stalta_detection",
  "percent": 55,
  "message": "Running multi-band STA/LTA on filtered streams..."
}

// 2. Partial result — first event found (stream as found, don't wait for all)
{
  "type":  "event_found",
  "event": {
    "event_id":       "e_001",
    "detection_time": "1970-03-01T01:43:22.4Z",
    "event_type":     "deep_moonquake",
    "confidence":     0.94
  }
}

// 3. Job complete
{
  "type":      "complete",
  "result_id": "r_9d4e1a2f",
  "summary": {
    "total_events_detected": 7,
    "data_reduction_percent": 91.3
  }
}

// 4. Job failed
{
  "type":  "error",
  "code":  "PROCESSING_FAILED",
  "message": "Feature extraction failed: insufficient data in window"
}
```

***

## 3. Core Backend Implementation

### `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import analysis, catalog, data, health
from api.middleware.error_handler import global_exception_handler
from api.middleware.logging import setup_logging
from models.ensemble import load_all_models

app = FastAPI(title="SEISMOS API", version="1.0.0")

# CORS — replace with your frontend origin in production
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend.vercel.app"],
    allow_methods=["*"], allow_headers=["*"])

app.add_exception_handler(Exception, global_exception_handler)
setup_logging()

# Load ML models once at startup — never reload per-request
@app.on_event("startup")
async def startup():
    load_all_models()

app.include_router(health.router, tags=["Health"])
app.include_router(analysis.router, prefix="/analyze", tags=["Analysis"])
app.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])
app.include_router(data.router, prefix="/waveform", tags=["Data"])
```

***

### `api/schemas/analysis.py` — Pydantic Models

```python
from pydantic import BaseModel, validator
from typing import List, Optional, Literal
from datetime import datetime

class AnalysisOptions(BaseModel):
    filter_bands: List[Literal["deep","shallow","thermal","lf","hf"]] = ["deep","shallow","lf","hf"]
    use_ml: bool = True
    ml_tier: Literal["ensemble","rf_only","cnn_only"] = "ensemble"
    stalta_sensitivity: Literal["low","medium","high"] = "medium"
    include_waveforms: bool = True
    include_spectrograms: bool = True

class AnalysisRequest(BaseModel):
    body: Literal["moon", "mars"]
    start_time: datetime
    end_time: datetime
    station: str
    options: AnalysisOptions = AnalysisOptions()

    @validator("end_time")
    def end_after_start(cls, v, values):
        if "start_time" in values and v <= values["start_time"]:
            raise ValueError("end_time must be after start_time")
        if "start_time" in values and (v - values["start_time"]).total_seconds() > 86400:
            raise ValueError("Maximum analysis window is 24 hours")
        return v

class JobResponse(BaseModel):
    job_id: str
    status: str
    estimated_duration_seconds: int
    websocket_url: str

class ClassProbabilities(BaseModel):
    noise: float
    deep_moonquake: Optional[float] = None
    shallow_moonquake: Optional[float] = None
    thermal_moonquake: Optional[float] = None
    meteorite_impact: Optional[float] = None
    lf_marsquake: Optional[float] = None
    hf_marsquake: Optional[float] = None
    vf_marsquake: Optional[float] = None
    glitch: Optional[float] = None

class DetectedEvent(BaseModel):
    event_id: str
    detection_time: datetime
    event_type: str
    confidence: float
    class_probabilities: ClassProbabilities
    features: dict
    window: dict
    catalog_match: Optional[dict]
    waveform: Optional[dict]
    spectrogram_url: Optional[str]

class TransmissionStats(BaseModel):
    total_raw_bytes: int
    transmitted_bytes: int
    data_reduction_percent: float
    events_packaged: int

class AnalysisResult(BaseModel):
    result_id: str
    job_id: str
    body: str
    station: str
    time_range: dict
    events: List[DetectedEvent]
    transmission: TransmissionStats
    pipeline_metadata: dict
```

***

### `api/routes/analysis.py`

```python
from fastapi import APIRouter, HTTPException, BackgroundTasks
from api.schemas.analysis import AnalysisRequest, JobResponse, AnalysisResult
from services.job_service import create_job, get_job
from services.analysis_service import get_result
from workers.analysis_worker import run_analysis_task
import uuid

router = APIRouter()

@router.post("", response_model=JobResponse, status_code=202)
async def submit_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    job_id = f"j_{uuid.uuid4().hex[:8]}"
    create_job(job_id, request.dict())
    # Fire async worker
    background_tasks.add_task(run_analysis_task, job_id, request)
    return JobResponse(
        job_id=job_id,
        status="queued",
        estimated_duration_seconds=estimate_duration(request),
        websocket_url=f"/ws/job/{job_id}"
    )

@router.get("/jobs/{job_id}")
async def poll_job(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/results/{result_id}", response_model=AnalysisResult)
async def get_results(result_id: str):
    result = get_result(result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result

def estimate_duration(request: AnalysisRequest) -> int:
    hours = (request.end_time - request.start_time).total_seconds() / 3600
    base = 15 if request.body == "moon" else 20
    return int(base + hours * 8)
```

***

### `api/websocket/progress.py`

```python
from fastapi import WebSocket, WebSocketDisconnect
from fastapi import APIRouter
from store.job_store import subscribe_to_job_events
import asyncio, json

router = APIRouter()

@router.websocket("/ws/job/{job_id}")
async def websocket_job_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    try:
        async for event in subscribe_to_job_events(job_id):
            await websocket.send_text(json.dumps(event))
            if event["type"] in ("complete", "error"):
                break
    except WebSocketDisconnect:
        pass
    finally:
        await websocket.close()
```

***

### `services/analysis_service.py` — Orchestrator

```python
from pipeline.loader import load_waveform
from pipeline.preprocessor import preprocess_stream
from pipeline.detector import run_multi_band_stalta
from pipeline.features import extract_all_features
from models.ensemble import classify_candidates
from pipeline.transmit import package_output
from store.job_store import update_job_progress, complete_job, fail_job
from store.result_store import save_result
from services.catalog_service import match_against_catalog
import uuid, traceback

async def run_analysis(job_id: str, request):
    try:
        result_id = f"r_{uuid.uuid4().hex[:8]}"

        # --- Stage 1: Load Data ---
        update_job_progress(job_id, "loading_data", 5,
                            "Fetching waveform data from IRIS/local cache...")
        stream, inventory = load_waveform(
            body=request.body,
            station=request.station,
            start=request.start_time,
            end=request.end_time
        )

        # --- Stage 2: Preprocess ---
        update_job_progress(job_id, "preprocessing", 15,
                            "Removing instrument response, detrending...")
        stream = preprocess_stream(stream, inventory, body=request.body)

        # --- Stage 3: Glitch Removal ---
        update_job_progress(job_id, "glitch_removal", 25,
                            "Detecting and removing instrumental glitches...")
        if request.body == "mars":
            from pipeline.preprocessor import remove_glitches
            stream = remove_glitches(stream)

        # --- Stage 4: Multi-band Filtering ---
        update_job_progress(job_id, "filtering", 35,
                            "Applying frequency band filters...")
        from pipeline.preprocessor import apply_filter_banks
        filtered_bands = apply_filter_banks(stream, request.body,
                                             request.options.filter_bands)

        # --- Stage 5: STA/LTA Detection ---
        update_job_progress(job_id, "stalta_detection", 50,
                            "Running multi-band STA/LTA coincidence trigger...")
        candidates = run_multi_band_stalta(filtered_bands, request.body,
                                            request.options.stalta_sensitivity)

        # --- Stage 6: Feature Extraction ---
        update_job_progress(job_id, "feature_extraction", 65,
            f"Extracting features from {len(candidates)} candidate windows...")
        feature_matrix = extract_all_features(stream, candidates, request.body)

        # --- Stage 7: ML Classification ---
        update_job_progress(job_id, "ml_classification", 80,
                            "Classifying candidates with ML ensemble...")
        classified_events = classify_candidates(
            feature_matrix, candidates, stream,
            body=request.body, tier=request.options.ml_tier
        )

        # --- Stage 8: Catalog Matching ---
        for event in classified_events:
            event["catalog_match"] = match_against_catalog(
                event["detection_time"], request.body, request.station
            )

        # --- Stage 9: Package Output ---
        update_job_progress(job_id, "packaging", 90,
                            "Packaging selected events for transmission...")
        result = package_output(
            result_id, job_id, stream, classified_events, request,
            include_waveforms=request.options.include_waveforms,
            include_spectrograms=request.options.include_spectrograms
        )

        save_result(result_id, result)
        complete_job(job_id, result_id, result["transmission"])

    except Exception as e:
        fail_job(job_id, str(e), traceback.format_exc())
        raise
```

***

### `pipeline/preprocessor.py`

```python
from obspy import Stream
import numpy as np

def preprocess_stream(stream: Stream, inventory, body: str) -> Stream:
    st = stream.copy()
    st.detrend("linear")
    st.detrend("demean")
    st.taper(max_percentage=0.05, type="cosine")
    # Apollo: correct for sample rate drift
    if body == "moon":
        for tr in st:
            tr.interpolate(sampling_rate=6.625)
    # Remove instrument response
    st.remove_response(
        inventory=inventory,
        output="VEL",
        pre_filt=(0.001, 0.005, 10.0, 20.0),
        water_level=60
    )
    return st

FILTER_BANDS = {
    "moon": {
        "deep":    (0.5, 2.0),
        "shallow": (2.0, 8.0),
        "thermal": (5.0, 12.0),
    },
    "mars": {
        "lf": (0.1, 1.0),
        "hf": (1.0, 9.0),
    }
}

def apply_filter_banks(stream: Stream, body: str, bands: list) -> dict:
    result = {}
    body_bands = FILTER_BANDS[body]
    for band in bands:
        if band not in body_bands:
            continue
        fmin, fmax = body_bands[band]
        st_copy = stream.copy()
        st_copy.filter("bandpass", freqmin=fmin, freqmax=fmax,
                        corners=4, zerophase=True)
        result[band] = st_copy
    return result

def remove_glitches(stream: Stream, threshold_sigma: float = 5.0) -> Stream:
    st = stream.copy()
    for tr in st:
        diff = np.diff(tr.data)
        sigma = np.std(diff)
        glitch_idx = np.where(np.abs(diff) > threshold_sigma * sigma)[0]
        for idx in sorted(glitch_idx, reverse=True):
            window = 200
            pre  = tr.data[max(0, idx-window):idx]
            post = tr.data[idx:min(len(tr.data), idx+window)]
            if len(pre) > 0 and len(post) > 0:
                step = np.median(post) - np.median(pre)
                tr.data[idx:] -= step
    return st
```

***

### `store/job_store.py`

```python
import json, time
from typing import Optional
# In-memory store for dev; swap to Redis in production
_jobs = {}
_subscribers = {}

def create_job(job_id: str, request_data: dict):
    _jobs[job_id] = {
        "job_id":     job_id,
        "status":     "queued",
        "progress":   {"stage": "queued", "percent": 0, "message": "Job queued"},
        "request":    request_data,
        "created_at": time.time(),
        "updated_at": time.time()
    }
    _subscribers[job_id] = []

def update_job_progress(job_id: str, stage: str, percent: int, message: str):
    if job_id not in _jobs:
        return
    _jobs[job_id].update({
        "status":   "running",
        "progress": {"stage": stage, "percent": percent, "message": message},
        "updated_at": time.time()
    })
    _broadcast(job_id, {"type": "progress", "stage": stage,
                         "percent": percent, "message": message})

def complete_job(job_id: str, result_id: str, summary: dict):
    _jobs[job_id].update({
        "status": "complete",
        "progress": {"stage": "done", "percent": 100, "message": "Analysis complete"},
        "result_id": result_id,
        "summary": summary,
        "updated_at": time.time()
    })
    _broadcast(job_id, {"type": "complete", "result_id": result_id, "summary": summary})

def fail_job(job_id: str, message: str, detail: str = ""):
    _jobs[job_id].update({
        "status": "failed",
        "error": {"code": "PROCESSING_FAILED", "message": message, "detail": detail},
        "updated_at": time.time()
    })
    _broadcast(job_id, {"type": "error", "code": "PROCESSING_FAILED", "message": message})

def get_job(job_id: str) -> Optional[dict]:
    return _jobs.get(job_id)

def _broadcast(job_id: str, event: dict):
    for queue in _subscribers.get(job_id, []):
        queue.append(event)

async def subscribe_to_job_events(job_id: str):
    import asyncio
    queue = []
    if job_id in _subscribers:
        _subscribers[job_id].append(queue)
    while True:
        if queue:
            yield queue.pop(0)
        job = _jobs.get(job_id, {})
        if job.get("status") in ("complete", "failed") and not queue:
            break
        await asyncio.sleep(0.3)
```

***

## 4. Frontend Wiring Guide

Here is the **exact contract** your frontend needs to implement against:

### State Machine (What Your Frontend Manages)

```
IDLE
  │  User fills form → POST /analyze
  ▼
SUBMITTED  (has job_id, connects WebSocket)
  │  WS messages: "progress" → update progress bar + stage label
  ▼
RUNNING
  │  WS message: "event_found" → optimistically render event card
  │  WS message: "complete"   → store result_id
  ▼
COMPLETE   (fetch GET /results/:result_id → render full results)
  │  Or:
  ▼
FAILED     (show error.message from WS or GET /jobs/:id)
```

### Minimum Frontend API Calls

```
1. GET /health           → on app load, check models loaded
2. GET /stations         → populate station picker dropdown
3. GET /catalog/:body    → optional: show reference events on timeline
4. POST /analyze         → on form submit → get job_id
5. WS  /ws/job/:job_id   → progress stream (replace with polling GET /jobs/:id if no WS)
6. GET /results/:id      → full results after complete
7. GET /waveform?...     → waveform viewer data (lazy, on demand)
8. GET /results/:id/events/:eid/spectrogram.png  → image src
```

### Environment Variables Your Frontend Needs

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

***

## 5. Running the Backend

```bash
# Install
pip install fastapi uvicorn obspy scipy numpy pandas \
            scikit-learn torch torchvision pydantic \
            python-multipart aiofiles

# Dev server
uvicorn main:app --reload --port 8000

# API docs (auto-generated, shareable with frontend team)
open http://localhost:8000/docs        # Swagger UI
open http://localhost:8000/redoc       # ReDoc
```

The Swagger UI at `/docs` auto-generates from your Pydantic schemas — your frontend team can test every endpoint interactively without touching the frontend at all.

***

## 6. Error Codes Reference

```
DATA_UNAVAILABLE      No waveform data exists for requested range
INVALID_STATION       Station not valid for requested body
TIME_RANGE_TOO_LARGE  Requested window exceeds 24 hours
MODEL_NOT_LOADED      ML model failed to load at startup
PROCESSING_FAILED     Internal pipeline error (with detail field)
INSUFFICIENT_DATA     Window too short for meaningful STA/LTA
NO_CANDIDATES         STA/LTA found zero triggers (not an error — valid result)
```

Every error response follows the same shape:
```json
{ "error": { "code": "DATA_UNAVAILABLE", "message": "...", "detail": "..." } }
```

This gives your frontend exactly one error handler to write for all cases.