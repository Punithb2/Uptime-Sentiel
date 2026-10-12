import pytest
from app.core.url_validator import validate_safe_url

def test_safe_public_urls():
    # Legitimate public web targets should pass
    assert validate_safe_url("https://google.com") == "https://google.com"
    assert validate_safe_url("https://api.github.com/status") == "https://api.github.com/status"
    assert validate_safe_url("http://example.com") == "http://example.com"

def test_blocks_loopback_and_local():
    with pytest.raises(ValueError, match="Internal host|cannot be targeted|restricted"):
        validate_safe_url("http://localhost:8000")

    with pytest.raises(ValueError, match="internal/private IP|cannot be targeted|restricted"):
        validate_safe_url("http://127.0.0.1:8000")

    with pytest.raises(ValueError, match="Internal host|cannot be targeted|restricted"):
        validate_safe_url("http://0.0.0.0")

def test_blocks_private_rfc1918_subnets():
    with pytest.raises(ValueError, match="internal/private IP"):
        validate_safe_url("http://192.168.1.1/admin")

    with pytest.raises(ValueError, match="internal/private IP"):
        validate_safe_url("http://10.0.0.5/api")

    with pytest.raises(ValueError, match="internal/private IP"):
        validate_safe_url("http://172.16.0.10:5000")

def test_blocks_cloud_metadata_ip():
    with pytest.raises(ValueError, match="internal/private IP|cloud metadata|restricted"):
        validate_safe_url("http://169.254.169.254/latest/meta-data/")

def test_webhook_https_only():
    # Webhooks must use HTTPS
    with pytest.raises(ValueError, match="scheme must be HTTPS"):
        validate_safe_url("http://discord.com/api/webhooks/123", allow_http=False)

    assert validate_safe_url("https://discord.com/api/webhooks/123", allow_http=False)
