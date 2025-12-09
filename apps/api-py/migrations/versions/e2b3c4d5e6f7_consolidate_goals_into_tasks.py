"""consolidate goals into tasks

Revision ID: e2b3c4d5e6f7
Revises: d1fa08afa045
Create Date: 2025-12-08 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e2b3c4d5e6f7'
down_revision = 'd1fa08afa045'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop goals table
    op.drop_table('goals')

    # Add parent_id and tags to tasks
    op.add_column('tasks', sa.Column('parent_id', sa.String(), nullable=True))
    op.create_foreign_key(None, 'tasks', 'tasks', ['parent_id'], ['id'])
    op.add_column('tasks', sa.Column('tags', sa.JSON(), nullable=True))

    # Add tags to habits
    op.add_column('habits', sa.Column('tags', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove tags from habits
    op.drop_column('habits', 'tags')

    # Remove parent_id and tags from tasks
    op.drop_column('tasks', 'tags')
    op.drop_constraint(None, 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'parent_id')

    # Recreate goals table
    op.create_table('goals',
        sa.Column('id', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('user_id', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('title', sa.VARCHAR(length=200), autoincrement=False, nullable=False),
        sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('status', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
        sa.Column('progress', sa.INTEGER(), autoincrement=False, nullable=True),
        sa.Column(
            'milestones',
            postgresql.JSON(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
        sa.Column(
            'linked_task_ids',
            postgresql.JSON(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
        sa.Column(
            'linked_habit_ids',
            postgresql.JSON(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
        sa.Column(
            'ai_suggestions',
            postgresql.JSON(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
        sa.Column(
            'created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True
        ),
        sa.Column(
            'updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True
        ),
        sa.PrimaryKeyConstraint('id', name='goals_pkey')
    )
    op.create_index('ix_goals_user_id', 'goals', ['user_id'], unique=False)
