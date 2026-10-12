from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.core.errors import (
    BadRequestError,
    NotFoundError,
    register_exception_handlers,
)

dummy_app = FastAPI()
register_exception_handlers(dummy_app)


class SamplePayload(BaseModel):
    query: str
    limit: int


@dummy_app.get("/test-not-found")
def route_not_found():
    raise NotFoundError("Paper not found", code="PAPER_NOT_FOUND")


@dummy_app.get("/test-bad-request")
def route_bad_request():
    raise BadRequestError(
        "Invalid filter parameters",
        code="INVALID_FILTER",
        details={"filter": "invalid"},
    )


@dummy_app.get("/test-unhandled")
def route_unhandled():
    raise RuntimeError("Unexpected failure")


@dummy_app.post("/test-validation")
def route_validation(payload: SamplePayload):
    return payload


client = TestClient(dummy_app)


def test_not_found_exception_handling():
    response = client.get("/test-not-found")
    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "error": {
            "code": "PAPER_NOT_FOUND",
            "message": "Paper not found",
        },
    }


def test_bad_request_exception_handling():
    response = client.get("/test-bad-request")
    assert response.status_code == 400
    assert response.json() == {
        "success": False,
        "error": {
            "code": "INVALID_FILTER",
            "message": "Invalid filter parameters",
            "details": {"filter": "invalid"},
        },
    }


def test_validation_error_handling():
    response = client.post(
        "/test-validation",
        json={"query": "ml", "limit": "not_an_int"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert len(data["error"]["details"]) > 0


def test_unhandled_exception_handling():
    # TestClient raises server errors by default; disable to test 500 handler
    client_no_raise = TestClient(dummy_app, raise_server_exceptions=False)
    response = client_no_raise.get("/test-unhandled")
    assert response.status_code == 500
    assert response.json() == {
        "success": False,
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred while processing the request",
        },
    }
