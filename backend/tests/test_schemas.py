import pytest
from pydantic import ValidationError

from schemas import UserCreate, UserLogin, ProfileUpdate


def test_user_create_valid():
    u = UserCreate(email="dev@example.com", password="secret12", name="Dev")
    assert u.email == "dev@example.com"
    assert u.name == "Dev"


def test_user_create_password_too_short():
    with pytest.raises(ValidationError):
        UserCreate(email="dev@example.com", password="short")


def test_user_login_valid():
    u = UserLogin(email="a@b.co", password="anypassword")
    assert u.email == "a@b.co"


def test_user_create_invalid_email():
    with pytest.raises(ValidationError):
        UserCreate(email="not-an-email", password="secret12")


def test_profile_update_supports_extended_fields():
    payload = ProfileUpdate(
        display_name="Builder",
        username="builder_01",
        headline="FastAPI and React Builder",
        location="Johannesburg, South Africa",
        bio="Building in public.",
        skills=["FastAPI", "React"],
        github_url="https://github.com/builder",
        linkedin_url="https://linkedin.com/in/builder",
        portfolio_url="https://builder.dev",
        avatar_url="https://example.com/avatar.png",
    )
    assert payload.username == "builder_01"
    assert payload.location == "Johannesburg, South Africa"


def test_profile_update_rejects_short_username():
    with pytest.raises(ValidationError):
        ProfileUpdate(username="ab")
