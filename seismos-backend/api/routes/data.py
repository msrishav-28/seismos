"""Data routes — waveform slices and station list"""
from fastapi import APIRouter, Query, HTTPException
from config import STATION_META, FILTER_BANDS, MOCK_MODE
from datetime import datetime
import numpy as np

router = APIRouter()


@router.get("/stations")
async def get_stations():
    return STATION_META


@router.get("/waveform")
async def get_waveform(
    body: str = Query(..., description="moon | mars"),
    station: str = Query(...),
    start_time: str = Query(...),
    end_time: str = Query(...),
    channel: str = Query("MHZ"),
    filter: str = Query("raw"),
    decimation: int = Query(100),
):
    if body not in ("moon", "mars"):
        raise HTTPException(400, "body must be 'moon' or 'mars'")

    if MOCK_MODE:
        return _mock_waveform(body, station, start_time, end_time, channel, filter, decimation)

    # Real mode — fetch via obspy FDSN
    try:
        from obspy.clients.fdsn import Client
        from obspy import UTCDateTime
        from config import FDSN_CLIENT
        client = Client(FDSN_CLIENT)
        st = client.get_waveforms(
            network="XA" if body == "moon" else "7I",
            station=station,
            location="*",
            channel=channel,
            starttime=UTCDateTime(start_time),
            endtime=UTCDateTime(end_time),
        )
        tr = st[0]
        if filter != "raw" and filter in FILTER_BANDS.get(body, {}):
            fmin, fmax = FILTER_BANDS[body][filter]
            tr.filter("bandpass", freqmin=fmin, freqmax=fmax, corners=4, zerophase=True)
        data = tr.data[::decimation].tolist()
        dt = 1.0 / tr.stats.sampling_rate * decimation
        times = [round(i * dt, 3) for i in range(len(data))]
        return {
            "station": station, "channel": channel,
            "filter_applied": filter, "sampling_rate": tr.stats.sampling_rate,
            "start_time": start_time, "end_time": end_time,
            "n_samples": len(data), "times_relative": times, "amplitudes": data,
        }
    except Exception as e:
        raise HTTPException(500, f"Waveform fetch failed: {str(e)}")


def _mock_waveform(body, station, start_time, end_time, channel, filter, decimation):
    """Return realistic synthetic waveform for dev/demo."""
    sr = 6.625 if body == "moon" else 20.0
    try:
        t0 = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
        duration = (t1 - t0).total_seconds()
    except Exception:
        duration = 3600.0

    n = int(duration * sr / decimation)
    t = np.linspace(0, duration, n)

    # Background noise
    noise = np.random.normal(0, 1e-9, n)
    # Seismic event around 1/3 of window
    event_t = duration / 3
    event_mask = np.exp(-0.001 * (t - event_t) ** 2)
    freq = 0.8 if body == "moon" else 1.5
    signal = event_mask * 5e-8 * np.sin(2 * np.pi * freq * t)
    amps = (noise + signal).tolist()
    times = [round(float(v), 4) for v in t]

    return {
        "station": station, "channel": channel,
        "filter_applied": filter, "sampling_rate": float(sr),
        "start_time": start_time, "end_time": end_time,
        "n_samples": len(amps), "times_relative": times, "amplitudes": amps,
    }
