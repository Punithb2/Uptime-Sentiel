from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone
from app.main import app
from app.models.models import User, Service, Incident
from app.core.security import get_current_user
from app.core.database import get_db

client = TestClient(app)

def test_user_cannot_access_or_modify_another_users_monitor():
    """Validates multi-tenant boundary: User B receives 404 when attempting to access User A's service."""
    user_b = User(id=2, email="user_b@example.com")
    
    # Service 10 is owned by User 1
    mock_service_owned_by_a = Service(id=10, owner_id=1, name="User A Service", url="https://example.com")
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result
    mock_db.get.return_value = mock_service_owned_by_a

    app.dependency_overrides[get_current_user] = lambda: user_b
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        # User B cannot delete User A's service
        del_resp = client.delete("/services/10")
        assert del_resp.status_code == 404
        assert "not found or unauthorized" in del_resp.json()["detail"].lower()

        # User B cannot trigger check on User A's service
        check_resp = client.post("/services/10/check-now")
        assert check_resp.status_code == 404
        assert "not found" in check_resp.json()["detail"].lower()

        # User B cannot pause User A's service
        pause_resp = client.post("/services/10/pause")
        assert pause_resp.status_code == 404
        assert "not found" in pause_resp.json()["detail"].lower()

    finally:
        app.dependency_overrides.clear()

def test_monitor_quota_enforced_at_15():
    """Validates abuse protection: Free tier accounts cannot exceed 15 monitors."""
    user = User(id=1, email="quota_test@example.com")
    mock_db = AsyncMock()
    
    mock_result = MagicMock()
    mock_result.scalar.return_value = 15
    mock_db.execute.return_value = mock_result

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        resp = client.post("/services/", json={
            "name": "Excess Monitor",
            "url": "https://example.com",
            "check_interval_seconds": 60
        })
        assert resp.status_code == 400
        assert "quota" in resp.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()

def test_public_status_page_sanitizes_incident_causes():
    """Validates data leakage prevention: Public status page hides internal error causes and traces."""
    user = User(id=1, public_slug="safe-slug-99", is_public_page_enabled=True)
    svc = Service(id=1, owner_id=1, name="Public API", is_active=True, is_public=True, status="DOWN")
    
    sensitive_incident = Incident(
        id=77,
        service_id=1,
        is_open=True,
        cause="INTERNAL_DB_CONNECTION_LEAK: password=root at 192.168.1.5",
        started_at=datetime.now(timezone.utc)
    )

    mock_db = AsyncMock()
    
    res_user = MagicMock()
    res_user.scalars.return_value.first.return_value = user

    res_services = MagicMock()
    res_services.scalars.return_value.all.return_value = [svc]

    res_stats = MagicMock()
    res_stats.all.return_value = []

    res_inc = MagicMock()
    res_inc.scalars.return_value.all.return_value = [sensitive_incident]

    mock_db.execute.side_effect = [res_user, res_services, res_stats, res_inc]
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        resp = client.get("/services/status/public/safe-slug-99")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["incidents"]) == 1
        # Data leak protection: Cause field must be absent from public incidents
        assert "cause" not in data["incidents"][0]
        assert data["incidents"][0]["status"] == "Service Outage"
    finally:
        app.dependency_overrides.clear()

def test_dashboard_summary_for_new_user_with_zero_monitors():
    """Validates that a newly registered user with 0 monitors receives valid DashboardSummaryResponse without 500 error."""
    user = User(id=5, email="new_user@example.com")
    mock_db = AsyncMock()
    
    res_services = MagicMock()
    res_services.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = res_services

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        resp = client.get("/services/dashboard/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["stats"]["total_monitors"] == 0
        assert data["stats"]["pending_monitors"] == 0
        assert data["services"] == []
    finally:
        app.dependency_overrides.clear()

