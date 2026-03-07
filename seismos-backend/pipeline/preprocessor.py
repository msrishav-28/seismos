"""
Pipeline: Pre-Processor
Response removal → detrend → taper → Apollo rate correction →
InSight glitch removal → per-band filter banks.
"""
import numpy as np
from obspy import Stream
from config import FILTER_BANDS, MOCK_MODE


def preprocess_stream(stream: Stream, inventory, body: str) -> Stream:
    st = stream.copy()
    st.detrend("linear")
    st.detrend("demean")
    st.taper(max_percentage=0.05, type="cosine")

    # Apollo sample-rate correction (slight instrumental drift)
    if body == "moon":
        for tr in st:
            tr.interpolate(sampling_rate=6.625)

    # Remove instrument response (skip in mock — no inventory)
    if inventory is not None and not MOCK_MODE:
        try:
            st.remove_response(
                inventory=inventory,
                output="VEL",
                pre_filt=(0.001, 0.005, 10.0, 20.0),
                water_level=60,
            )
        except Exception as e:
            print(f"[preprocessor] response removal failed: {e}")

    return st


def apply_filter_banks(stream: Stream, body: str, requested_bands: list) -> dict:
    """Returns {band_name: filtered_stream} for each requested band."""
    body_bands = FILTER_BANDS.get(body, {})
    result = {}
    for band in requested_bands:
        if band not in body_bands:
            continue
        fmin, fmax = body_bands[band]
        st_copy = stream.copy()
        try:
            st_copy.filter("bandpass", freqmin=fmin, freqmax=fmax,
                           corners=4, zerophase=True)
        except Exception:
            pass
        result[band] = st_copy
    return result


def remove_glitches(stream: Stream, threshold_sigma: float = 5.0) -> Stream:
    """Detect and correct step-function glitches in InSight SEIS data."""
    st = stream.copy()
    for tr in st:
        diff = np.diff(tr.data.astype(float))
        sigma = np.std(diff)
        if sigma == 0:
            continue
        glitch_idx = np.where(np.abs(diff) > threshold_sigma * sigma)[0]
        for idx in sorted(glitch_idx, reverse=True):
            window = 200
            pre  = tr.data[max(0, idx - window):idx]
            post = tr.data[idx:min(len(tr.data), idx + window)]
            if len(pre) > 0 and len(post) > 0:
                step = float(np.median(post)) - float(np.median(pre))
                tr.data[idx:] -= step
    return st


def flag_thermal_windows(stream: Stream) -> list[dict]:
    """
    Flag probable thermal moonquake windows (Apollo).
    High-frequency energy bursts with short rise time.
    Returns list of {start_sample, end_sample} dicts.
    """
    windows = []
    for tr in stream:
        data = tr.data.astype(float)
        sr = tr.stats.sampling_rate
        win_len = int(sr * 60)   # 1-min windows
        for i in range(0, len(data) - win_len, win_len // 2):
            chunk = data[i:i + win_len]
            kurt = _kurtosis(chunk)
            if kurt > 10:  # High kurtosis → impulsive thermal
                windows.append({"start_sample": i, "end_sample": i + win_len})
    return windows


def _kurtosis(x: np.ndarray) -> float:
    mu = np.mean(x)
    sigma = np.std(x)
    if sigma == 0:
        return 0.0
    return float(np.mean((x - mu) ** 4) / sigma ** 4)
