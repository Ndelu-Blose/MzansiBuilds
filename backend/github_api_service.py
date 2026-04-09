import base64
from datetime import datetime

import httpx


BASE_URL = "https://api.github.com"


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _to_datetime(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


async def list_user_repos(token: str, page: int = 1, per_page: int = 30) -> list[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{BASE_URL}/user/repos",
            headers=_headers(token),
            params={"sort": "updated", "page": page, "per_page": per_page},
        )
    resp.raise_for_status()
    return resp.json()


async def get_repo(token: str, owner: str, repo: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{BASE_URL}/repos/{owner}/{repo}", headers=_headers(token))
    resp.raise_for_status()
    return resp.json()


async def get_repo_by_id(token: str, repo_id: int) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{BASE_URL}/repositories/{repo_id}", headers=_headers(token))
    resp.raise_for_status()
    return resp.json()


async def get_repo_languages(token: str, owner: str, repo: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{BASE_URL}/repos/{owner}/{repo}/languages", headers=_headers(token))
    resp.raise_for_status()
    return resp.json()


async def get_repo_contributors(token: str, owner: str, repo: str, limit: int = 30) -> list[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{BASE_URL}/repos/{owner}/{repo}/contributors",
            headers=_headers(token),
            params={"per_page": limit},
        )
    resp.raise_for_status()
    return resp.json()


async def get_recent_commits(token: str, owner: str, repo: str, limit: int = 20) -> list[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{BASE_URL}/repos/{owner}/{repo}/commits",
            headers=_headers(token),
            params={"per_page": limit},
        )
    resp.raise_for_status()
    return resp.json()


async def get_readme_preview(token: str, owner: str, repo: str) -> str | None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{BASE_URL}/repos/{owner}/{repo}/readme", headers=_headers(token))
    if resp.status_code >= 400:
        return None
    body = resp.json()
    content = body.get("content")
    if not content:
        return None
    decoded = base64.b64decode(content).decode("utf-8", errors="ignore")
    return decoded[:2000]


async def get_root_contents(token: str, owner: str, repo: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{BASE_URL}/repos/{owner}/{repo}/contents", headers=_headers(token))
    if resp.status_code >= 400:
        return []
    body = resp.json()
    if not isinstance(body, list):
        return []
    return body
