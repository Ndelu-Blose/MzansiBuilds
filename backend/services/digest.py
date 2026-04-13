from datetime import datetime
from typing import Dict, List, Any


def _parse_dt(value: Any):
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _dedupe_items(items: List[dict], key_candidates: List[str]) -> List[dict]:
    seen = set()
    out = []
    for item in items:
        key = None
        for field in key_candidates:
            if item.get(field):
                key = f"{field}:{item.get(field)}"
                break
        if key is None:
            key = f"fallback:{item.get('title') or item.get('label') or id(item)}"
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def _sort_projects(items: List[dict]) -> List[dict]:
    return sorted(
        items,
        key=lambda item: (
            int(item.get("momentum_score") or 0),
            int(item.get("bookmark_count") or 0),
            _parse_dt(item.get("last_activity_at")) or datetime.min,
        ),
        reverse=True,
    )


def _sort_builders(items: List[dict]) -> List[dict]:
    return sorted(
        items,
        key=lambda item: (
            int(item.get("momentum_score") or 0),
            int(((item.get("user") or {}).get("builder_score") or 0)),
        ),
        reverse=True,
    )


def build_weekly_digest_preview(
    *,
    active_projects: List[dict],
    open_roles: List[dict],
    trending_builders: List[dict],
    milestone_highlights: List[dict],
) -> Dict[str, object]:
    active_projects = _sort_projects(_dedupe_items(active_projects, ["id", "project_id"]))
    open_roles = _sort_projects(_dedupe_items(open_roles, ["id", "project_id"]))
    trending_builders = _sort_builders(_dedupe_items(trending_builders, ["user_id", "id"]))
    milestone_highlights = sorted(
        _dedupe_items(milestone_highlights, ["id", "project_id"]),
        key=lambda item: _parse_dt(item.get("completed_at")) or datetime.min,
        reverse=True,
    )

    # Sparse fallback: keep a meaningful top block even with thin project momentum data.
    if not active_projects and open_roles:
        active_projects = open_roles[:]

    return {
        "active_projects": active_projects[:5],
        "open_roles": open_roles[:5],
        "trending_builders": trending_builders[:5],
        "milestone_highlights": milestone_highlights[:5],
    }
