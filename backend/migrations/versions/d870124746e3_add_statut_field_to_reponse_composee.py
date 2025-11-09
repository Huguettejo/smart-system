"""add_statut_field_to_reponse_composee

Revision ID: d870124746e3
Revises: 7f7d73a4e5b7
Create Date: 2025-10-06 23:19:23.860357

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd870124746e3'
down_revision = '7f7d73a4e5b7'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter le champ statut à la table reponses_composees
    op.add_column('reponses_composees', sa.Column('statut', sa.String(20), nullable=True, default='soumis'))
    
    # Mettre à jour les enregistrements existants
    op.execute("UPDATE reponses_composees SET statut = 'corrigé' WHERE est_correcte IS NOT NULL")


def downgrade():
    # Supprimer le champ statut
    op.drop_column('reponses_composees', 'statut')

def downgrade():
    # Supprimer le champ statut
    op.drop_column('reponses_composees', 'statut')
