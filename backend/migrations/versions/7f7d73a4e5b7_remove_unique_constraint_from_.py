"""remove_unique_constraint_from_matriculeId

Revision ID: 7f7d73a4e5b7
Revises: 0ebeb215ae95
Create Date: 2025-10-06 23:04:55.321051

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7f7d73a4e5b7'
down_revision = '0ebeb215ae95'
branch_labels = None
depends_on = None


def upgrade():
    # Supprimer la contrainte d'unicité sur matriculeId
    op.drop_constraint('etudiant_matriculeId_key', 'etudiant', type_='unique')


def downgrade():
    # Remettre la contrainte d'unicité sur matriculeId
    op.create_unique_constraint('etudiant_matriculeId_key', 'etudiant', ['matriculeId'])
