"""add_targeting_fields_to_qcm

Revision ID: 8d5285599d6e
Revises: b423c7e11ee4
Create Date: 2025-09-24 20:45:07.230852

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8d5285599d6e'
down_revision = 'b423c7e11ee4'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter les champs de ciblage au QCM
    op.add_column('qcms', sa.Column('niveau_id', sa.Integer(), nullable=True))
    op.add_column('qcms', sa.Column('parcours_id', sa.Integer(), nullable=True))
    op.add_column('qcms', sa.Column('est_cible', sa.Boolean(), nullable=False, server_default='false'))
    
    # Ajouter les clés étrangères
    op.create_foreign_key('fk_qcm_niveau', 'qcms', 'niveaux', ['niveau_id'], ['id'])
    op.create_foreign_key('fk_qcm_parcours', 'qcms', 'parcours', ['parcours_id'], ['id'])
    
    # Ajouter des index pour les performances
    op.create_index('ix_qcms_niveau_id', 'qcms', ['niveau_id'])
    op.create_index('ix_qcms_parcours_id', 'qcms', ['parcours_id'])
    op.create_index('ix_qcms_est_cible', 'qcms', ['est_cible'])


def downgrade():
    # Supprimer les index
    op.drop_index('ix_qcms_est_cible', table_name='qcms')
    op.drop_index('ix_qcms_parcours_id', table_name='qcms')
    op.drop_index('ix_qcms_niveau_id', table_name='qcms')
    
    # Supprimer les clés étrangères
    op.drop_constraint('fk_qcm_parcours', 'qcms', type_='foreignkey')
    op.drop_constraint('fk_qcm_niveau', 'qcms', type_='foreignkey')
    
    # Supprimer les colonnes
    op.drop_column('qcms', 'est_cible')
    op.drop_column('qcms', 'parcours_id')
    op.drop_column('qcms', 'niveau_id')
