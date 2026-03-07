"""
Pipeline: Multi-band STA/LTA Coincidence Detector
Fires when ≥2 frequency bands trigger within a 10-second window.
"""
import numpy as np
from obspy import Stream
from config import STALTA_PARAMS, SENSITIVITY_MULTIPLIERS


def run_multi_band_stalta(
    filtered_bands: dict,
    body: str,
    sensitivity: str = "medium",
) -> list[dict]:
    """
    Args:
        filtered_bands: {band_name: obspy.Stream}
        body: "moon" | "mars"
        sensitivity: "low" | "medium" | "high"

    Returns list of candidate dicts:
        {onset_time, onset_sample, band, stalta_peak, window_seconds}
    """
    multiplier = SENSITIVITY_MULTIPLIERS.get(sensitivity, 1.0)
    params     = STALTA_PARAMS.get(body, {})

    band_triggers: dict[str, list[dict]] = {}

    for band, st in filtered_bands.items():
        if band not in params:
            continue
        p  = params[band]
        on_thresh  = p["on"]  * multiplier
        off_thresh = p["off"] * multiplier

        for tr in st:
            sr   = tr.stats.sampling_rate
            data = tr.data.astype(float)

            sta_win = max(1, int(p["sta"] * sr))
            lta_win = max(2, int(p["lta"] * sr))

            cft = _classic_stalta(data, sta_win, lta_win)
            triggers = _threshold_triggers(cft, on_thresh, off_thresh, tr.stats.starttime, sr)

            key = band
            if key not in band_triggers:
                band_triggers[key] = []
            band_triggers[key].extend(triggers)

    return _coincidence_trigger(band_triggers, coincidence_window=10.0, min_bands=2)


# ── Classic STA/LTA ───────────────────────────────────────────────────────────

def _classic_stalta(data: np.ndarray, nsta: int, nlta: int) -> np.ndarray:
    """Vectorised recursive STA/LTA characteristic function."""
    n   = len(data)
    cft = np.zeros(n)
    sta = 0.0
    lta = 0.0
    d2  = data ** 2

    for i in range(nlta, n):
        sta += d2[i] - d2[i - nsta] if i >= nsta else d2[i]
        lta += d2[i] - d2[i - nlta]
        if lta > 0:
            cft[i] = (sta / nsta) / (lta / nlta)
    return cft


def _threshold_triggers(cft, on, off, starttime, sr) -> list[dict]:
    triggers   = []
    in_trigger = False
    onset_idx  = 0

    for i, val in enumerate(cft):
        if not in_trigger and val >= on:
            in_trigger = True
            onset_idx  = i
        elif in_trigger and val < off:
            in_trigger = False
            peak = float(np.max(cft[onset_idx:i]))
            triggers.append({
                "onset_sample": onset_idx,
                "onset_time":   str(starttime + onset_idx / sr),
                "stalta_peak":  round(peak, 3),
            })

    # Still triggered at end
    if in_trigger:
        peak = float(np.max(cft[onset_idx:]))
        triggers.append({
            "onset_sample": onset_idx,
            "onset_time":   str(starttime + onset_idx / sr),
            "stalta_peak":  round(peak, 3),
        })

    return triggers


# ── Coincidence trigger ───────────────────────────────────────────────────────

def _coincidence_trigger(
    band_triggers: dict,
    coincidence_window: float = 10.0,
    min_bands: int = 2,
) -> list[dict]:
    """Keep only onsets that occur in ≥ min_bands bands within coincidence_window seconds."""
    # Flatten all triggers with their band label
    all_triggers = []
    for band, triggers in band_triggers.items():
        for t in triggers:
            all_triggers.append({**t, "band": band})

    if not all_triggers:
        return []

    # Sort by onset time (string ISO — sort lexicographically, works for ISO)
    all_triggers.sort(key=lambda x: x["onset_time"])

    candidates = []
    used = set()

    for i, t in enumerate(all_triggers):
        if i in used:
            continue
        group = [t]
        bands_seen = {t["band"]}

        # Parse time for comparison
        try:
            from obspy import UTCDateTime
            t0 = UTCDateTime(t["onset_time"])
        except Exception:
            continue

        for j, t2 in enumerate(all_triggers):
            if j == i or j in used:
                continue
            try:
                t1 = UTCDateTime(t2["onset_time"])
            except Exception:
                continue
            if abs(t1 - t0) <= coincidence_window and t2["band"] not in bands_seen:
                group.append(t2)
                bands_seen.add(t2["band"])

        if len(bands_seen) >= min_bands:
            # Use the earliest onset
            best = min(group, key=lambda x: x["onset_time"])
            candidates.append({
                "onset_time":  best["onset_time"],
                "onset_sample": best["onset_sample"],
                "bands_triggered": list(bands_seen),
                "stalta_peak":  max(x["stalta_peak"] for x in group),
            })
            for item in group:
                idx = all_triggers.index(item)
                used.add(idx)

    return candidates
