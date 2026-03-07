"""
Pipeline: Output Packager
Selects confirmed event windows and computes transmission stats.
Optionally generates spectrogram images.
"""
import numpy as np
import uuid
from datetime import datetime, timezone, timedelta
from config import CODA_MAP, PRE_BUFFER, STATIC_DIR
from pathlib import Path


def package_output(
    result_id: str,
    job_id: str,
    stream,
    events: list[dict],
    request,
    include_waveforms: bool = True,
    include_spectrograms: bool = True,
) -> dict:
    """Build a full AnalysisResult-compatible dict."""
    tr = stream[0] if stream else None
    sr = tr.stats.sampling_rate if tr else 6.625
    total_samples = len(tr.data) if tr is not None else 0
    total_raw_bytes = total_samples * 8  # float64

    packaged_bytes = 0
    out_events = []

    for ev in events:
        etype    = ev.get("event_type", "noise")
        onset_t  = _parse_time(ev.get("detection_time"))
        coda_sec = CODA_MAP.get(etype, 300)

        win_start = onset_t - timedelta(seconds=PRE_BUFFER)
        win_end   = onset_t + timedelta(seconds=coda_sec)

        # Waveform slice
        waveform_data = None
        if include_waveforms and tr is not None:
            idx_start = max(0, int((win_start - _parse_time(str(tr.stats.starttime))).total_seconds() * sr))
            idx_end   = min(len(tr.data), int(idx_start + (PRE_BUFFER + coda_sec) * sr))
            chunk     = tr.data[idx_start:idx_end]
            dec       = max(1, len(chunk) // 2000)    # Cap at 2000 points for API
            times_rel = [round(i / sr * dec, 3) for i in range(0, len(chunk), dec)]
            amps      = [float(v) for v in chunk[::dec]]
            packaged_bytes += len(chunk) * 8
            waveform_data = {
                "sampling_rate":  float(sr),
                "times_relative": times_rel,
                "amplitudes":     amps,
                "channel":        tr.stats.channel,
            }
        else:
            packaged_bytes += int(coda_sec * sr * 8)

        # Spectrogram
        spec_url = None
        if include_spectrograms:
            spec_url = _generate_spectrogram(
                result_id, ev["event_id"],
                tr, sr, onset_t, stream[0].stats.starttime if tr else None,
                coda_sec,
            )

        out_events.append({
            "event_id":            ev["event_id"],
            "detection_time":      str(onset_t.isoformat()),
            "event_type":          etype,
            "confidence":          ev.get("confidence", 0.0),
            "class_probabilities": ev.get("class_probabilities", {}),
            "features":            ev.get("features", {}),
            "window": {
                "start": win_start.isoformat(),
                "end":   win_end.isoformat(),
            },
            "catalog_match":   ev.get("catalog_match", None),
            "waveform":        waveform_data,
            "spectrogram_url": spec_url,
        })

    reduction = (1 - packaged_bytes / max(total_raw_bytes, 1)) * 100

    return {
        "result_id":  result_id,
        "job_id":     job_id,
        "body":       request.body,
        "station":    request.station,
        "time_range": {
            "start": request.start_time.isoformat(),
            "end":   request.end_time.isoformat(),
        },
        "events": out_events,
        "transmission": {
            "total_raw_bytes":        total_raw_bytes,
            "transmitted_bytes":      packaged_bytes,
            "data_reduction_percent": round(max(0.0, reduction), 1),
            "events_packaged":        len(out_events),
        },
        "pipeline_metadata": {
            "preprocessing": {"response_removed": True},
            "detection":     {"candidates_from_stalta": len(events),
                              "candidates_after_ml":    len(out_events)},
            "model_versions": {"rf_version": "1.0.0", "cnn_version": "1.0.0"},
        },
    }


def _generate_spectrogram(result_id, event_id, tr, sr, onset_t, stream_start, coda_sec):
    """Generate and save a spectrogram PNG. Returns URL path."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from scipy import signal as scipy_signal

        if tr is None or stream_start is None:
            return None

        idx0 = max(0, int((_parse_time(str(stream_start)) - onset_t + timedelta(seconds=PRE_BUFFER)).total_seconds() * sr))
        idx1 = min(len(tr.data), idx0 + int((PRE_BUFFER + min(coda_sec, 600)) * sr))
        chunk = tr.data[idx0:idx1].astype(float)
        if len(chunk) < 32:
            return None

        fig, ax = plt.subplots(figsize=(8, 3), facecolor="#0E0E0E")
        ax.set_facecolor("#0E0E0E")
        f, t_ax, Sxx = scipy_signal.spectrogram(chunk, fs=sr, nperseg=min(256, len(chunk) // 4))
        ax.pcolormesh(t_ax, f, 10 * np.log10(Sxx + 1e-40), cmap="inferno", shading="auto")
        ax.set_xlabel("Time (s)", color="white", fontsize=8)
        ax.set_ylabel("Freq (Hz)", color="white", fontsize=8)
        ax.tick_params(colors="white")
        for spine in ax.spines.values():
            spine.set_edgecolor("#333")
        plt.tight_layout(pad=0.5)

        out_dir  = Path(STATIC_DIR) / "spectrograms" / result_id
        out_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{event_id}_spec.png"
        fig.savefig(out_dir / filename, dpi=100, bbox_inches="tight",
                    facecolor=fig.get_facecolor())
        plt.close(fig)
        return f"/static/spectrograms/{result_id}/{filename}"

    except Exception as e:
        print(f"[transmit] spectrogram failed: {e}")
        return None


def _parse_time(s) -> datetime:
    if isinstance(s, datetime):
        return s.replace(tzinfo=timezone.utc) if s.tzinfo is None else s
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)
