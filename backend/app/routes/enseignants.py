from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import Enseignant, Utilisateur, Admin, Etudiant
from ..models.matiere import MatiereEnseignantNiveauParcours
from ..models.resultat import Resultat
from ..extensions import db, bcrypt

enseignants_bp = Blueprint('enseignants', __name__)

@enseignants_bp.route("/enseignants", methods=["GET"])
@jwt_required()
def get_enseignants():
    """
    Récupère tous les enseignants.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        enseignants = Enseignant.query.join(Utilisateur).all()
        return jsonify({
            "enseignants": [enseignant.to_dict() for enseignant in enseignants]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@enseignants_bp.route("/enseignants", methods=["POST"])
@jwt_required()
def create_enseignant():
    """
    Crée un nouvel enseignant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        data = request.get_json()
        
        # Validation des données
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Champ requis: {field}"}), 400

        # Vérifier si l'email existe déjà
        existing_user = Utilisateur.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({"error": "Un utilisateur avec cet email existe déjà"}), 400

        # Créer l'utilisateur
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        utilisateur = Utilisateur(
            username=data['username'],
            email=data['email'],
            password=hashed_password,
            role='enseignant'
        )

        db.session.add(utilisateur)
        db.session.flush()  # Pour obtenir l'ID

        # Créer l'enseignant
        enseignant = Enseignant(
            utilisateur_id=utilisateur.id,
            departement=data.get('departement', ''),
            est_actif=data.get('est_actif', True)
        )

        db.session.add(enseignant)
        db.session.commit()

        return jsonify({
            "message": "Enseignant créé avec succès",
            "enseignant": enseignant.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@enseignants_bp.route("/enseignants/<int:enseignant_id>", methods=["PUT"])
@jwt_required()
def update_enseignant(enseignant_id):
    """
    Met à jour un enseignant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        enseignant = Enseignant.query.get_or_404(enseignant_id)
        data = request.get_json()

        # Mettre à jour les informations utilisateur
        if 'username' in data:
            enseignant.utilisateur.username = data['username']
        if 'email' in data:
            # Vérifier si le nouveau email existe déjà
            existing_user = Utilisateur.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != enseignant.utilisateur_id:
                return jsonify({"error": "Un utilisateur avec cet email existe déjà"}), 400
            enseignant.utilisateur.email = data['email']
        if 'password' in data and data['password']:
            enseignant.utilisateur.password = bcrypt.generate_password_hash(data['password']).decode('utf-8')

        # Mettre à jour les informations enseignant
        if 'departement' in data:
            enseignant.departement = data['departement']
        if 'est_actif' in data:
            enseignant.est_actif = data['est_actif']

        db.session.commit()

        return jsonify({
            "message": "Enseignant mis à jour avec succès",
            "enseignant": enseignant.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@enseignants_bp.route("/enseignants/<int:enseignant_id>", methods=["DELETE"])
@jwt_required()
def delete_enseignant(enseignant_id):
    """
    Supprime un enseignant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        enseignant = Enseignant.query.get_or_404(enseignant_id)
        utilisateur = enseignant.utilisateur

        # Supprimer l'enseignant et l'utilisateur associé
        db.session.delete(enseignant)
        db.session.delete(utilisateur)
        db.session.commit()

        return jsonify({"message": "Enseignant supprimé avec succès"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@enseignants_bp.route("/enseignants/<int:enseignant_id>/status", methods=["PATCH"])
@jwt_required()
def toggle_enseignant_status(enseignant_id):
    """
    Active ou désactive un enseignant.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        enseignant = Enseignant.query.get_or_404(enseignant_id)
        data = request.get_json()

        if 'est_actif' not in data:
            return jsonify({"error": "Le champ 'est_actif' est requis"}), 400

        enseignant.est_actif = data['est_actif']
        db.session.commit()

        status_text = "activé" if enseignant.est_actif else "désactivé"
        return jsonify({
            "message": f"Enseignant {status_text} avec succès",
            "enseignant": enseignant.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@enseignants_bp.route("/enseignant/etudiants", methods=["GET"])
@jwt_required()
def get_etudiants_enseignant():
    """
    Récupère les étudiants liés aux matières enseignées par l'enseignant connecté.
    Supporte le filtrage par niveau, parcours et matière.
    """
    try:
        # Vérifier que l'utilisateur est enseignant
        user_id = get_jwt_identity()
        enseignant = Enseignant.query.filter_by(utilisateur_id=user_id).first()
        if not enseignant:
            return jsonify({"error": "Accès non autorisé"}), 403

        # Récupérer les paramètres de filtrage
        niveau_filter = request.args.get('niveau', '')
        parcours_filter = request.args.get('parcours', '')
        matiere_filter = request.args.get('matiere', '')
        annee_universitaire = request.args.get('annee_universitaire', '2024-2025')

        # Récupérer les assignations de l'enseignant
        assignations_query = MatiereEnseignantNiveauParcours.query.filter_by(
            enseignant_id=enseignant.id,
            est_actif=True
        )

        # Filtrer les assignations par matière si spécifié
        if matiere_filter:
            assignations_query = assignations_query.join(
                MatiereEnseignantNiveauParcours.matiere
            ).filter_by(nom=matiere_filter)

        assignations = assignations_query.all()

        if not assignations:
            return jsonify({"etudiants": []}), 200

        # Récupérer les étudiants liés aux niveaux/parcours des assignations
        etudiants_data = []
        
        for assignation in assignations:
            # Construire la requête pour les étudiants
            query = Etudiant.query.filter_by(est_actif=True)
            
            # Filtrer par année universitaire
            query = query.filter_by(annee_universitaire=annee_universitaire)
            
            # Filtrer par niveau si spécifié dans l'assignation
            if assignation.niveau_id:
                query = query.filter_by(niveau_id=assignation.niveau_id)
            
            # Filtrer par parcours si spécifié dans l'assignation
            if assignation.parcours_id:
                query = query.filter_by(parcours_id=assignation.parcours_id)
            
            # Appliquer les filtres supplémentaires
            if niveau_filter:
                query = query.join(Etudiant.niveau_obj).filter_by(code=niveau_filter)
            
            if parcours_filter:
                query = query.join(Etudiant.parcours_obj).filter_by(code=parcours_filter)
            
            etudiants = query.all()
            
            for etudiant in etudiants:
                # Éviter les doublons
                if not any(e['id'] == etudiant.id for e in etudiants_data):
                    etudiant_dict = etudiant.to_dict()
                    # Ajouter des informations sur la matière
                    etudiant_dict['matiere_enseignee'] = {
                        'id': assignation.matiere.id,
                        'code': assignation.matiere.code,
                        'nom': assignation.matiere.nom
                    }
                    
                    # Récupérer les notes de l'étudiant pour cette matière
                    from ..models.qcm import QCM
                    
                    # Récupérer tous les résultats de l'étudiant pour les QCM de cette matière
                    resultats = db.session.query(Resultat).join(QCM).filter(
                        Resultat.etudiant_id == etudiant.id,
                        QCM.matiere_id == assignation.matiere.id
                    ).all()
                    
                    notes_data = []
                    for resultat in resultats:
                        notes_data.append({
                            'matiere': assignation.matiere.nom,
                            'note': resultat.note,
                            'qcm_titre': resultat.qcm.titre if resultat.qcm else 'QCM supprimé',
                            'date_correction': resultat.date_correction.isoformat(),
                            'pourcentage': resultat.pourcentage
                        })
                    
                    etudiant_dict['notes'] = notes_data
                    etudiant_dict['presence'] = 0  # À implémenter
                    
                    etudiants_data.append(etudiant_dict)

        return jsonify({"etudiants": etudiants_data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500













# ==========================
# PROFIL ENSEIGNANT CONNECTÉ
# ==========================
@enseignants_bp.route("/enseignant/profil", methods=["GET"])
@jwt_required()
def get_profil_enseignant():
    """
    Retourne le profil de l'enseignant connecté, incluant utilisateur et informations de base.
    """
    try:
        user_id = get_jwt_identity()
        enseignant = Enseignant.query.filter_by(utilisateur_id=user_id).first()
        if not enseignant:
            return jsonify({"error": "Accès non autorisé"}), 403

        # Construire la réponse profil
        utilisateur = enseignant.utilisateur
        profil = {
            "nom": utilisateur.username if utilisateur else "",
            "email": utilisateur.email if utilisateur else "",
            "departement": enseignant.departement or "",
            "est_actif": enseignant.est_actif,
            "assignations": [a.to_dict() for a in (enseignant.assignations or [])]
        }

        return jsonify(profil), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500







