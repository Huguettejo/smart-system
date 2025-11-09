from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import Etudiant, Enseignant, Admin, Utilisateur
from ..models.niveau_parcours import Niveau, Parcours
from ..models.matiere import Matiere
from ..extensions import db

stats_bp = Blueprint('stats', __name__)


@stats_bp.route("/api/admin/stats", methods=["GET"])
@jwt_required()
def get_stats():
    """Récupérer les statistiques du dashboard admin"""
    try:
        # Vérifier que l'utilisateur est admin
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=current_user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        # Compter les étudiants actifs
        etudiants_actifs = Etudiant.query.filter_by(est_actif=True).count()
        
        # Compter les enseignants actifs
        enseignants_actifs = Enseignant.query.filter_by(est_actif=True).count()
        
        # Compter les matières actives
        matieres_actives = Matiere.query.filter_by(est_actif=True).count()
        
        # Compter les niveaux
        total_niveaux = Niveau.query.filter_by(est_actif=True).count()
        
        # Compter les parcours
        total_parcours = Parcours.query.filter_by(est_actif=True).count()
        
        # Compter les étudiants inactifs (en attente d'approbation)
        etudiants_inactifs = Etudiant.query.filter_by(est_actif=False).count()
        
        # Compter les enseignants inactifs (en attente d'approbation)
        enseignants_inactifs = Enseignant.query.filter_by(est_actif=False).count()
        
        # Total des utilisateurs
        total_etudiants = etudiants_actifs + etudiants_inactifs
        total_enseignants = enseignants_actifs + enseignants_inactifs
        total_utilisateurs = total_etudiants + total_enseignants + 1  # +1 pour l'admin

        stats = {
            "totalUsers": total_utilisateurs,
            "activeUsers": etudiants_actifs,
            "totalTeachers": enseignants_actifs,
            "totalCourses": matieres_actives,
            "totalNiveaux": total_niveaux,
            "totalParcours": total_parcours,
            "pendingApprovals": etudiants_inactifs + enseignants_inactifs,
            "etudiantsActifs": etudiants_actifs,
            "etudiantsInactifs": etudiants_inactifs,
            "enseignantsActifs": enseignants_actifs,
            "enseignantsInactifs": enseignants_inactifs
        }

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({"error": f"Erreur lors de la récupération des statistiques: {str(e)}"}), 500
