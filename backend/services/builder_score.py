from typing import Dict, Tuple


def map_score_band(score: int) -> str:
    if score >= 80:
        return "Proven Builder"
    if score >= 60:
        return "Momentum Builder"
    if score >= 40:
        return "Reliable Collaborator"
    if score >= 20:
        return "Active Builder"
    return "New Builder"


def compute_builder_score(
    *,
    profile_complete: bool,
    completed_projects: int,
    active_projects: int,
    completed_milestones: int,
    recent_updates: int,
    accepted_collaborations: int,
    receipts_count: int,
    is_stale: bool,
) -> Tuple[int, Dict[str, int], str]:
    breakdown = {
        "profile_complete": 10 if profile_complete else 0,
        "completed_projects": min(30, completed_projects * 15),
        "active_projects": min(10, active_projects * 5),
        "milestones": min(15, completed_milestones * 3),
        "recent_activity": 10 if recent_updates > 0 else 0,
        "collaboration_quality": min(25, accepted_collaborations * 10 + receipts_count * 5),
        "stale_penalty": -10 if is_stale else 0,
    }
    score = max(0, min(100, sum(breakdown.values())))
    return score, breakdown, map_score_band(score)
