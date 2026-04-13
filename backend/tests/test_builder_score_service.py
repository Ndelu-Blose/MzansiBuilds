from services.builder_score import compute_builder_score, map_score_band


def test_score_band_mapping():
    assert map_score_band(5) == "New Builder"
    assert map_score_band(25) == "Active Builder"
    assert map_score_band(45) == "Reliable Collaborator"
    assert map_score_band(65) == "Momentum Builder"
    assert map_score_band(90) == "Proven Builder"


def test_compute_builder_score_returns_capped_value():
    score, breakdown, band = compute_builder_score(
        profile_complete=True,
        completed_projects=9,
        active_projects=4,
        completed_milestones=12,
        recent_updates=6,
        accepted_collaborations=3,
        receipts_count=3,
        is_stale=False,
    )
    assert 0 <= score <= 100
    assert isinstance(breakdown, dict)
    assert band in {
        "New Builder",
        "Active Builder",
        "Reliable Collaborator",
        "Momentum Builder",
        "Proven Builder",
    }
