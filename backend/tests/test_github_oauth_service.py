from urllib.parse import parse_qs, urlparse

import pytest

from github_oauth_service import build_authorization_url, decrypt_token, encrypt_token


def test_encrypt_decrypt_roundtrip_with_secret(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN_SECRET", "x" * 48)
    token = "gho_example_token_value"
    cipher = encrypt_token(token)
    assert cipher != token
    assert decrypt_token(cipher) == token


def test_encrypt_token_requires_strong_secret(monkeypatch):
    monkeypatch.delenv("GITHUB_TOKEN_SECRET", raising=False)
    with pytest.raises(ValueError):
        encrypt_token("abc")

    monkeypatch.setenv("GITHUB_TOKEN_SECRET", "too-short")
    with pytest.raises(ValueError):
        encrypt_token("abc")


def test_decrypt_rejects_invalid_ciphertext(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN_SECRET", "y" * 48)
    with pytest.raises(ValueError):
        decrypt_token("not-a-valid-fernet-token")


def test_build_authorization_url_requires_client_id(monkeypatch):
    monkeypatch.delenv("GITHUB_CLIENT_ID", raising=False)
    monkeypatch.setenv(
        "GITHUB_REDIRECT_URI",
        "https://api.example.com/api/integrations/github/callback",
    )
    with pytest.raises(ValueError, match="GITHUB_CLIENT_ID"):
        build_authorization_url()


def test_build_authorization_url_requires_redirect(monkeypatch):
    monkeypatch.setenv("GITHUB_CLIENT_ID", "gh_client_123")
    monkeypatch.delenv("GITHUB_REDIRECT_URI", raising=False)
    monkeypatch.delenv("GITHUB_OAUTH_CALLBACK_URL", raising=False)
    with pytest.raises(ValueError, match="GITHUB_REDIRECT_URI"):
        build_authorization_url()


def test_build_authorization_url_uses_github_redirect_uri(monkeypatch):
    monkeypatch.setenv("GITHUB_CLIENT_ID", "cid")
    monkeypatch.setenv(
        "GITHUB_REDIRECT_URI",
        "https://rail.example.app/api/integrations/github/callback",
    )
    monkeypatch.delenv("GITHUB_OAUTH_CALLBACK_URL", raising=False)
    data = build_authorization_url()
    parsed = urlparse(data["authorization_url"])
    assert parsed.scheme == "https"
    assert parsed.netloc == "github.com"
    qs = parse_qs(parsed.query)
    assert qs["client_id"] == ["cid"]
    assert qs["redirect_uri"] == [
        "https://rail.example.app/api/integrations/github/callback"
    ]
    assert "repo" in qs["scope"][0]
    assert len(data["state"]) >= 32


def test_build_authorization_url_falls_back_to_oauth_callback_url(monkeypatch):
    monkeypatch.setenv("GITHUB_CLIENT_ID", "cid")
    monkeypatch.delenv("GITHUB_REDIRECT_URI", raising=False)
    monkeypatch.setenv("GITHUB_OAUTH_CALLBACK_URL", "https://fallback.example/api/integrations/github/callback")
    data = build_authorization_url()
    qs = parse_qs(urlparse(data["authorization_url"]).query)
    assert qs["redirect_uri"] == ["https://fallback.example/api/integrations/github/callback"]


def test_build_authorization_url_prefers_redirect_uri_over_callback(monkeypatch):
    monkeypatch.setenv("GITHUB_CLIENT_ID", "cid")
    monkeypatch.setenv("GITHUB_REDIRECT_URI", "https://primary.example/cb")
    monkeypatch.setenv("GITHUB_OAUTH_CALLBACK_URL", "https://secondary.example/cb")
    data = build_authorization_url()
    qs = parse_qs(urlparse(data["authorization_url"]).query)
    assert qs["redirect_uri"] == ["https://primary.example/cb"]
