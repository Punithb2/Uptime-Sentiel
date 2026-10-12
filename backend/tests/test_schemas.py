import pytest
from pydantic import ValidationError
from app.schemas.service import ServiceCreate, ServiceUpdate
from app.schemas.user import UserCreate

def test_service_allowed_http_methods():
    for method in ["GET", "HEAD", "POST", "get", "head", "post"]:
        service = ServiceCreate(name="API Monitor", url="https://example.com", method=method)
        assert service.method == method.upper()

def test_service_blocks_destructive_http_methods():
    for destructive in ["DELETE", "PUT", "PATCH", "delete", "put", "patch"]:
        with pytest.raises(ValidationError):
            ServiceCreate(name="API Monitor", url="https://example.com", method=destructive)

def test_service_interval_bounds():
    # Valid interval bounds
    s1 = ServiceCreate(name="Min Interval", url="https://example.com", check_interval_seconds=10)
    assert s1.check_interval_seconds == 10

    s2 = ServiceCreate(name="Max Interval", url="https://example.com", check_interval_seconds=86400)
    assert s2.check_interval_seconds == 86400

    # Below minimum (10s)
    with pytest.raises(ValidationError):
        ServiceCreate(name="Too Fast", url="https://example.com", check_interval_seconds=5)

    # Above maximum (86400s)
    with pytest.raises(ValidationError):
        ServiceCreate(name="Too Slow", url="https://example.com", check_interval_seconds=90000)

def test_user_email_validation():
    # Valid emails
    u1 = UserCreate(email="developer@example.com", password="securepassword123")
    assert u1.email == "developer@example.com"

    u2 = UserCreate(email="  USER+TEST@DOMAIN.CO  ", password="securepassword123")
    assert u2.email == "user+test@domain.co"

    # Invalid emails
    with pytest.raises(ValidationError):
        UserCreate(email="invalid-email-format", password="securepassword123")

    with pytest.raises(ValidationError):
        UserCreate(email="missing@tld", password="securepassword123")

def test_user_password_length_bounds():
    # Below minimum (6 chars)
    with pytest.raises(ValidationError):
        UserCreate(email="test@example.com", password="12345")

    # Above bcrypt max limit (72 chars)
    with pytest.raises(ValidationError):
        UserCreate(email="test@example.com", password="a" * 73)

    # Valid bounds
    u = UserCreate(email="test@example.com", password="a" * 72)
    assert len(u.password) == 72
