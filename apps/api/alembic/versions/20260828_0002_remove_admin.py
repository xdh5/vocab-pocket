"""remove the unused default admin account"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260828_0002"
down_revision: str | None = "20260627_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(sa.text("DELETE FROM users WHERE username = 'admin'"))


def downgrade() -> None:
    pass
