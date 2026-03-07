"use client";
import { useState, useCallback, useRef } from "react";
import {
    submitAnalysis, pollJob, getResult, connectJobWebSocket,
    AnalysisRequest, JobStatus, AnalysisResult, DetectedEvent,
} from "@/lib/api";

export type Phase =
    | "idle" | "submitting" | "queued" | "running" | "complete" | "failed";

export interface ProgressState {
    stage: string;
    percent: number;
    message: string;
}

export interface AnalysisJobState {
    phase: Phase;
    progress: ProgressState;
    jobId: string | null;
    result: AnalysisResult | null;
    liveEvents: DetectedEvent[];
    error: string | null;
    submit: (req: AnalysisRequest) => Promise<void>;
    reset: () => void;
}

const ZERO_PROGRESS: ProgressState = { stage: "idle", percent: 0, message: "" };

export function useAnalysisJob(): AnalysisJobState {
    const [phase, setPhase] = useState<Phase>("idle");
    const [progress, setProgress] = useState<ProgressState>(ZERO_PROGRESS);
    const [jobId, setJobId] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [liveEvents, setLiveEvents] = useState<DetectedEvent[]>([]);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const reset = useCallback(() => {
        wsRef.current?.close();
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase("idle");
        setProgress(ZERO_PROGRESS);
        setJobId(null);
        setResult(null);
        setLiveEvents([]);
        setError(null);
    }, []);

    const submit = useCallback(async (req: AnalysisRequest) => {
        reset();
        setPhase("submitting");
        try {
            const job = await submitAnalysis(req);
            setJobId(job.job_id);
            setPhase("queued");

            // Try WebSocket first
            let wsOk = false;
            try {
                const ws = connectJobWebSocket(
                    job.job_id,
                    (msg) => handleWsEvent(msg, job.job_id),
                    () => {
                        if (!wsOk) startPolling(job.job_id);
                    },
                );
                wsRef.current = ws;
                ws.onopen = () => { wsOk = true; };
            } catch {
                startPolling(job.job_id);
            }
        } catch (e: unknown) {
            setPhase("failed");
            setError(e instanceof Error ? e.message : "Submission failed");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reset]);

    async function handleWsEvent(msg: Record<string, unknown>, jid: string) {
        switch (msg.type) {
            case "progress":
                setPhase("running");
                setProgress({
                    stage: String(msg.stage ?? ""),
                    percent: Number(msg.percent ?? 0),
                    message: String(msg.message ?? ""),
                });
                break;
            case "event_found":
                if (msg.event) {
                    setLiveEvents(prev => [...prev, msg.event as DetectedEvent]);
                }
                break;
            case "complete":
                setProgress({ stage: "done", percent: 100, message: "Analysis complete" });
                await fetchFinalResult(String(msg.result_id ?? ""));
                break;
            case "error":
                setPhase("failed");
                setError(String(msg.message ?? "Unknown error"));
                break;
        }
    }

    function startPolling(jid: string) {
        pollRef.current = setInterval(async () => {
            try {
                const status: JobStatus = await pollJob(jid);
                setProgress(status.progress);
                if (status.status === "running") setPhase("running");
                if (status.status === "complete" && status.result_id) {
                    clearInterval(pollRef.current!);
                    await fetchFinalResult(status.result_id);
                }
                if (status.status === "failed") {
                    clearInterval(pollRef.current!);
                    setPhase("failed");
                    setError(status.error?.message ?? "Analysis failed");
                }
            } catch (e) {
                console.error("Poll error:", e);
            }
        }, 1500);
    }

    async function fetchFinalResult(resultId: string) {
        try {
            const r = await getResult(resultId);
            setResult(r);
            setLiveEvents(r.events);
            setPhase("complete");
        } catch (e: unknown) {
            setPhase("failed");
            setError(e instanceof Error ? e.message : "Failed to fetch results");
        }
    }

    return { phase, progress, jobId, result, liveEvents, error, submit, reset };
}
