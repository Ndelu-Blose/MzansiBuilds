import pytest
from pydantic import ValidationError

from schemas import UserCreate, UserLogin


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
