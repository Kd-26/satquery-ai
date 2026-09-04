"""initial_schema_and_postgis

Revision ID: 8158836069a8
Revises: 
Create Date: 2026-09-04 14:26:33.558222

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8158836069a8'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Ensure PostGIS is available before creating tables with Geometry columns
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    # NOTE: Run `alembic revision --autogenerate -m "create_tables"` after this
    # migration is applied to generate the actual SQLModel table schemas.


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP EXTENSION IF EXISTS postgis;")
