"""create the Vocaboom words table

Revision ID: 20260627_0001
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260627_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    users_table = op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=80, collation="NOCASE"), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("daily_review_target", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("daily_new_target", sa.Integer(), nullable=False, server_default="5"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    op.bulk_insert(
        users_table,
        [
            {
                "username": "wangcai",
                "password_hash": (
                    "pbkdf2_sha256$600000$DKGV2gmkWm972UE8oWW6Ig==$"
                    "u5ItVQNw_gqZu0Gd55bj4V59rb5Xu3Sszh-kZJnmQXE="
                ),
            },
            {
                "username": "admin",
                "password_hash": (
                    "pbkdf2_sha256$600000$cHaOX6ZK7QkCK_Z_4Xh0SA==$"
                    "iV2U0ggn41-ak2bRl1gjaf5fqfw3ONFxWgBzLgAgQmo="
                ),
            },
        ],
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_auth_sessions_token_hash"), "auth_sessions", ["token_hash"], unique=True)
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)
    op.create_table(
        "words",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("term", sa.String(length=120, collation="NOCASE"), nullable=False),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("has_listening_speaking", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("has_reading", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("add_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("pronunciation", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("meanings", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("common_forms", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("collocations", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("example_sentence", sa.Text(), nullable=False, server_default=""),
        sa.Column("example_translation", sa.Text(), nullable=False, server_default=""),
        sa.Column("scenarios", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("is_visualizable", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("image_prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("image_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("image_source", sa.String(length=24), nullable=False, server_default=""),
        sa.Column("image_source_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("image_attribution", sa.Text(), nullable=False, server_default=""),
        sa.Column("image_status", sa.String(length=24), nullable=False, server_default="not_requested"),
        sa.Column("frequency_level", sa.String(length=20), nullable=False, server_default="了解"),
        sa.Column("enrichment_status", sa.String(length=24), nullable=False, server_default="pending"),
        sa.Column("enrichment_error", sa.Text(), nullable=False, server_default=""),
        sa.Column("ai_model", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("enriched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("known_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mastery_level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_mastered", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("mastered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "term", name="uq_words_user_term"),
    )
    op.create_index(op.f("ix_words_term"), "words", ["term"], unique=False)
    op.create_index(op.f("ix_words_user_id"), "words", ["user_id"], unique=False)
    op.create_table(
        "word_forms",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("word_id", sa.Integer(), nullable=False),
        sa.Column("form", sa.String(length=120, collation="NOCASE"), nullable=False),
        sa.Column("form_type", sa.String(length=80), nullable=False, server_default="原形"),
        sa.Column("add_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["word_id"], ["words.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "form", name="uq_word_forms_user_form"),
    )
    op.create_index(op.f("ix_word_forms_form"), "word_forms", ["form"], unique=False)
    op.create_index(op.f("ix_word_forms_user_id"), "word_forms", ["user_id"], unique=False)
    op.create_index(op.f("ix_word_forms_word_id"), "word_forms", ["word_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_word_forms_word_id"), table_name="word_forms")
    op.drop_index(op.f("ix_word_forms_user_id"), table_name="word_forms")
    op.drop_index(op.f("ix_word_forms_form"), table_name="word_forms")
    op.drop_table("word_forms")
    op.drop_index(op.f("ix_words_user_id"), table_name="words")
    op.drop_index(op.f("ix_words_term"), table_name="words")
    op.drop_table("words")
    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_token_hash"), table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")
