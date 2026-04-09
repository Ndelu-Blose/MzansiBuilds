import base64
import hashlib
import hmac
import os
import secrets
from urllib.parse import urlencode

import httpx


GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"


def _github_redirect_uri() -> str:
    """Support both legacy and newer env var names."""
    return (
        (os.environ.get("GITHUB_REDIRECT_URI") or "").strip()
        or (os.environ.get("GITHUB_OAUTH_CALLBACK_URL") or "").strip()
    )


def build_authorization_url() -> dict:
    client_id = (os.environ.get("GITHUB_CLIENT_ID") or "").strip()
    redirect_uri = _github_redirect_uri()
    if not client_id or not redirect_uri:
        raise ValueError(
            "GITHUB_CLIENT_ID and one of GITHUB_REDIRECT_URI or GITHUB_OAUTH_CALLBACK_URL are required"
        )

    state = secrets.token_urlsafe(32)
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "repo read:user user:email",
        "state": state,
    }
    return {"authorization_url": f"{GITHUB_OAUTH_URL}?{urlencode(params)}", "state": state}


def hash_state(state: str) -> str:
    state_secret = (os.environ.get("GITHUB_OAUTH_STATE_SECRET") or "dev-state-secret").encode("utf-8")
    return hmac.new(state_secret, state.encode("utf-8"), hashlib.sha256).hexdigest()


def encrypt_token(token: str) -> str:
    secret = (os.environ.get("GITHUB_TOKEN_SECRET") or "dev-token-secret").encode("utf-8")
    raw = token.encode("utf-8")
    key = secret * ((len(raw) // len(secret)) + 1)
    encrypted = bytes([raw[i] ^ key[i] for i in range(len(raw))])
    return base64.urlsafe_b64encode(encrypted).decode("ascii")


def decrypt_token(token_cipher: str) -> str:
    secret = (os.environ.get("GITHUB_TOKEN_SECRET") or "dev-token-secret").encode("utf-8")
    raw = base64.urlsafe_b64decode(token_cipher.encode("ascii"))
    key = secret * ((len(raw) // len(secret)) + 1)
    plain = bytes([raw[i] ^ key[i] for i in range(len(raw))])
    return plain.decode("utf-8")


async def exchange_code_for_token(code: str) -> str:
    client_id = (os.environ.get("GITHUB_CLIENT_ID") or "").strip()
    client_secret = (os.environ.get("GITHUB_CLIENT_SECRET") or "").strip()
    redirect_uri = _github_redirect_uri()

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
    resp.raise_for_status()
    body = resp.json()
    token = body.get("access_token")
    if not token:
        raise ValueError("GitHub token exchange failed")
    return token


async def fetch_authenticated_profile(access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(
            GITHUB_USER_URL,
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
    resp.raise_for_status()
    return resp.json()
