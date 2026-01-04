"""merge heads

Revision ID: 9ad8cd9dc578
Revises: 4c7f1e2f0f8a, a3f9b1d7c4ea, e2b3c4d5e6f7
Create Date: 2025-12-08 19:38:51.791577

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "9ad8cd9dc578"
down_revision: str | Sequence[str] | None = (
    "4c7f1e2f0f8a",
    "a3f9b1d7c4ea",
    "e2b3c4d5e6f7",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
