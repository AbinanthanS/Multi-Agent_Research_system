import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("sciresearch-ai.errors")


class AppException(Exception):
    """Base application exception for all domain and service errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Any = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class BadRequestError(AppException):
    def __init__(self, message: str, code: str = "BAD_REQUEST", details: Any = None):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class NotFoundError(AppException):
    def __init__(self, message: str, code: str = "NOT_FOUND", details: Any = None):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictError(AppException):
    def __init__(self, message: str, code: str = "CONFLICT", details: Any = None):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class ServiceUnavailableError(AppException):
    def __init__(
        self,
        message: str,
        code: str = "SERVICE_UNAVAILABLE",
        details: Any = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach centralized exception handlers to the FastAPI application."""

    @app.exception_handler(AppException)
    async def handle_app_exception(
        _request: Request, exc: AppException
    ) -> JSONResponse:
        payload = {
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
            },
        }
        if exc.details is not None:
            payload["error"]["details"] = exc.details

        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = []
        for err in exc.errors():
            loc = " -> ".join(str(item) for item in err.get("loc", []))
            errors.append(
                {
                    "field": loc,
                    "message": err.get("msg", "Validation error"),
                    "type": err.get("type", "value_error"),
                }
            )

        status_code = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request parameters",
                    "details": errors,
                },
            },
        )

    @app.exception_handler(Exception)
    async def handle_unhandled_exception(
        _request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled server exception: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": (
                        "An unexpected error occurred while processing the request"
                    ),
                },
            },
        )
