"""
SEISMOS — Configuration Constants
"""
import os
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
DATA_DIR    = BASE_DIR / "data"
RAW_DIR     = DATA_DIR / "raw"
PROC_DIR    = DATA_DIR / "processed"
CATALOG_DIR = DATA_DIR / "catalogs"
RESULT_DIR  = DATA_DIR / "results"
STATIC_DIR  = str(BASE_DIR / "static")
MODEL_DIR   = BASE_DIR / "models" / "artifacts"

for d in [RAW_DIR / "moon", RAW_DIR / "mars", PROC_DIR, CATALOG_DIR, RESULT_DIR, MODEL_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ── IRIS FDSN ─────────────────────────────────────────────────────────────────
IRIS_BASE_URL = "https://service.iris.edu"
FDSN_CLIENT   = "IRIS"

STATION_META = {
    "moon": [
        {"id": "S12", "name": "Apollo 12", "lat": -3.04, "lon": -23.42,
         "active_from": "1969-11-19", "active_to": "1977-09-30",
         "channels": ["MHZ", "MH1", "MH2", "SHZ"], "network": "XA"},
        {"id": "S14", "name": "Apollo 14", "lat": -3.64, "lon": -17.48,
         "active_from": "1971-02-05", "active_to": "1977-09-30",
         "channels": ["MHZ", "MH1", "MH2", "SHZ"], "network": "XA"},
        {"id": "S15", "name": "Apollo 15", "lat": 26.13, "lon":  3.63,
         "active_from": "1971-07-31", "active_to": "1977-09-30",
         "channels": ["MHZ", "MH1", "MH2", "SHZ"], "network": "XA"},
        {"id": "S16", "name": "Apollo 16", "lat": -8.97, "lon": 15.50,
         "active_from": "1972-04-21", "active_to": "1977-09-30",
         "channels": ["MHZ", "MH1", "MH2", "SHZ"], "network": "XA"},
    ],
    "mars": [
        {"id": "ELYS", "name": "InSight SEIS", "lat": 4.50, "lon": 135.62,
         "active_from": "2018-12-19", "active_to": "2022-12-21",
         "channels": ["BHV", "BHU", "BHW", "SHZ"], "network": "7I"},
    ],
}

# ── STA/LTA Presets (body → event_type → params) ─────────────────────────────
STALTA_PARAMS = {
    "moon": {
        "deep":    {"sta": 30.0,  "lta": 600.0, "on": 3.0, "off": 0.5},
        "shallow": {"sta":  5.0,  "lta": 120.0, "on": 3.5, "off": 0.8},
        "thermal": {"sta":  1.0,  "lta":  30.0, "on": 4.0, "off": 1.0},
    },
    "mars": {
        "lf":      {"sta":  5.0,  "lta": 120.0, "on": 3.0, "off": 0.5},
        "hf":      {"sta":  2.0,  "lta":  60.0, "on": 3.5, "off": 0.8},
    },
}

SENSITIVITY_MULTIPLIERS = {"low": 1.3, "medium": 1.0, "high": 0.75}

# ── Filter Banks ─────────────────────────────────────────────────────────────
FILTER_BANDS = {
    "moon": {
        "deep":    (0.5,  2.0),
        "shallow": (2.0,  8.0),
        "thermal": (5.0, 12.0),
    },
    "mars": {
        "lf": (0.1, 1.0),
        "hf": (1.0, 9.0),
    },
}

# ── Moon event classes ────────────────────────────────────────────────────────
MOON_CLASSES = ["noise", "deep_moonquake", "shallow_moonquake",
                "thermal_moonquake", "meteorite_impact"]
MARS_CLASSES = ["noise", "lf_marsquake", "hf_marsquake",
                "vf_marsquake", "glitch"]

# ── Transmission coda windows (seconds) ──────────────────────────────────────
CODA_MAP = {
    "deep_moonquake":    3600,
    "shallow_moonquake":  900,
    "thermal_moonquake":  120,
    "meteorite_impact":   300,
    "lf_marsquake":       600,
    "hf_marsquake":       180,
    "vf_marsquake":       120,
    "glitch":              30,
}
PRE_BUFFER = 120  # 2 min before onset

# ── Dev / Mock mode ───────────────────────────────────────────────────────────
MOCK_MODE = os.getenv("SEISMOS_MOCK", "true").lower() == "true"
