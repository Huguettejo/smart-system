"""add_index_on_qcm_id_for_performance

Revision ID: 24a3a043e50e
Revises: 5e4a13547b73
Create Date: 2025-09-24 12:31:16.418537

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '24a3a043e50e'
down_revision = '5e4a13547b73'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter un index sur qcm_id pour améliorer les performances des requêtes
    op.create_index('ix_questions_qcm_id', 'questions', ['qcm_id'])


def downgrade():
    # Supprimer l'index
    op.drop_index('ix_questions_qcm_id', table_name='questions')
