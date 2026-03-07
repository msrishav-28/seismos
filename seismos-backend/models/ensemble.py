"""
ML Ensemble: RF + 1D CNN + LSTM Autoencoder
Loads models at startup. Falls back to mock predictions when weights missing.
"""
import numpy as np
from config import MOCK_MODE, MODEL_DIR, MOON_CLASSES, MARS_CLASSES
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# ── Global model state ────────────────────────────────────────────────────────
MODELS_LOADED: dict[str, bool] = {
    "moon_rf": False, "moon_cnn": False,
    "mars_rf": False, "mars_cnn": False,
}
_rf_models:  dict = {}
_cnn_models: dict = {}


def load_all_models() -> None:
    if MOCK_MODE:
        logger.info("[ensemble] Mock mode — skipping model load")
        return
    for body in ("moon", "mars"):
        _load_rf(body)
        _load_cnn(body)


def _load_rf(body: str) -> None:
    import pickle
    path = MODEL_DIR / f"{body}_rf.pkl"
    if path.exists():
        try:
            with open(path, "rb") as f:
                _rf_models[body] = pickle.load(f)
            MODELS_LOADED[f"{body}_rf"] = True
            logger.info(f"[ensemble] Loaded RF model for {body}")
        except Exception as e:
            logger.warning(f"[ensemble] Failed to load RF for {body}: {e}")
    else:
        logger.info(f"[ensemble] No RF weights at {path} — will use mock")


def _load_cnn(body: str) -> None:
    path = MODEL_DIR / f"{body}_cnn.pt"
    if path.exists():
        try:
            import torch
            from models.cnn_1d import SeismicCNN
            classes = MOON_CLASSES if body == "moon" else MARS_CLASSES
            model = SeismicCNN(n_classes=len(classes))
            model.load_state_dict(torch.load(path, map_location="cpu"))
            model.eval()
            _cnn_models[body] = model
            MODELS_LOADED[f"{body}_cnn"] = True
            logger.info(f"[ensemble] Loaded CNN model for {body}")
        except Exception as e:
            logger.warning(f"[ensemble] Failed to load CNN for {body}: {e}")
    else:
        logger.info(f"[ensemble] No CNN weights at {path} — will use mock")


# ── Main classification entry point ──────────────────────────────────────────

def classify_candidates(
    feature_list: list[dict],
    stream,
    body: str,
    tier: str = "ensemble",
) -> list[dict]:
    """
    For each feature dict, predict class probabilities.
    Returns list of classified event dicts.
    """
    classes = MOON_CLASSES if body == "moon" else MARS_CLASSES
    events  = []

    for i, fd in enumerate(feature_list):
        cand  = fd["candidate"]
        feats = fd["features"]
        fvec  = np.array([list(feats.values())], dtype=float)

        if MOCK_MODE or (f"{body}_rf" not in MODELS_LOADED or not MODELS_LOADED[f"{body}_rf"]):
            proba = _mock_predict(feats, body, classes)
        else:
            proba = _ensemble_predict(fvec, body, tier, classes)

        # Filter noise
        top_class_idx  = int(np.argmax(proba))
        top_class      = classes[top_class_idx]
        confidence     = float(proba[top_class_idx])

        if top_class == "noise" or confidence < 0.50:
            continue

        class_proba = {cls: round(float(p), 4) for cls, p in zip(classes, proba)}

        events.append({
            "event_id":       f"e_{i:03d}",
            "detection_time": cand["onset_time"],
            "event_type":     top_class,
            "confidence":     round(confidence, 4),
            "class_probabilities": class_proba,
            "features":       {k: round(float(v), 6) for k, v in feats.items()},
            "candidate":      cand,
        })

    return events


def _ensemble_predict(fvec: np.ndarray, body: str, tier: str, classes: list) -> np.ndarray:
    n = len(classes)
    rf_w, cnn_w = 0.30, 0.50

    rf_proba  = np.ones(n) / n
    cnn_proba = np.ones(n) / n

    rf = _rf_models.get(body)
    if rf and tier in ("ensemble", "rf_only"):
        try:
            rf_proba = rf.predict_proba(fvec)[0]
        except Exception:
            pass

    cnn = _cnn_models.get(body)
    if cnn and tier in ("ensemble", "cnn_only"):
        try:
            import torch
            with torch.no_grad():
                t = torch.tensor(fvec, dtype=torch.float32)
                logits = cnn(t)
                import torch.nn.functional as F
                cnn_proba = F.softmax(logits, dim=-1).numpy()[0]
        except Exception:
            pass

    if tier == "rf_only":
        return rf_proba
    if tier == "cnn_only":
        return cnn_proba
    return rf_w * rf_proba + cnn_w * cnn_proba


def _mock_predict(feats: dict, body: str, classes: list) -> np.ndarray:
    """Realistic synthetic probabilities based on feature heuristics."""
    rng = np.random.default_rng(seed=int(abs(feats.get("kurtosis", 1.0)) * 1000) % (2**31))
    proba = rng.dirichlet(np.ones(len(classes)) * 0.3)

    # Heuristic boosting based on feature values
    dom_freq = feats.get("dominant_frequency", 1.0)
    kurt     = feats.get("kurtosis", 1.0)
    coda_dur = feats.get("coda_duration_seconds", 0.0)
    tc       = feats.get("max_template_cc", 0.0)

    if body == "moon":
        if dom_freq < 1.5 and coda_dur > 300 and tc > 0.6:
            idx = classes.index("deep_moonquake")
            proba[idx] += 0.7
        elif dom_freq > 4.0 and kurt > 8:
            idx = classes.index("thermal_moonquake")
            proba[idx] += 0.5
        elif dom_freq > 2.0 and coda_dur < 300:
            idx = classes.index("shallow_moonquake")
            proba[idx] += 0.4
    else:
        if dom_freq < 1.0:
            idx = classes.index("lf_marsquake")
            proba[idx] += 0.6
        elif dom_freq > 3.0:
            idx = classes.index("hf_marsquake")
            proba[idx] += 0.5

    proba = np.clip(proba, 0.001, None)
    return proba / proba.sum()
