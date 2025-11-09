"""remove_unique_constraint_matriculeId_for_historical_promotions

Revision ID: 0ebeb215ae95
Revises: 814756e21de2
Create Date: 2025-10-06 21:56:59.862047

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0ebeb215ae95'
down_revision = '814756e21de2'
branch_labels = None
depends_on = None


def upgrade():
    # Supprimer la contrainte d'unicité sur matriculeId pour permettre l'historique
    # Utiliser CASCADE pour supprimer les dépendances
    op.execute('ALTER TABLE etudiant DROP CONSTRAINT IF EXISTS etudiant_matriculeId_key CASCADE')


def downgrade():
    # Remettre la contrainte d'unicité sur matriculeId
    # Note: Cela peut échouer s'il y a des doublons
    op.create_unique_constraint('etudiant_matriculeId_key', 'etudiant', ['matriculeId'])
