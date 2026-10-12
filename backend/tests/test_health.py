import json
import os
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app, HEARTBEAT_PATH

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Sentinel API is running" in data["message"]

def test_health_check_active_and_degraded_worker():
    # 1. When worker heartbeat exists and is fresh (<90s)
    heartbeat_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "pid": 12345
    }
    with open(HEARTBEAT_PATH, "w", encoding="utf-8") as f:
        json.dump(heartbeat_payload, f)

    try:
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["worker"] == "active"
        assert "timestamp" in data
    finally:
        if os.path.exists(HEARTBEAT_PATH):
            os.remove(HEARTBEAT_PATH)

    # 2. When worker heartbeat does not exist
    res_degraded = client.get("/health")
    assert res_degraded.status_code == 200
    data_degraded = res_degraded.json()
    assert data_degraded["status"] == "degraded"
    assert data_degraded["worker"] == "offline"
