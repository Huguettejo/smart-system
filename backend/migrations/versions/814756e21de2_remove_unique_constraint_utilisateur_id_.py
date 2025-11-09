"""remove_unique_constraint_utilisateur_id_for_historical_promotions

Revision ID: 814756e21de2
Revises: bacf32229d66
Create Date: 2025-10-06 21:52:22.615183

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '814756e21de2'
down_revision = 'bacf32229d66'
branch_labels = None
depends_on = None


def upgrade():
    # Supprimer la contrainte d'unicité sur utilisateur_id pour permettre l'historique
    # Utiliser CASCADE pour supprimer les dépendances
    op.execute('ALTER TABLE etudiant DROP CONSTRAINT IF EXISTS etudiant_utilisateur_id_key CASCADE')


def downgrade():
    # Remettre la contrainte d'unicité sur utilisateur_id
    # Note: Cela peut échouer s'il y a des doublons
    op.create_unique_constraint('etudiant_utilisateur_id_key', 'etudiant', ['utilisateur_id'])
