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


def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME, debug=settings.DEBUG)

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

    return app


app = create_app()
