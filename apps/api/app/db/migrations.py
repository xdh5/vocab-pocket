import sys
from pathlib import Path

from alembic.config import Config

from alembic import command
from app.core.config import Settings


def _alembic_config_path() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "alembic.ini"  # type: ignore[attr-defined]
    return Path(__file__).resolve().parents[2] / "alembic.ini"


def upgrade_database(settings: Settings) -> None:
    configuration = Config(str(_alembic_config_path()))
    configuration.set_main_option("sqlalchemy.url", settings.resolved_database_url)
    command.upgrade(configuration, "head")
