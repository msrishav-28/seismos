"""
Pipeline: Data Loader
Fetches waveform data from IRIS FDSN or local cache.
Falls back to synthetic data in mock mode.
"""
from config import MOCK_MODE, FDSN_CLIENT, RAW_DIR, STATION_META
from obspy import UTCDateTime, Stream, Inventory
import numpy as np
from pathlib import Path
import traceback


def load_waveform(body: str, station: str, start, end):
    """
    Returns (stream, inventory) — real or synthetic.
    `start` and `end` can be datetime or ISO strings.
    """
    if MOCK_MODE:
        return _mock_stream(body, station, start, end)

    try:
        from obspy.clients.fdsn import Client
        client = Client(FDSN_CLIENT)

        # Determine network from body
        network = "XA" if body == "moon" else "7I"
        t0 = UTCDateTime(start)
        t1 = UTCDateTime(end)

        # Cache key
        cache_path = Path(RAW_DIR) / body / f"{station}_{t0.strftime('%Y%m%dT%H%M%S')}_{t1.strftime('%Y%m%dT%H%M%S')}.mseed"

        if cache_path.exists():
            from obspy import read
            st = read(str(cache_path))
        else:
            st = client.get_waveforms(
                network=network,
                station=station,
                location="*",
                channel="*",
                starttime=t0,
                endtime=t1,
            )
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            st.write(str(cache_path), format="MSEED")

        inv = client.get_stations(
            network=network, station=station,
            starttime=t0, endtime=t1, level="response",
        )
        return st, inv

    except Exception as exc:
        # Log and fall back to mock on FDSN failure
        print(f"[loader] FDSN failed for {body}/{station}: {exc}\n{traceback.format_exc()}")
        return _mock_stream(body, station, start, end)


# ── Synthetic data generator ──────────────────────────────────────────────────

def _mock_stream(body: str, station: str, start, end):
    """Realistic synthetic seismic stream with embedded events."""
    from obspy import Trace
    from obspy.core.inventory import Inventory as Inv

    sr = 6.625 if body == "moon" else 20.0
    try:
        t0 = UTCDateTime(start)
        t1 = UTCDateTime(end)
    except Exception:
        t0 = UTCDateTime("1970-03-01T00:00:00Z")
        t1 = UTCDateTime("1970-03-01T06:00:00Z")

    duration = t1 - t0
    n = int(duration * sr)
    t = np.linspace(0, duration, n)

    rng = np.random.default_rng(seed=int(t0.timestamp) % (2**31))

    # Background noise
    noise = rng.normal(0, 1e-9, n)

    # Inject 2–4 synthetic seismic events
    n_events = rng.integers(2, 5)
    event_times = sorted(rng.uniform(duration * 0.1, duration * 0.9, n_events).tolist())

    for et in event_times:
        amp = rng.uniform(3e-8, 8e-8)
        # Frequency based on event type / body
        freq = rng.uniform(0.5, 1.5) if body == "moon" else rng.uniform(1.0, 4.0)
        decay = 0.001 if body == "moon" else 0.01   # Moon: slow coda
        envelope = amp * np.exp(-decay * (t - et) ** 2)
        noise += envelope * np.sin(2 * np.pi * freq * t)

    channel = "MHZ" if body == "moon" else "BHV"
    tr = Trace()
    tr.data = noise.astype(np.float64)
    tr.stats.sampling_rate = sr
    tr.stats.network = "XA" if body == "moon" else "7I"
    tr.stats.station = station
    tr.stats.channel = channel
    tr.stats.starttime = t0

    st = Stream(traces=[tr])
    return st, None  # No inventory needed in mock mode
