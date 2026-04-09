import pytest

from github_oauth_service import decrypt_token, encrypt_token


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
