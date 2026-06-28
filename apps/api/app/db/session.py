from collections.abc import Generator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


def build_engine(settings: Settings) -> Engine:
    connect_args = {"check_same_thread": False} if settings.resolved_database_url.startswith("sqlite") else {}
    return create_engine(settings.resolved_database_url, connect_args=connect_args)


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session(request: Request) -> Generator[Session]:
    session_factory = request.app.state.session_factory
    with session_factory() as session:
        yield session
