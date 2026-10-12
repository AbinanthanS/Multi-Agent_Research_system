from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ready_endpoint_success():
    with patch(
        "app.main.check_database_connection",
        new_callable=AsyncMock,
        return_value=True,
    ):
        response = client.get("/ready")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ready",
            "database": "connected",
        }


def test_health_ready_endpoint_alias():
    with patch(
        "app.main.check_database_connection",
        new_callable=AsyncMock,
        return_value=True,
    ):
        response = client.get("/health/ready")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ready",
            "database": "connected",
        }


def test_ready_endpoint_database_down():
    with patch(
        "app.main.check_database_connection",
        new_callable=AsyncMock,
        side_effect=Exception("Database unreachable"),
    ):
        response = client.get("/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "DATABASE_UNAVAILABLE"
