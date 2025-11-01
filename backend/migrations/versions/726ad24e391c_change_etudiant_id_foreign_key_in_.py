"""change_etudiant_id_foreign_key_in_reponse_composee

Revision ID: 726ad24e391c
Revises: d870124746e3
Create Date: 2025-10-06 23:42:38.827552

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '726ad24e391c'
down_revision = 'd870124746e3'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Supprimer la contrainte de clé étrangère existante
    op.drop_constraint('reponses_composees_etudiant_id_fkey', 'reponses_composees', type_='foreignkey')
    
    # 2. Mettre à jour les données existantes : convertir utilisateur_id vers etudiant_id
    op.execute("""
        UPDATE reponses_composees 
        SET etudiant_id = (
            SELECT e.id 
            FROM etudiant e 
            WHERE e.utilisateur_id = reponses_composees.etudiant_id
        )
        WHERE EXISTS (
            SELECT 1 
            FROM etudiant e 
            WHERE e.utilisateur_id = reponses_composees.etudiant_id
        )
    """)
    
    # 3. Créer la nouvelle contrainte de clé étrangère vers etudiant.id
    op.create_foreign_key('reponses_composees_etudiant_id_fkey', 'reponses_composees', 'etudiant', ['etudiant_id'], ['id'])


def downgrade():
    # 1. Supprimer la nouvelle contrainte de clé étrangère
    op.drop_constraint('reponses_composees_etudiant_id_fkey', 'reponses_composees', type_='foreignkey')
    
    # 2. Restaurer les données : convertir etudiant_id vers utilisateur_id
    op.execute("""
        UPDATE reponses_composees 
        SET etudiant_id = (
            SELECT e.utilisateur_id 
            FROM etudiant e 
            WHERE e.id = reponses_composees.etudiant_id
        )
        WHERE EXISTS (
            SELECT 1 
            FROM etudiant e 
            WHERE e.id = reponses_composees.etudiant_id
        )
    """)
    
    # 3. Recréer l'ancienne contrainte de clé étrangère vers utilisateur.id
    op.create_foreign_key('reponses_composees_etudiant_id_fkey', 'reponses_composees', 'utilisateur', ['etudiant_id'], ['id'])