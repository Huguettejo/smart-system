"""rename_texte_to_question_column

Revision ID: b423c7e11ee4
Revises: 24a3a043e50e
Create Date: 2025-09-24 12:35:05.254453

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b423c7e11ee4'
down_revision = '24a3a043e50e'
branch_labels = None
depends_on = None


def upgrade():
    # Renommer la colonne 'texte' en 'question' dans la table questions
    op.alter_column('questions', 'texte', new_column_name='question')


def downgrade():
    # Renommer la colonne 'question' en 'texte' (retour en arrière)
    op.alter_column('questions', 'question', new_column_name='texte')
