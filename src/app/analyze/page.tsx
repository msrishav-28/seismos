"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Moon, Orbit, Activity, Brain, ArrowRight, RotateCcw,
    AlertCircle, CheckCircle2, Zap, Database, BarChart2, Cpu,
} from "lucide-react";
import { Nav } from "@/components/Nav";
import { Space3D } from "@/components/Space3D";
import { Magnetic } from "@/components/ui/Magnetic";
import { useAnalysisJob } from "@/hooks/useAnalysisJob";
import type { AnalysisResult, DetectedEvent, Station } from "@/lib/api";
import { getStations, checkHealth, getWaveform } from "@/lib/api";

// ────────────────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
    queued: "Queued",
    loading_data: "Fetching Waveform Data",
    preprocessing: "Pre-Processing Signal",
    glitch_removal: "Glitch Detection",
    filtering: "Multi-Band Filtering",
    stalta_detection: "STA/LTA Detection",
    feature_extraction: "Feature Extraction",
    ml_classification: "ML Classification",
    packaging: "Packaging Output",
    done: "Complete",
};

const EVENT_COLORS: Record<string, string> = {
    deep_moonquake: "#ef4444",
    shallow_moonquake: "#f97316",
    thermal_moonquake: "#eab308",
    meteorite_impact: "#a855f7",
    lf_marsquake: "#3b82f6",
    hf_marsquake: "#06b6d4",
    vf_marsquake: "#10b981",
    glitch: "#6b7280",
    noise: "#374151",
};

// ────────────────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
    const [stations, setStations] = useState<{ moon: Station[]; mars: Station[] } | null>(null);
    const [health, setHealth] = useState<{ status: string; mock_mode: boolean } | null>(null);

    // Form state
    const [body, setBody] = useState<"moon" | "mars">("moon");
    const [station, setStation] = useState("S12");
    const [startTime, setStartTime] = useState("1970-03-01T00:00:00Z");
    const [endTime, setEndTime] = useState("1970-03-01T06:00:00Z");
    const [mlTier, setMlTier] = useState<"ensemble" | "rf_only" | "cnn_only">("ensemble");
    const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");

    const { phase, progress, result, liveEvents, error, submit, reset } = useAnalysisJob();

    useEffect(() => {
        getStations().then(setStations).catch(console.error);
        checkHealth().then(setHealth).catch(console.error);
    }, []);

    const availableStations = body === "moon"
        ? (stations?.moon ?? [])
        : (stations?.mars ?? []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submit({
            body, station, start_time: startTime, end_time: endTime,
            options: {
                ml_tier: mlTier, stalta_sensitivity: sensitivity,
                include_waveforms: true, include_spectrograms: true
            }
        });
    };

    const isRunning = phase === "submitting" || phase === "queued" || phase === "running";
    const isComplete = phase === "complete";
    const isFailed = phase === "failed";

    return (
        <div className="min-h-screen bg-[#0E0E0E] text-white overflow-x-hidden relative selection:bg-red-600/30">
            <Space3D />
            <Nav />

            <div className="relative z-10 pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">

                {/* ── Header ──────────────────────────────────────────────────────── */}
                <div className="mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 mb-8 text-red-500 text-[10px] font-bold uppercase tracking-[0.5em]"
                    >
                        <span className="w-10 h-px bg-red-500" />
                        Seismic Analysis Console
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-6xl md:text-8xl font-light tracking-tighter uppercase leading-none"
                    >
                        Run Analysis
                    </motion.h1>
                    {health && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-3 mt-6"
                        >
                            <span className={`w-2 h-2 rounded-full ${health.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold">
                                Backend {health.status === "ok" ? "Online" : "Offline"}
                                {health.mock_mode ? " — Mock Mode" : " — Live Data"}
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* ── Main Grid ────────────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

                    {/* ── Form ──────────────────────────────────────────────────────── */}
                    <div className="xl:col-span-2">
                        <AnimatePresence mode="wait">
                            {phase === "idle" || isFailed ? (
                                <motion.form
                                    key="form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                >
                                    {isFailed && (
                                        <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5 flex gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-red-400">Analysis Failed</p>
                                                <p className="text-xs text-red-400/60 mt-1">{error}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Body selector */}
                                    <FormCard label="Planetary Body">
                                        <div className="grid grid-cols-2 gap-3">
                                            {(["moon", "mars"] as const).map((b) => (
                                                <button
                                                    key={b} type="button"
                                                    onClick={() => { setBody(b); setStation(b === "moon" ? "S12" : "ELYS"); }}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-500 text-sm font-medium uppercase tracking-[0.2em]
                            ${body === b ? "bg-red-600/20 border-red-500/60 text-white" : "bg-white/[0.02] border-white/10 text-white/40 hover:border-white/20"}`}
                                                >
                                                    {b === "moon" ? <Moon className="w-4 h-4" /> : <Orbit className="w-4 h-4" />}
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </FormCard>

                                    {/* Station */}
                                    <FormCard label="Station">
                                        <select
                                            value={station}
                                            onChange={e => setStation(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                                        >
                                            {availableStations.map(s => (
                                                <option key={s.id} value={s.id} className="bg-[#1a1a1a]">
                                                    {s.id} — {s.name}
                                                </option>
                                            ))}
                                            {availableStations.length === 0 && (
                                                <option value={body === "moon" ? "S12" : "ELYS"} className="bg-[#1a1a1a]">
                                                    {body === "moon" ? "S12 — Apollo 12" : "ELYS — InSight SEIS"}
                                                </option>
                                            )}
                                        </select>
                                    </FormCard>

                                    {/* Time range */}
                                    <FormCard label="Time Window">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold block mb-1.5">Start</label>
                                                <input type="text" value={startTime} onChange={e => setStartTime(e.target.value)}
                                                    placeholder="1970-03-01T00:00:00Z"
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors font-mono" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold block mb-1.5">End</label>
                                                <input type="text" value={endTime} onChange={e => setEndTime(e.target.value)}
                                                    placeholder="1970-03-01T06:00:00Z"
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors font-mono" />
                                            </div>
                                        </div>
                                    </FormCard>

                                    {/* ML Options */}
                                    <FormCard label="ML Options">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold block mb-2">Model Tier</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(["ensemble", "rf_only", "cnn_only"] as const).map(t => (
                                                        <button key={t} type="button" onClick={() => setMlTier(t)}
                                                            className={`py-2 rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] border transition-all
                                ${mlTier === t ? "bg-red-600/20 border-red-500/50 text-white" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                                                            {t.replace("_only", "")}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold block mb-2">Sensitivity</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(["low", "medium", "high"] as const).map(s => (
                                                        <button key={s} type="button" onClick={() => setSensitivity(s)}
                                                            className={`py-2 rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] border transition-all
                                ${sensitivity === s ? "bg-red-600/20 border-red-500/50 text-white" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </FormCard>

                                    <Magnetic strength={0.2}>
                                        <button type="submit"
                                            className="group w-full py-5 rounded-2xl bg-white text-black font-bold uppercase tracking-[0.3em] text-sm
                        flex items-center justify-center gap-4 hover:bg-red-600 hover:text-white transition-all duration-700 overflow-hidden relative"
                                        >
                                            <span>Run Analysis</span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </Magnetic>

                                    {isFailed && (
                                        <button type="button" onClick={reset}
                                            className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm flex items-center justify-center gap-2 hover:border-white/20 hover:text-white/60 transition-all">
                                            <RotateCcw className="w-4 h-4" /> Reset
                                        </button>
                                    )}
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="progress"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Progress card */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold">
                                                    {isComplete ? "Analysis Complete" : "Processing"}
                                                </p>
                                                <p className="text-xl font-light">
                                                    {STAGE_LABELS[progress.stage] ?? progress.stage}
                                                </p>
                                            </div>
                                            {isComplete
                                                ? <CheckCircle2 className="w-8 h-8 text-green-500" />
                                                : <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                >
                                                    <Activity className="w-8 h-8 text-red-500" />
                                                </motion.div>
                                            }
                                        </div>

                                        {/* Progress bar */}
                                        <div className="space-y-3">
                                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                                                    animate={{ width: `${progress.percent}%` }}
                                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] text-white/30 font-mono">
                                                <span>{progress.message}</span>
                                                <span>{progress.percent}%</span>
                                            </div>
                                        </div>

                                        {/* Stage pipeline */}
                                        <div className="space-y-1.5">
                                            {Object.entries(STAGE_LABELS).filter(([k]) => k !== "done").map(([stage, label]) => {
                                                const stageOrder = Object.keys(STAGE_LABELS).indexOf(progress.stage);
                                                const thisOrder = Object.keys(STAGE_LABELS).indexOf(stage);
                                                const done = thisOrder < stageOrder || isComplete;
                                                const active = stage === progress.stage && !isComplete;
                                                return (
                                                    <div key={stage} className={`flex items-center gap-3 py-1.5 transition-all duration-500
                            ${done ? "text-white/60" : active ? "text-white" : "text-white/15"}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? "bg-green-500" : active ? "bg-red-500 animate-pulse" : "bg-white/10"}`} />
                                                        <span className="text-[10px] font-mono">{label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {isComplete && (
                                        <button onClick={reset}
                                            className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm flex items-center justify-center gap-2 hover:border-red-500/30 hover:text-white/60 transition-all">
                                            <RotateCcw className="w-4 h-4" /> New Analysis
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Results Panel ─────────────────────────────────────────────── */}
                    <div className="xl:col-span-3 space-y-6">
                        <AnimatePresence>
                            {(liveEvents.length > 0 || isComplete) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Summary bar */}
                                    {result && (
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { label: "Events", value: String(result.events.length), icon: Activity },
                                                { label: "Data Reduction", value: `${result.transmission.data_reduction_percent}%`, icon: Database },
                                                { label: "Station", value: result.station, icon: Zap },
                                            ].map(({ label, value, icon: Icon }) => (
                                                <div key={label} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                                    <Icon className="w-4 h-4 text-red-500 mb-3" />
                                                    <p className="text-2xl font-light tracking-tighter">{value}</p>
                                                    <p className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold mt-1">{label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Event cards */}
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] text-white/30 uppercase tracking-[0.5em] font-bold">
                                            Detected Events ({liveEvents.length})
                                        </h3>
                                        {liveEvents.map((ev) => (
                                            <EventCard key={ev.event_id} event={ev} apiBase={process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {phase === "idle" && (
                                <motion.div
                                    key="placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-[500px] flex flex-col items-center justify-center gap-8 rounded-3xl border border-dashed border-white/10"
                                >
                                    <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center">
                                        <Activity className="w-10 h-10 text-white/10" />
                                    </div>
                                    <div className="text-center space-y-3">
                                        <p className="text-xl font-light text-white/20">Awaiting Analysis</p>
                                        <p className="text-sm text-white/10 max-w-xs">Configure your parameters and submit to begin planetary seismic detection.</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormCard({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4">
            <p className="text-[9px] text-white/30 uppercase tracking-[0.5em] font-bold">{label}</p>
            {children}
        </div>
    );
}

function EventCard({ event, apiBase }: { event: DetectedEvent; apiBase: string }) {
    const [expanded, setExpanded] = useState(false);
    const color = EVENT_COLORS[event.event_type] ?? "#6b7280";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-500"
        >
            <button className="w-full text-left p-6" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="space-y-1">
                            <p className="font-medium text-sm capitalize">{event.event_type.replace(/_/g, " ")}</p>
                            <p className="text-[10px] text-white/30 font-mono">
                                {new Date(event.detection_time).toISOString().replace("T", " ").slice(0, 19)} UTC
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${event.confidence * 100}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-xs font-mono text-white/60">{(event.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] mt-1">Confidence</p>
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5"
                    >
                        <div className="p-6 space-y-6">
                            {/* Class probabilities */}
                            <div className="space-y-3">
                                <p className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold">Class Probabilities</p>
                                {Object.entries(event.class_probabilities)
                                    .filter(([, v]) => typeof v === "number" && v > 0.01)
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .slice(0, 5)
                                    .map(([cls, prob]) => (
                                        <div key={cls} className="flex items-center gap-3">
                                            <span className="text-[10px] text-white/40 w-36 truncate capitalize">{cls.replace(/_/g, " ")}</span>
                                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-red-600/60" style={{ width: `${(prob as number) * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] text-white/40 font-mono w-10 text-right">{((prob as number) * 100).toFixed(1)}%</span>
                                        </div>
                                    ))}
                            </div>

                            {/* Key features */}
                            <div className="space-y-3">
                                <p className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold">Key Features</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        ["Dominant Freq", `${event.features.dominant_frequency?.toFixed(2) ?? "—"} Hz`],
                                        ["Coda Duration", `${event.features.coda_duration_seconds?.toFixed(0) ?? "—"} s`],
                                        ["STA/LTA Peak", `${event.features.max_stalta_ratio?.toFixed(2) ?? "—"}`],
                                        ["Kurtosis", `${event.features.kurtosis?.toFixed(2) ?? "—"}`],
                                        ["Template CC", `${event.features.max_template_cc?.toFixed(3) ?? "—"}`],
                                        ["Spectral Centroid", `${event.features.spectral_centroid?.toFixed(2) ?? "—"} Hz`],
                                    ].map(([k, v]) => (
                                        <div key={k} className="bg-white/[0.02] rounded-xl p-3">
                                            <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-bold">{k}</p>
                                            <p className="text-sm font-mono mt-1 text-white/70">{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Waveform mini chart */}
                            {event.waveform && (
                                <div className="space-y-3">
                                    <p className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold">Waveform</p>
                                    <MiniWaveform data={event.waveform.amplitudes} />
                                </div>
                            )}

                            {/* Spectrogram */}
                            {event.spectrogram_url && (
                                <div className="space-y-3">
                                    <p className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold">Spectrogram</p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`${apiBase}${event.spectrogram_url}`}
                                        alt="spectrogram"
                                        className="w-full rounded-xl border border-white/10"
                                    />
                                </div>
                            )}

                            {/* Catalog match */}
                            {event.catalog_match && (
                                <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4 space-y-2">
                                    <p className="text-[9px] text-green-500/70 uppercase tracking-[0.4em] font-bold">Catalog Match</p>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                        <div>
                                            <p className="text-sm text-white/70">{event.catalog_match.catalog_event_id}</p>
                                            <p className="text-[10px] text-white/30 mt-0.5">
                                                Δt = {event.catalog_match.time_delta_seconds?.toFixed(1)}s •{" "}
                                                Type match: {event.catalog_match.type_match ? "✓" : "✗"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function MiniWaveform({ data }: { data: number[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data.length) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const max = Math.max(...data.map(Math.abs)) || 1;
        const step = Math.max(1, Math.floor(data.length / w));
        const pts = [];
        for (let i = 0; i < w; i++) {
            const idx = Math.min(i * step, data.length - 1);
            pts.push((data[idx] / max) * (h / 2) + h / 2);
        }

        // Grid line
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        // Waveform
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "rgba(239,68,68,0.4)");
        grad.addColorStop(0.5, "rgba(239,68,68,0.9)");
        grad.addColorStop(1, "rgba(239,68,68,0.4)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        pts.forEach((y, x) => x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.stroke();
    }, [data]);

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={80}
            className="w-full rounded-xl border border-white/5 bg-white/[0.01]"
        />
    );
}
