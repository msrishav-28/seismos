"""SEISMOS API — Pydantic Schemas"""
from pydantic import BaseModel, field_validator
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime


class AnalysisOptions(BaseModel):
    filter_bands: List[str] = ["deep", "shallow", "lf", "hf"]
    use_ml: bool = True
    ml_tier: Literal["ensemble", "rf_only", "cnn_only"] = "ensemble"
    stalta_sensitivity: Literal["low", "medium", "high"] = "medium"
    include_waveforms: bool = True
    include_spectrograms: bool = True


class AnalysisRequest(BaseModel):
    body: Literal["moon", "mars"]
    start_time: datetime
    end_time: datetime
    station: str
    options: AnalysisOptions = AnalysisOptions()

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v, info):
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        if "start_time" in info.data:
            delta = (v - info.data["start_time"]).total_seconds()
            if delta > 86400:
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


class CatalogMatch(BaseModel):
    catalog_event_id: str
    catalog_time: datetime
    time_delta_seconds: float
    catalog_type: str
    type_match: bool


class WaveformData(BaseModel):
    sampling_rate: float
    times_relative: List[float]
    amplitudes: List[float]
    channel: str


class DetectedEvent(BaseModel):
    event_id: str
    detection_time: datetime
    event_type: str
    confidence: float
    class_probabilities: ClassProbabilities
    features: Dict[str, Any]
    window: Dict[str, str]
    catalog_match: Optional[CatalogMatch]
    waveform: Optional[WaveformData]
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
    time_range: Dict[str, str]
    events: List[DetectedEvent]
    transmission: TransmissionStats
    pipeline_metadata: Dict[str, Any]


class WaveformResponse(BaseModel):
    station: str
    channel: str
    filter_applied: str
    sampling_rate: float
    start_time: str
    end_time: str
    n_samples: int
    times_relative: List[float]
    amplitudes: List[float]


class ProgressEvent(BaseModel):
    type: str
    stage: Optional[str] = None
    percent: Optional[int] = None
    message: Optional[str] = None
    event: Optional[Dict[str, Any]] = None
    result_id: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None
    code: Optional[str] = None
