"""add_habit_entries_table

Revision ID: 4c7f1e2f0f8a
Revises: 0e71654220b6
Create Date: 2025-12-05 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4c7f1e2f0f8a"
down_revision: str | Sequence[str] | None = "0e71654220b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "habit_entries",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("habit_id", sa.String(), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "completed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["habit_id"],
            ["habits.id"],
        ),
    )
    op.create_index(
        "ix_habit_entries_habit_id", "habit_entries", ["habit_id"], unique=False
    )
    op.create_unique_constraint(
        "uq_habit_entries_habit_id_date", "habit_entries", ["habit_id", "date"]
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_habit_entries_habit_id_date", "habit_entries", type_="unique"
    )
    op.drop_index("ix_habit_entries_habit_id", table_name="habit_entries")
    op.drop_table("habit_entries")
