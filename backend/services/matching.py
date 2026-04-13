import re
from typing import List, Sequence, Tuple


def _normalize_terms(values: Sequence[str]) -> List[str]:
    normalized: List[str] = []
    for value in values:
        if not value:
            continue
        token = re.sub(r"[^a-z0-9\s]", " ", str(value).lower())
        token = re.sub(r"\s+", " ", token).strip()
        if token:
            normalized.append(token)
    return normalized


def _tokenize(value: str) -> List[str]:
    return [part for part in value.split(" ") if part]


def match_skills_to_roles(skills: Sequence[str], roles_needed: Sequence[str]) -> Tuple[int, List[str]]:
    normalized_skills = _normalize_terms(skills)
    normalized_roles = _normalize_terms(roles_needed)
    if not normalized_skills or not normalized_roles:
        return 0, []

    matched: List[str] = []
    score = 0

    for skill in normalized_skills:
        skill_tokens = set(_tokenize(skill))
        for role in normalized_roles:
            role_tokens = set(_tokenize(role))
            if not skill_tokens or not role_tokens:
                continue
            intersects = skill_tokens.intersection(role_tokens)
            if intersects or skill in role or role in skill:
                matched.append(skill)
                score += max(1, len(intersects))
                break

    deduped = list(dict.fromkeys(matched))
    return score, deduped
