from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.db.migrations import upgrade_database
from app.db.session import build_engine, build_session_factory


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    media_dir = app_settings.data_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        app_settings.data_dir.mkdir(parents=True, exist_ok=True)
        upgrade_database(app_settings)
        engine = build_engine(app_settings)
        application.state.engine = engine
        application.state.session_factory = build_session_factory(engine)
        yield
        engine.dispose()

    application = FastAPI(
        title=app_settings.app_name,
        version=app_settings.app_version,
        lifespan=lifespan,
    )
    application.state.settings = app_settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        allow_origin_regex=app_settings.cors_origin_regex,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api_router)
    application.mount("/media", StaticFiles(directory=media_dir), name="media")
    return application


app = create_app()
