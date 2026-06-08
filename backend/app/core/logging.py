import logging
import time
from contextvars import ContextVar
from uuid import uuid4

from fastapi import FastAPI, Request
from starlette.responses import Response

from app.core.config import settings

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def configure_logging() -> None:
    request_id_filter = RequestIdFilter()
    log_level = getattr(logging, settings.LOG_LEVEL)
    logging.basicConfig(
        level=log_level,
        format=(
            "%(asctime)s %(levelname)s [%(request_id)s] "
            "%(name)s: %(message)s"
        ),
    )
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addFilter(request_id_filter)
    for handler in root_logger.handlers:
        handler.setLevel(log_level)
        handler.addFilter(request_id_filter)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    logging.getLogger(__name__).info("logging configured level=%s", settings.LOG_LEVEL)


def install_request_logging(app: FastAPI) -> None:
    logger = logging.getLogger("app.requests")

    @app.middleware("http")
    async def request_logging_middleware(
        request: Request,
        call_next,
    ) -> Response:
        request_id = request.headers.get("x-request-id") or uuid4().hex[:12]
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        if request.url.path not in {"/health", "/health/db"}:
            logger.debug(
                "request started method=%s path=%s client=%s",
                request.method,
                request.url.path,
                request.client.host if request.client else "-",
            )
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "request failed method=%s path=%s",
                request.method,
                request.url.path,
            )
            request_id_var.reset(token)
            raise
        finally:
            duration_ms = int((time.perf_counter() - started) * 1000)

        response.headers["x-request-id"] = request_id
        if request.url.path not in {"/health", "/health/db"}:
            level = logging.WARNING if response.status_code >= 400 else logging.INFO
            logger.log(
                level,
                "request completed method=%s path=%s status=%s duration_ms=%s",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
        request_id_var.reset(token)
        return response
