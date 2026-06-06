import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes.auth import router as auth_router
from app.api.routes.figures import router as figures_router
from app.api.routes.generation_jobs import router as generation_jobs_router
from app.api.routes.health import router as health_router
from app.api.routes.me import router as me_router
from app.api.routes.uploads import router as uploads_router
from app.core.config import settings
from app.core.logging import configure_logging, install_request_logging

configure_logging()
logger = logging.getLogger("app.startup")


def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME, debug=settings.DEBUG)
    install_request_logging(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(me_router)
    app.include_router(figures_router)
    app.include_router(generation_jobs_router)
    app.include_router(uploads_router)

    if settings.STORAGE_BACKEND == "local":
        app.mount(
            "/media",
            StaticFiles(directory=settings.LOCAL_STORAGE_PATH, check_dir=False),
            name="media",
        )

    logger.info(
        "app configured env=%s debug=%s generation_enabled=%s "
        "generation_mode=%s image_model=%s "
        "reset_database_on_start=%s cors_origins_count=%s public_media_base=%s",
        settings.APP_ENV,
        settings.DEBUG,
        settings.GENERATION_ENABLED,
        settings.GENERATION_MODE,
        settings.OPENAI_IMAGE_MODEL,
        settings.RESET_DATABASE_ON_START,
        len(settings.BACKEND_CORS_ORIGINS),
        settings.PUBLIC_MEDIA_BASE_URL,
    )

    return app


app = create_app()
