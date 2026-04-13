from services.matching import match_skills_to_roles


def test_match_skills_to_roles_basic_overlap():
    score, matched = match_skills_to_roles(
        ["React", "UI Design", "Python"],
        ["React developer", "Backend APIs"],
    )
    assert score > 0
    assert "react" in matched


def test_match_skills_to_roles_no_overlap():
    score, matched = match_skills_to_roles(
        ["Go", "Rust"],
        ["React developer", "UI/UX Designer"],
    )
    assert score == 0
    assert matched == []
