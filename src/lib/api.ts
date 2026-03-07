/**
 * SEISMOS — Typed API Client
 * All communication with the FastAPI backend goes through here.
 */

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const WS = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisOptions {
    filter_bands?: string[];
    use_ml?: boolean;
    ml_tier?: "ensemble" | "rf_only" | "cnn_only";
    stalta_sensitivity?: "low" | "medium" | "high";
    include_waveforms?: boolean;
    include_spectrograms?: boolean;
}

export interface AnalysisRequest {
    body: "moon" | "mars";
    start_time: string;   // ISO 8601
    end_time: string;
    station: string;
    options?: AnalysisOptions;
}

export interface JobResponse {
    job_id: string;
    status: string;
    estimated_duration_seconds: number;
    websocket_url: string;
}

export interface JobStatus {
    job_id: string;
    status: "queued" | "running" | "complete" | "failed";
    progress: { stage: string; percent: number; message: string };
    result_id?: string;
    summary?: { total_events_detected: number; data_reduction_percent: number };
    error?: { code: string; message: string };
}

export interface DetectedEvent {
    event_id: string;
    detection_time: string;
    event_type: string;
    confidence: number;
    class_probabilities: Record<string, number>;
    features: Record<string, number>;
    window: { start: string; end: string };
    catalog_match: null | { catalog_event_id: string; time_delta_seconds: number; type_match: boolean; catalog_type: string };
    waveform: null | { sampling_rate: number; times_relative: number[]; amplitudes: number[]; channel: string };
    spectrogram_url: null | string;
}

export interface AnalysisResult {
    result_id: string;
    job_id: string;
    body: string;
    station: string;
    time_range: { start: string; end: string };
    events: DetectedEvent[];
    transmission: { total_raw_bytes: number; transmitted_bytes: number; data_reduction_percent: number; events_packaged: number };
    pipeline_metadata: Record<string, unknown>;
}

export interface Station {
    id: string;
    name: string;
    lat: number;
    lon: number;
    active_from: string;
    active_to: string;
    channels: string[];
    network: string;
}

export interface WaveformData {
    station: string;
    channel: string;
    filter_applied: string;
    sampling_rate: number;
    start_time: string;
    end_time: string;
    n_samples: number;
    times_relative: number[];
    amplitudes: number[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function submitAnalysis(req: AnalysisRequest): Promise<JobResponse> {
    const r = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function pollJob(jobId: string): Promise<JobStatus> {
    const r = await fetch(`${API}/analyze/jobs/${jobId}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function getResult(resultId: string): Promise<AnalysisResult> {
    const r = await fetch(`${API}/analyze/results/${resultId}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function getStations(): Promise<{ moon: Station[]; mars: Station[] }> {
    const r = await fetch(`${API}/stations`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function getWaveform(params: {
    body: string; station: string; start_time: string;
    end_time: string; filter?: string; decimation?: number;
}): Promise<WaveformData> {
    const qObj: Record<string, string> = {
        body: params.body, station: params.station,
        start_time: params.start_time, end_time: params.end_time,
        ...(params.filter && { filter: params.filter }),
        ...(params.decimation != null && { decimation: String(params.decimation) }),
    };
    const q = new URLSearchParams(qObj);
    const r = await fetch(`${API}/waveform?${q}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function checkHealth(): Promise<{ status: string; mock_mode: boolean; models_loaded: Record<string, boolean> }> {
    const r = await fetch(`${API}/health`);
    if (!r.ok) return { status: "down", mock_mode: true, models_loaded: {} };
    return r.json();
}

// ── WebSocket helper ──────────────────────────────────────────────────────────

export function connectJobWebSocket(
    jobId: string,
    onMessage: (event: Record<string, unknown>) => void,
    onClose?: () => void,
): WebSocket {
    const ws = new WebSocket(`${WS}/ws/job/${jobId}`);
    ws.onmessage = (e) => {
        try { onMessage(JSON.parse(e.data)); } catch { /* noop */ }
    };
    ws.onclose = () => onClose?.();
    return ws;
}
