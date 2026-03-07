"""Result persistence — in-memory + optional filesystem"""
import json
from pathlib import Path
from typing import Optional
from config import RESULT_DIR

_results: dict = {}


def save_result(result_id: str, result: dict) -> None:
    _results[result_id] = result
    # Also persist to disk for resilience
    try:
        path = Path(RESULT_DIR) / f"{result_id}.json"
        with open(path, "w") as f:
            json.dump(result, f, indent=2, default=str)
    except Exception:
        pass


def get_result(result_id: str) -> Optional[dict]:
    if result_id in _results:
        return _results[result_id]
    # Try filesystem fallback
    try:
        path = Path(RESULT_DIR) / f"{result_id}.json"
        if path.exists():
            with open(path) as f:
                data = json.load(f)
            _results[result_id] = data
            return data
    except Exception:
        pass
    return None
