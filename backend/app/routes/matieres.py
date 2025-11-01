from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.matiere import Matiere, MatiereEnseignantNiveauParcours
from ..models.user import Admin, Enseignant
from ..models.niveau_parcours import Niveau, Parcours

matieres_bp = Blueprint('matieres', __name__)


@matieres_bp.route("/matieres", methods=["GET"])
@jwt_required()
def get_matieres():
    """
    Récupère toutes les matières.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        matieres = Matiere.query.all()
        return jsonify({
            "matieres": [matiere.to_dict() for matiere in matieres]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@matieres_bp.route("/matieres/actifs", methods=["GET"])
@jwt_required()
def get_matieres_actifs():
    """
    Récupère toutes les matières actives.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        matieres = Matiere.query.filter_by(est_actif=True).all()
        return jsonify({
            "matieres": [matiere.to_dict() for matiere in matieres]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@matieres_bp.route("/matieres", methods=["POST"])
@jwt_required()
def create_matiere():
    """
    Crée une nouvelle matière.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        data = request.get_json()

        # Validation des champs requis
        if not data.get('nom') or not data.get('code'):
            return jsonify({"error": "Le nom et le code sont requis"}), 400

        # Vérifier si le nom ou le code existe déjà
        existing_nom = Matiere.query.filter_by(nom=data['nom']).first()
        if existing_nom:
            return jsonify({"error": "Une matière avec ce nom existe déjà"}), 400

        existing_code = Matiere.query.filter_by(code=data['code']).first()
        if existing_code:
            return jsonify({"error": "Une matière avec ce code existe déjà"}), 400

        # Créer la matière
        matiere = Matiere(
            nom=data['nom'],
            code=data['code'],
            description=data.get('description', ''),
            credits=data.get('credits', 3),
            est_actif=data.get('est_actif', True)
        )

        db.session.add(matiere)
        db.session.commit()

        return jsonify({
            "message": "Matière créée avec succès",
            "matiere": matiere.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@matieres_bp.route("/matieres/<int:matiere_id>", methods=["PUT"])
@jwt_required()
def update_matiere(matiere_id):
    """
    Met à jour une matière.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        matiere = Matiere.query.get_or_404(matiere_id)
        data = request.get_json()

        # Mettre à jour les champs
        if 'nom' in data:
            # Vérifier si le nouveau nom existe déjà
            existing_nom = Matiere.query.filter_by(nom=data['nom']).first()
            if existing_nom and existing_nom.id != matiere_id:
                return jsonify({"error": "Une matière avec ce nom existe déjà"}), 400
            matiere.nom = data['nom']

        if 'code' in data:
            # Vérifier si le nouveau code existe déjà
            existing_code = Matiere.query.filter_by(code=data['code']).first()
            if existing_code and existing_code.id != matiere_id:
                return jsonify({"error": "Une matière avec ce code existe déjà"}), 400
            matiere.code = data['code']

        if 'description' in data:
            matiere.description = data['description']

        if 'credits' in data:
            matiere.credits = data['credits']


        if 'est_actif' in data:
            matiere.est_actif = data['est_actif']

        db.session.commit()

        return jsonify({
            "message": "Matière mise à jour avec succès",
            "matiere": matiere.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@matieres_bp.route("/matieres/<int:matiere_id>", methods=["DELETE"])
@jwt_required()
def delete_matiere(matiere_id):
    """
    Supprime une matière.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        matiere = Matiere.query.get_or_404(matiere_id)

        # Vérifier s'il y a des enseignants associés
        if matiere.assignations:
            return jsonify({
                "error": "Impossible de supprimer cette matière car elle est associée à des enseignants"
            }), 400

        db.session.delete(matiere)
        db.session.commit()

        return jsonify({"message": "Matière supprimée avec succès"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@matieres_bp.route("/matieres/<int:matiere_id>/status", methods=["PATCH"])
@jwt_required()
def toggle_matiere_status(matiere_id):
    """
    Active ou désactive une matière.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        matiere = Matiere.query.get_or_404(matiere_id)
        data = request.get_json()

        if 'est_actif' not in data:
            return jsonify({"error": "Le champ 'est_actif' est requis"}), 400

        matiere.est_actif = data['est_actif']
        db.session.commit()

        status_text = "activée" if matiere.est_actif else "désactivée"
        return jsonify({
            "message": f"Matière {status_text} avec succès",
            "matiere": matiere.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@matieres_bp.route("/matieres/<int:matiere_id>/enseignants", methods=["GET"])
@jwt_required()
def get_matiere_enseignants(matiere_id):
    """
    Récupère les enseignants associés à une matière.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        matiere = Matiere.query.get_or_404(matiere_id)
        return jsonify({
            "assignations": [assignation.to_dict() for assignation in matiere.assignations]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@matieres_bp.route("/assignations", methods=["POST"])
@matieres_bp.route("/assignations/<int:assignation_id>", methods=["DELETE"])
@jwt_required()
def delete_assignation(assignation_id):
    """
    Supprime une assignation.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        assignation = MatiereEnseignantNiveauParcours.query.get_or_404(assignation_id)
        db.session.delete(assignation)
        db.session.commit()

        return jsonify({
            "message": "Assignation supprimée avec succès"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@matieres_bp.route("/enseignants/<int:enseignant_id>/assignations", methods=["GET"])
@jwt_required()
def get_enseignant_assignations(enseignant_id):
    """
    Récupère toutes les assignations d'un enseignant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        enseignant = Enseignant.query.get_or_404(enseignant_id)
        return jsonify({
            "assignations": [assignation.to_dict() for assignation in enseignant.assignations]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@matieres_bp.route("/matieres/enseignant", methods=["GET"])
@jwt_required()
def get_matieres_enseignant():
    """
    Récupère les matières assignées à l'enseignant connecté.
    """
    try:
        # Récupérer l'utilisateur connecté
        user_id = get_jwt_identity()
        enseignant = Enseignant.query.filter_by(utilisateur_id=user_id).first()
        
        if not enseignant:
            return jsonify({"error": "Enseignant non trouvé"}), 404
        
        # Récupérer les matières assignées à cet enseignant
        assignations = MatiereEnseignantNiveauParcours.query.filter_by(
            enseignant_id=enseignant.id
        ).all()
        
        # Extraire les matières uniques
        matieres_ids = list(set([assignation.matiere_id for assignation in assignations]))
        matieres = Matiere.query.filter(Matiere.id.in_(matieres_ids)).all()
        
        return jsonify([matiere.to_dict() for matiere in matieres]), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@matieres_bp.route("/admin/assignations", methods=["POST"])
@jwt_required()
def create_assignation():
    """
    Crée une nouvelle assignation matière-enseignant-niveau-parcours.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        from ..models.user import Admin
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        data = request.get_json()
        enseignant_id = data.get("enseignant_id")
        matiere_id = data.get("matiere_id")
        niveau_id = data.get("niveau_id")
        parcours_id = data.get("parcours_id")
        
        if not all([enseignant_id, matiere_id, niveau_id, parcours_id]):
            return jsonify({"error": "Tous les champs sont requis"}), 400
        
        # Vérifier que l'assignation n'existe pas déjà
        existing = MatiereEnseignantNiveauParcours.query.filter_by(
            enseignant_id=enseignant_id,
            matiere_id=matiere_id,
            niveau_id=niveau_id,
            parcours_id=parcours_id
        ).first()
        
        if existing:
            return jsonify({"error": "Cette assignation existe déjà"}), 400
        
        # Créer la nouvelle assignation
        assignation = MatiereEnseignantNiveauParcours(
            enseignant_id=enseignant_id,
            matiere_id=matiere_id,
            niveau_id=niveau_id,
            parcours_id=parcours_id,
            est_actif=True
        )
        
        db.session.add(assignation)
        db.session.commit()
        
        return jsonify({
            "message": "Assignation créée avec succès",
            "assignation": assignation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

