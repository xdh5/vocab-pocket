"""remove the unused default admin account"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260828_0002"
down_revision: str | None = "20260627_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("nickname", sa.String(length=80), nullable=False, server_default=""))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=False, server_default=""))
    op.execute(sa.text("UPDATE users SET nickname = '五岛悠诚', avatar_url = '/avatars/wangcai-avatar.png' WHERE username = 'wangcai'"))
    op.execute(sa.text("DELETE FROM users WHERE username = 'admin'"))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "nickname")
