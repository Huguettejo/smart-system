from flask import Blueprint, request, jsonify
from ..models.user import Utilisateur, Etudiant, Enseignant, Admin, db
from ..models.niveau_parcours import Niveau, Parcours, Mention
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint("auth", __name__)


# Route d'inscription
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    # Validation des champs requis
    if not data.get("email") or not data.get("motDePasse"):
        return jsonify({"error": "Email et mot de passe requis"}), 400

    if not data.get("nomComplet"):
        return jsonify({"error": "Nom complet requis"}), 400

    # Vérifier si utilisateur existe déjà
    if Utilisateur.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email déjà utilisé"}), 400

    # Utiliser le nom complet comme username (avec espaces préservés)
    username = data.get("username") or data["nomComplet"]

    if Utilisateur.query.filter_by(username=username).first():
        return jsonify({"error": "Nom d'utilisateur déjà pris"}), 400

    # Vérifier confirmation mot de passe pour inscription
    if data.get("confirmerMotDePasse") and data["motDePasse"] != data["confirmerMotDePasse"]:
        return jsonify({"error": "Les mots de passe ne correspondent pas"}), 400

    try:
        # Créer l'utilisateur principal
        hashed_pw = generate_password_hash(data["motDePasse"])
        user = Utilisateur(
            username=username,
            email=data["email"],
            password=hashed_pw,
            role=data.get("userType", "etudiant")  # Utiliser userType du frontend
        )
        db.session.add(user)
        db.session.flush()  # Pour obtenir l'ID de l'utilisateur

        # Créer l'enregistrement spécifique selon le rôle
        if user.role == "etudiant":
            if not data.get("matricule"):
                return jsonify({"error": "Matricule requis pour les étudiants"}), 400

            # Vérifier si le niveau existe (si fourni)
            niveau_id = None
            if data.get("niveau_id"):
                niveau_id = data["niveau_id"]
            elif data.get("niveau"):
                niveau = Niveau.query.filter_by(code=data["niveau"]).first()
                if niveau:
                    niveau_id = niveau.id

            # Vérifier si le parcours existe (si fourni)
            parcours_id = None
            if data.get("parcours_id"):
                parcours_id = data["parcours_id"]
            elif data.get("parcours"):
                parcours = Parcours.query.filter_by(code=data["parcours"]).first()
                if parcours:
                    parcours_id = parcours.id

            # Vérifier si la mention existe (si fournie)
            mention_id = None
            if data.get("mention_id"):
                mention = Mention.query.get(data["mention_id"])
                if mention:
                    mention_id = mention.id

            etudiant = Etudiant(
                utilisateur_id=user.id,
                matriculeId=data["matricule"],
                niveau_id=niveau_id,
                parcours_id=parcours_id,
                mention_id=mention_id,
                est_actif=False  # Inactif par défaut, en attente d'approbation
            )
            db.session.add(etudiant)

        elif user.role == "enseignant":
            enseignant = Enseignant(
                utilisateur_id=user.id,
                departement=data.get("departement"),
                est_actif=False  # Inactif par défaut, en attente d'approbation
            )
            db.session.add(enseignant)

        # Suppression de la possibilité d'inscription admin
        # Les admins doivent être créés manuellement par un super admin

        db.session.commit()

        return jsonify({
            "message": "Inscription réussie ! Votre compte est en attente d'approbation par l'administrateur.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            },
            "status": "pending_approval"
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Erreur lors de la création de l'utilisateur"}), 500


# Route de connexion
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data.get("email") or not data.get("motDePasse"):
        return jsonify({"error": "Email et mot de passe requis"}), 400

    user = Utilisateur.query.filter_by(email=data["email"]).first()

    # Vérification temporaire avec mot de passe simple
    if not user:
        return jsonify({"error": "Identifiants invalides"}), 401
    
    # Vérification simple du mot de passe (temporaire)
    if data["motDePasse"] != "123456":
        return jsonify({"error": "Identifiants invalides"}), 401

    # Vérifier si l'utilisateur est actif (sauf pour les admins)
    if user.role != "admin":
        # Vérifier le statut selon le rôle
        if user.role == "etudiant":
            etudiant = Etudiant.query.filter_by(utilisateur_id=user.id).first()
            if not etudiant or not etudiant.est_actif:
                return jsonify({
                    "error": "Votre compte est en attente d'approbation par l'administrateur. Veuillez patienter."
                }), 403
        elif user.role == "enseignant":
            enseignant = Enseignant.query.filter_by(utilisateur_id=user.id).first()
            if not enseignant or not enseignant.est_actif:
                return jsonify({
                    "error": "Votre compte est en attente d'approbation par l'administrateur. Veuillez patienter."
                }), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }), 200
# Route pour récupérer les mentions et parcours (pour le formulaire d'inscription)
@auth_bp.route("/mentions", methods=["GET"])
def get_mentions_for_registration():
    """Récupérer toutes les mentions, parcours et niveaux pour le formulaire d'inscription"""
    try:
        mentions = Mention.query.filter_by(est_actif=True).all()
        parcours = Parcours.query.filter_by(est_actif=True).all()
        niveaux = Niveau.query.filter_by(est_actif=True).all()
        
        return jsonify({
            'mentions': [mention.to_dict() for mention in mentions],
            'parcours': [parcours.to_dict() for parcours in parcours],
            'niveaux': [niveau.to_dict() for niveau in niveaux]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération des mentions: {str(e)}'}), 500


# Route pour vérifier la validité du token
@auth_bp.route("/verify-token", methods=["GET"])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_jwt_identity()
        user = Utilisateur.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "Utilisateur non trouvé"}), 404
            
        # Retourner les informations de l'utilisateur
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
        
        return jsonify({
            "valid": True,
            "user": user_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Erreur de vérification: {str(e)}"}), 500

