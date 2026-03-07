"""
Pipeline: Feature Extraction
Extracts 14-dimensional feature vectors from seismic windows.
"""
import numpy as np
from scipy import signal as scipy_signal
from obspy import Stream


def extract_all_features(stream: Stream, candidates: list[dict], body: str) -> list[dict]:
    """
    For each candidate window, extract features from the vertical channel.
    Returns list of dicts with features + original candidate metadata.
    """
    tr = _get_vertical(stream)
    if tr is None:
        return [{"candidate": c, "features": _zero_features()} for c in candidates]

    sr   = tr.stats.sampling_rate
    data = tr.data.astype(float)
    results = []

    for cand in candidates:
        onset_idx   = cand.get("onset_sample", 0)
        # Extract ~10-minute window (up to available data)
        win_samples = min(int(600 * sr), len(data) - onset_idx)
        if win_samples < int(10 * sr):
            # Window too short — skip
            continue

        window = data[onset_idx:onset_idx + win_samples]
        feats  = _extract_window_features(window, sr, body)
        feats["max_stalta_ratio"] = cand.get("stalta_peak", 0.0)
        results.append({"candidate": cand, "features": feats})

    return results


def _get_vertical(stream: Stream):
    """Return the first vertical-component trace."""
    for tr in stream:
        if tr.stats.channel.endswith("Z") or tr.stats.channel in ("MHZ", "BHV", "SHZ"):
            return tr
    return stream[0] if stream else None


def _extract_window_features(window: np.ndarray, sr: float, body: str) -> dict:
    n    = len(window)
    eps  = 1e-30

    # 1. RMS amplitude
    rms = float(np.sqrt(np.mean(window ** 2)))

    # 2. Peak amplitude
    peak = float(np.max(np.abs(window)))

    # 3. Envelope via Hilbert transform
    analytic = scipy_signal.hilbert(window)
    envelope = np.abs(analytic)

    # 4. Coda decay coefficient b (linear fit to log envelope)
    log_env = np.log(envelope + eps)
    t       = np.arange(n) / sr
    b       = 0.0
    if len(t) > 2:
        try:
            coeffs = np.polyfit(t, log_env, 1)
            b = float(coeffs[0])  # negative == decaying
        except np.linalg.LinAlgError:
            pass

    # 5. Envelope symmetry (ratio of rise to fall)
    half = n // 2
    rise = float(np.mean(envelope[:half]))
    fall = float(np.mean(envelope[half:]))
    symmetry = rise / (fall + eps)

    # 6. Spectrogram — dominant frequency band
    freqs, psd = scipy_signal.periodogram(window, fs=sr)
    dominant_freq = float(freqs[np.argmax(psd)]) if len(freqs) > 0 else 0.0

    # 7. Spectral centroid
    psd_sum = np.sum(psd) + eps
    centroid = float(np.sum(freqs * psd) / psd_sum)

    # 8. Spectral rolloff (95%)
    cumsum = np.cumsum(psd)
    rolloff_idx = np.searchsorted(cumsum, 0.95 * cumsum[-1])
    rolloff = float(freqs[rolloff_idx]) if rolloff_idx < len(freqs) else 0.0

    # 9. Kurtosis
    mu    = np.mean(window)
    sigma = np.std(window) + eps
    kurtosis = float(np.mean((window - mu) ** 4) / sigma ** 4)

    # 10. Skewness
    skewness = float(np.mean((window - mu) ** 3) / sigma ** 3)

    # 11. Zero crossing rate
    zcr = float(np.sum(np.diff(np.sign(window)) != 0) / n)

    # 12. Template cross-correlation (mock — max_template_cc)
    # In real mode this would correlate against 28 moonquake cluster templates
    max_template_cc = _mock_template_cc(dominant_freq, body)

    # 13. Coda duration (samples where envelope > 10% peak)
    threshold = 0.1 * (float(np.max(envelope)) + eps)
    above = np.where(envelope > threshold)[0]
    coda_duration = float(above[-1] - above[0]) / sr if len(above) > 1 else 0.0

    return {
        "rms_amplitude":         round(rms, 12),
        "peak_amplitude":        round(peak, 12),
        "decay_coefficient_b":   round(b, 6),
        "envelope_symmetry":     round(symmetry, 4),
        "dominant_frequency":    round(dominant_freq, 4),
        "spectral_centroid":     round(centroid, 4),
        "spectral_rolloff":      round(rolloff, 4),
        "kurtosis":              round(kurtosis, 4),
        "skewness":              round(skewness, 4),
        "zero_crossing_rate":    round(zcr, 6),
        "max_template_cc":       round(max_template_cc, 4),
        "coda_duration_seconds": round(coda_duration, 2),
        "max_stalta_ratio":      0.0,  # filled in by caller
    }


def _mock_template_cc(dominant_freq: float, body: str) -> float:
    """Synthetic template CC score based on frequency."""
    if body == "moon" and dominant_freq < 2.0:
        return np.random.uniform(0.65, 0.92)
    return np.random.uniform(0.15, 0.55)


def _zero_features() -> dict:
    return {k: 0.0 for k in [
        "rms_amplitude", "peak_amplitude", "decay_coefficient_b",
        "envelope_symmetry", "dominant_frequency", "spectral_centroid",
        "spectral_rolloff", "kurtosis", "skewness", "zero_crossing_rate",
        "max_template_cc", "coda_duration_seconds", "max_stalta_ratio",
    ]}


def build_feature_matrix(feature_dicts: list[dict]) -> np.ndarray:
    """Stack feature dicts into a 2D numpy array (n_samples × 13)."""
    FEATURE_KEYS = list(_zero_features().keys())
    rows = []
    for fd in feature_dicts:
        feats = fd.get("features", _zero_features())
        rows.append([feats.get(k, 0.0) for k in FEATURE_KEYS])
    return np.array(rows, dtype=float)
