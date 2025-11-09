from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from ..models.user import Etudiant, Utilisateur, Admin
from ..models.niveau_parcours import Niveau, Parcours
from ..extensions import db, bcrypt

etudiants_bp = Blueprint('etudiants', __name__)

@etudiants_bp.route("/etudiants", methods=["GET"])
@jwt_required()
def get_etudiants():
    """
    Récupère tous les étudiants avec leurs niveaux et parcours.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        etudiants = Etudiant.query.options(
            joinedload(Etudiant.utilisateur),
            joinedload(Etudiant.niveau_obj),
            joinedload(Etudiant.parcours_obj),
            joinedload(Etudiant.mention_obj)
        ).all()
        return jsonify({
            "etudiants": [etudiant.to_dict() for etudiant in etudiants]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@etudiants_bp.route("/etudiants", methods=["POST"])
@jwt_required()
def create_etudiant():
    """
    Crée un nouvel étudiant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        data = request.get_json()
        
        # Validation des données
        required_fields = ['username', 'email', 'password', 'matriculeId']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Champ requis: {field}"}), 400

        # Vérifier si l'email existe déjà
        existing_user = Utilisateur.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({"error": "Un utilisateur avec cet email existe déjà"}), 400

        # Vérifier si le matricule existe déjà
        existing_etudiant = Etudiant.query.filter_by(matriculeId=data['matriculeId']).first()
        if existing_etudiant:
            return jsonify({"error": "Un étudiant avec ce matricule existe déjà"}), 400

        # Vérifier si le niveau existe (si fourni)
        niveau_id = data.get('niveau_id')
        if niveau_id:
            niveau = Niveau.query.get(niveau_id)
            if not niveau:
                return jsonify({"error": "Niveau non trouvé"}), 404

        # Vérifier si le parcours existe (si fourni)
        parcours_id = data.get('parcours_id')
        if parcours_id:
            parcours = Parcours.query.get(parcours_id)
            if not parcours:
                return jsonify({"error": "Parcours non trouvé"}), 404

        # Vérifier si la mention existe (si fournie)
        mention_id = data.get('mention_id')
        if mention_id:
            from ..models.niveau_parcours import Mention
            mention = Mention.query.get(mention_id)
            if not mention:
                return jsonify({"error": "Mention non trouvée"}), 404

        # Créer l'utilisateur
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        utilisateur = Utilisateur(
            username=data['username'],
            email=data['email'],
            password=hashed_password,
            role='etudiant'
        )

        db.session.add(utilisateur)
        db.session.flush()  # Pour obtenir l'ID

        # Créer l'étudiant
        etudiant = Etudiant(
            utilisateur_id=utilisateur.id,
            matriculeId=data['matriculeId'],
            niveau_id=niveau_id,
            parcours_id=parcours_id,
            mention_id=mention_id,
            est_actif=data.get('est_actif', True)
        )

        db.session.add(etudiant)
        db.session.commit()

        return jsonify({
            "message": "Étudiant créé avec succès",
            "etudiant": etudiant.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@etudiants_bp.route("/etudiants/<int:etudiant_id>", methods=["PUT"])
@jwt_required()
def update_etudiant(etudiant_id):
    """
    Met à jour un étudiant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        etudiant = Etudiant.query.options(
            joinedload(Etudiant.utilisateur),
            joinedload(Etudiant.niveau_obj),
            joinedload(Etudiant.parcours_obj),
            joinedload(Etudiant.mention_obj)
        ).get_or_404(etudiant_id)
        data = request.get_json()

        # Mettre à jour les informations utilisateur
        if 'username' in data:
            etudiant.utilisateur.username = data['username']
        if 'email' in data:
            # Vérifier si le nouveau email existe déjà
            existing_user = Utilisateur.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != etudiant.utilisateur_id:
                return jsonify({"error": "Un utilisateur avec cet email existe déjà"}), 400
            etudiant.utilisateur.email = data['email']
        if 'password' in data and data['password']:
            etudiant.utilisateur.password = bcrypt.generate_password_hash(data['password']).decode('utf-8')

        # Mettre à jour les informations étudiant
        if 'matriculeId' in data:
            # Vérifier si le nouveau matricule existe déjà
            existing_etudiant = Etudiant.query.filter_by(matriculeId=data['matriculeId']).first()
            if existing_etudiant and existing_etudiant.id != etudiant_id:
                return jsonify({"error": "Un étudiant avec ce matricule existe déjà"}), 400
            etudiant.matriculeId = data['matriculeId']

        if 'niveau_id' in data:
            niveau_id = data['niveau_id']
            if niveau_id:
                niveau = Niveau.query.get(niveau_id)
                if not niveau:
                    return jsonify({"error": "Niveau non trouvé"}), 404
            etudiant.niveau_id = niveau_id

        if 'parcours_id' in data:
            parcours_id = data['parcours_id']
            if parcours_id:
                parcours = Parcours.query.get(parcours_id)
                if not parcours:
                    return jsonify({"error": "Parcours non trouvé"}), 404
            etudiant.parcours_id = parcours_id

        if 'mention_id' in data:
            mention_id = data['mention_id']
            if mention_id:
                from ..models.niveau_parcours import Mention
                mention = Mention.query.get(mention_id)
                if not mention:
                    return jsonify({"error": "Mention non trouvée"}), 404
            etudiant.mention_id = mention_id

        db.session.commit()

        return jsonify({
            "message": "Étudiant mis à jour avec succès",
            "etudiant": etudiant.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@etudiants_bp.route("/etudiants/<int:etudiant_id>", methods=["DELETE"])
@jwt_required()
def delete_etudiant(etudiant_id):
    """
    Supprime un étudiant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        etudiant = Etudiant.query.get_or_404(etudiant_id)
        utilisateur = etudiant.utilisateur

        # Supprimer l'étudiant et l'utilisateur associé
        db.session.delete(etudiant)
        db.session.delete(utilisateur)
        db.session.commit()

        return jsonify({"message": "Étudiant supprimé avec succès"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@etudiants_bp.route("/etudiants/<int:etudiant_id>/status", methods=["PATCH"])
@jwt_required()
def toggle_etudiant_status(etudiant_id):
    """
    Active ou désactive un étudiant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        etudiant = Etudiant.query.options(
            joinedload(Etudiant.utilisateur),
            joinedload(Etudiant.niveau_obj),
            joinedload(Etudiant.parcours_obj),
            joinedload(Etudiant.mention_obj)
        ).get_or_404(etudiant_id)
        data = request.get_json()

        if 'est_actif' not in data:
            return jsonify({"error": "Le champ 'est_actif' est requis"}), 400

        etudiant.est_actif = data['est_actif']
        db.session.commit()

        status_text = "activé" if etudiant.est_actif else "désactivé"
        return jsonify({
            "message": f"Étudiant {status_text} avec succès",
            "etudiant": etudiant.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
