"""reset the single production account"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260828_0003"
down_revision: str | None = "20260828_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None
PASSWORD_HASH = "pbkdf2_sha256$600000$ueAWjX7RgFdIJcL7ttVIWw==$5BgIwFbtTxHJxe3Auf3ea3SYwpVFxeZ4bspI_8f3Le0="


def upgrade() -> None:
    op.execute(sa.text("DELETE FROM users"))
    op.execute(
        sa.text(
            "INSERT INTO users (username, password_hash, nickname, avatar_url) "
            "VALUES ('wangcai', :password_hash, '五岛悠诚', '/wangcai-avatar.png')"
        ),
        {"password_hash": PASSWORD_HASH},
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM users WHERE username = 'wangcai'"))
