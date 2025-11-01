"""add_matiere_id_to_qcm

Revision ID: 9f8e2a1b3c4d
Revises: 8d5285599d6e
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f8e2a1b3c4d'
down_revision = '8d5285599d6e'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter la colonne matiere_id à la table qcms
    op.add_column('qcms', sa.Column('matiere_id', sa.Integer(), nullable=True))
    
    # Créer la clé étrangère vers la table matieres
    op.create_foreign_key('fk_qcms_matiere_id', 'qcms', 'matieres', ['matiere_id'], ['id'])
    
    # Créer un index pour améliorer les performances
    op.create_index('ix_qcms_matiere_id', 'qcms', ['matiere_id'])


def downgrade():
    # Supprimer l'index
    op.drop_index('ix_qcms_matiere_id', table_name='qcms')
    
    # Supprimer la clé étrangère
    op.drop_constraint('fk_qcms_matiere_id', 'qcms', type_='foreignkey')
    
    # Supprimer la colonne
    op.drop_column('qcms', 'matiere_id')


























