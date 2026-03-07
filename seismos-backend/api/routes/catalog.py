"""Catalog routes — reference events from Apollo/MQS"""
from fastapi import APIRouter, Query, HTTPException
from config import MOCK_MODE
from datetime import datetime, timezone
import random

router = APIRouter()


@router.get("/{body}")
async def get_catalog(
    body: str,
    start_time: str = Query(None),
    end_time: str = Query(None),
    types: str = Query(None),
    page: int = Query(1),
    per_page: int = Query(50),
):
    if body not in ("moon", "mars"):
        raise HTTPException(400, "body must be 'moon' or 'mars'")

    if MOCK_MODE:
        return _mock_catalog(body, start_time, end_time, types, page, per_page)

    # Real mode — parse Apollo CSV / MQS QuakeML
    # TODO: implement catalog_service.load() when files are available
    return _mock_catalog(body, start_time, end_time, types, page, per_page)


def _mock_catalog(body, start_time, end_time, types, page, per_page):
    moon_types = ["deep_moonquake", "shallow_moonquake", "thermal_moonquake", "meteorite_impact"]
    mars_types  = ["lf_marsquake", "hf_marsquake", "vf_marsquake"]
    event_types = moon_types if body == "moon" else mars_types

    if types:
        filtered_types = [t.strip() for t in types.split(",")]
        event_types = [t for t in event_types if t in filtered_types]

    rng = random.Random(42)
    try:
        t0 = datetime.fromisoformat((start_time or "1970-03-01T00:00:00Z").replace("Z", "+00:00"))
        t1 = datetime.fromisoformat((end_time or "1970-03-01T06:00:00Z").replace("Z", "+00:00"))
    except Exception:
        t0 = datetime(1970, 3, 1, tzinfo=timezone.utc)
        t1 = datetime(1970, 3, 1, 6, tzinfo=timezone.utc)

    span = (t1 - t0).total_seconds()
    events = []
    for i in range(15):
        offset = rng.uniform(0, span)
        etype  = rng.choice(event_types)
        from datetime import timedelta
        evt_time = t0 + timedelta(seconds=offset)
        events.append({
            "catalog_event_id": f"{body}.{etype[:3]}.{i:04d}",
            "time":             evt_time.isoformat(),
            "event_type":       etype,
            "cluster_id":       f"A{rng.randint(1,28):02d}" if body == "moon" and "deep" in etype else None,
            "magnitude":        None,
            "station":          "S12" if body == "moon" else "ELYS",
            "source":           "Apollo PSE Expanded Catalog" if body == "moon" else "InSight MQS Catalog",
        })

    start = (page - 1) * per_page
    return {
        "body": body, "total": len(events),
        "page": page, "per_page": per_page,
        "events": events[start:start + per_page],
    }
