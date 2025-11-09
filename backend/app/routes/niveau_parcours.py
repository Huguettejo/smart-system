from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.niveau_parcours import Niveau, Parcours
from ..models.user import Admin
from ..extensions import db

niveau_parcours_bp = Blueprint('niveau_parcours', __name__)

# ===== ROUTES POUR LES NIVEAUX =====

@niveau_parcours_bp.route("/niveaux", methods=["GET"])
@jwt_required()
def get_niveaux():
    """
    Récupère les niveaux liés aux matières assignées à l'enseignant connecté.
    """
    try:
        # Récupérer l'utilisateur connecté
        user_id = get_jwt_identity()
        from ..models.user import Admin, Enseignant
        from ..models.matiere import MatiereEnseignantNiveauParcours
        
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        enseignant = Enseignant.query.filter_by(utilisateur_id=user_id).first()
        
        if admin:
            # Admin : charger TOUS les niveaux (actifs ET inactifs) pour permettre la réactivation
            niveaux = Niveau.query.order_by(Niveau.ordre, Niveau.nom).all()
            print(f"📊 [GET NIVEAUX] Admin - Total trouvés: {len(niveaux)}")
            for n in niveaux:
                print(f"   - {n.nom} (ID={n.id}, est_actif={n.est_actif})")
        elif enseignant:
            # Enseignant : seulement les niveaux de ses matières assignées
            assignations = MatiereEnseignantNiveauParcours.query.filter_by(
                enseignant_id=enseignant.id,
                est_actif=True
            ).all()
            
            # Extraire les niveaux uniques
            niveaux_ids = list(set([a.niveau_id for a in assignations if a.niveau_id]))
            niveaux = Niveau.query.filter(Niveau.id.in_(niveaux_ids)).order_by(Niveau.ordre, Niveau.nom).all()
        else:
            return jsonify({"error": "Accès non autorisé"}), 403

        return jsonify({"niveaux": [niveau.to_dict() for niveau in niveaux]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@niveau_parcours_bp.route("/niveaux", methods=["POST"])
@jwt_required()
def create_niveau():
    """
    Crée un nouveau niveau.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        data = request.get_json()
        
        # Validation des données
        if not data or 'nom' not in data or 'code' not in data:
            return jsonify({"error": "Nom et code requis"}), 400

        # Vérifier si le code existe déjà
        existing_niveau = Niveau.query.filter_by(code=data['code']).first()
        if existing_niveau:
            return jsonify({"error": "Un niveau avec ce code existe déjà"}), 400

        # Créer le nouveau niveau
        niveau = Niveau(
            nom=data['nom'],
            code=data['code'],
            description=data.get('description', ''),
            ordre=data.get('ordre', 0),
            est_actif=data.get('est_actif', True)
        )

        db.session.add(niveau)
        db.session.commit()

        return jsonify({
            "message": "Niveau créé avec succès",
            "niveau": niveau.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@niveau_parcours_bp.route("/niveaux/<int:niveau_id>", methods=["PUT"])
@jwt_required()
def update_niveau(niveau_id):
    """
    Met à jour un niveau.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        niveau = Niveau.query.get_or_404(niveau_id)
        data = request.get_json()
        
        print(f"🔄 [UPDATE NIVEAU] ID={niveau_id}, Data reçue: {data}")
        print(f"   Avant: est_actif={niveau.est_actif}")

        # Mettre à jour les champs
        if 'nom' in data:
            niveau.nom = data['nom']
        if 'code' in data:
            # Vérifier si le nouveau code existe déjà
            existing_niveau = Niveau.query.filter_by(code=data['code']).first()
            if existing_niveau and existing_niveau.id != niveau_id:
                return jsonify({"error": "Un niveau avec ce code existe déjà"}), 400
            niveau.code = data['code']
        if 'description' in data:
            niveau.description = data['description']
        if 'ordre' in data:
            niveau.ordre = data['ordre']
        if 'est_actif' in data:
            niveau.est_actif = data['est_actif']
            print(f"   Après: est_actif={niveau.est_actif}")

        db.session.commit()
        print(f"✅ [UPDATE NIVEAU] Commit réussi pour ID={niveau_id}")

        return jsonify({
            "message": "Niveau mis à jour avec succès",
            "niveau": niveau.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@niveau_parcours_bp.route("/niveaux/<int:niveau_id>", methods=["DELETE"])
@jwt_required()
def delete_niveau(niveau_id):
    """
    Supprime un niveau.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        niveau = Niveau.query.get_or_404(niveau_id)

        # Vérifier s'il y a des étudiants liés
        if niveau.etudiants:
            etudiants_count = len(niveau.etudiants)
            return jsonify({
                "error": f"❌ Impossible de supprimer ce niveau car il est utilisé par {etudiants_count} étudiant(s). Veuillez d'abord retirer les étudiants ou désactiver le niveau."
            }), 400

        # Vérifier s'il y a des parcours liés
        if niveau.parcours:
            parcours_count = len(niveau.parcours)
            return jsonify({
                "error": f"❌ Impossible de supprimer ce niveau car il est lié à {parcours_count} parcours. Veuillez d'abord retirer les liens ou désactiver le niveau."
            }), 400

        # Vérifier s'il y a des assignations d'enseignants
        from ..models.matiere import MatiereEnseignantNiveauParcours
        assignations_count = MatiereEnseignantNiveauParcours.query.filter_by(niveau_id=niveau_id).count()
        if assignations_count > 0:
            return jsonify({
                "error": f"❌ Impossible de supprimer ce niveau car il est utilisé dans {assignations_count} assignation(s) d'enseignants. Veuillez d'abord retirer les assignations ou désactiver le niveau."
            }), 400

        db.session.delete(niveau)
        db.session.commit()

        return jsonify({"message": "Niveau supprimé avec succès"}), 200

    except Exception as e:
        db.session.rollback()
        # Intercepter les erreurs de contrainte de clé étrangère
        error_message = str(e)
        if "foreign key constraint" in error_message.lower() or "ForeignKeyViolation" in error_message:
            return jsonify({
                "error": "❌ Impossible de supprimer ce niveau car il est encore référencé dans la base de données. Veuillez d'abord retirer toutes les dépendances ou désactiver le niveau."
            }), 400
        return jsonify({"error": f"Erreur lors de la suppression du niveau: {str(e)}"}), 500

# ===== ROUTES POUR LES PARCOURS =====

@niveau_parcours_bp.route("/parcours", methods=["GET"])
@jwt_required()
def get_parcours():
    """
    Récupère les parcours liés aux matières assignées à l'enseignant connecté.
    """
    try:
        # Récupérer l'utilisateur connecté
        user_id = get_jwt_identity()
        from ..models.user import Admin, Enseignant
        from ..models.matiere import MatiereEnseignantNiveauParcours
        
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        enseignant = Enseignant.query.filter_by(utilisateur_id=user_id).first()
        
        if admin:
            # Admin : charger TOUS les parcours (actifs ET inactifs) pour permettre la réactivation
            parcours = Parcours.query.order_by(Parcours.nom).all()
            print(f"📊 [GET PARCOURS] Admin - Total trouvés: {len(parcours)}")
            for p in parcours:
                print(f"   - {p.nom} (ID={p.id}, est_actif={p.est_actif})")
        elif enseignant:
            # Enseignant : seulement les parcours de ses matières assignées
            assignations = MatiereEnseignantNiveauParcours.query.filter_by(
                enseignant_id=enseignant.id,
                est_actif=True
            ).all()
            
            # Extraire les parcours uniques
            parcours_ids = list(set([a.parcours_id for a in assignations if a.parcours_id]))
            parcours = Parcours.query.filter(Parcours.id.in_(parcours_ids)).order_by(Parcours.nom).all()
        else:
            return jsonify({"error": "Accès non autorisé"}), 403

        return jsonify({"parcours": [parcours_item.to_dict() for parcours_item in parcours]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@niveau_parcours_bp.route("/parcours", methods=["POST"])
@jwt_required()
def create_parcours():
    """
    Crée un nouveau parcours.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        data = request.get_json()
        
        # Validation des données
        if not data or 'nom' not in data or 'code' not in data:
            return jsonify({"error": "Nom et code requis"}), 400

        # Vérifier si le code existe déjà
        existing_parcours = Parcours.query.filter_by(code=data['code']).first()
        if existing_parcours:
            return jsonify({"error": "Un parcours avec ce code existe déjà"}), 400

        # Créer le nouveau parcours
        parcours = Parcours(
            nom=data['nom'],
            code=data['code'],
            description=data.get('description', ''),
            est_actif=data.get('est_actif', True)
        )

        db.session.add(parcours)
        db.session.commit()

        return jsonify({
            "message": "Parcours créé avec succès",
            "parcours": parcours.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@niveau_parcours_bp.route("/parcours/<int:parcours_id>", methods=["PUT"])
@jwt_required()
def update_parcours(parcours_id):
    """
    Met à jour un parcours.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        parcours = Parcours.query.get_or_404(parcours_id)
        data = request.get_json()
        
        print(f"🔄 [UPDATE PARCOURS] ID={parcours_id}, Data reçue: {data}")
        print(f"   Avant: est_actif={parcours.est_actif}")

        # Mettre à jour les champs
        if 'nom' in data:
            parcours.nom = data['nom']
        if 'code' in data:
            # Vérifier si le nouveau code existe déjà
            existing_parcours = Parcours.query.filter_by(code=data['code']).first()
            if existing_parcours and existing_parcours.id != parcours_id:
                return jsonify({"error": "Un parcours avec ce code existe déjà"}), 400
            parcours.code = data['code']
        if 'description' in data:
            parcours.description = data['description']
        if 'mention_id' in data:
            parcours.mention_id = data['mention_id']
        if 'niveau_ids' in data:
            # Mettre à jour les niveaux associés
            niveaux = Niveau.query.filter(Niveau.id.in_(data['niveau_ids'])).all() if data['niveau_ids'] else []
            parcours.niveaux = niveaux
        if 'est_actif' in data:
            parcours.est_actif = data['est_actif']
            print(f"   Après: est_actif={parcours.est_actif}")

        db.session.commit()
        print(f"✅ [UPDATE PARCOURS] Commit réussi pour ID={parcours_id}")

        return jsonify({
            "message": "Parcours mis à jour avec succès",
            "parcours": parcours.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@niveau_parcours_bp.route("/parcours/<int:parcours_id>", methods=["DELETE"])
@jwt_required()
def delete_parcours(parcours_id):
    """
    Supprime un parcours.
    """
    try:
        # Vérifier que l'utilisateur est admin
        user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=user_id).first()
        if not admin:
            return jsonify({"error": "Accès non autorisé"}), 403

        parcours = Parcours.query.get_or_404(parcours_id)

        # Vérifier s'il y a des étudiants liés
        if parcours.etudiants:
            etudiants_count = len(parcours.etudiants)
            return jsonify({
                "error": f"❌ Impossible de supprimer ce parcours car il est utilisé par {etudiants_count} étudiant(s). Veuillez d'abord retirer les étudiants ou désactiver le parcours."
            }), 400

        # Vérifier s'il y a des assignations d'enseignants
        from ..models.matiere import MatiereEnseignantNiveauParcours
        assignations_count = MatiereEnseignantNiveauParcours.query.filter_by(parcours_id=parcours_id).count()
        if assignations_count > 0:
            return jsonify({
                "error": f"❌ Impossible de supprimer ce parcours car il est utilisé dans {assignations_count} assignation(s) d'enseignants. Veuillez d'abord retirer les assignations ou désactiver le parcours."
            }), 400

        db.session.delete(parcours)
        db.session.commit()

        return jsonify({"message": "Parcours supprimé avec succès"}), 200

    except Exception as e:
        db.session.rollback()
        # Intercepter les erreurs de contrainte de clé étrangère
        error_message = str(e)
        if "foreign key constraint" in error_message.lower() or "ForeignKeyViolation" in error_message:
            return jsonify({
                "error": "❌ Impossible de supprimer ce parcours car il est encore référencé dans la base de données. Veuillez d'abord retirer toutes les dépendances ou désactiver le parcours."
            }), 400
        return jsonify({"error": f"Erreur lors de la suppression du parcours: {str(e)}"}), 500

# ===== ROUTES POUR LES DONNÉES DE RÉFÉRENCE =====

@niveau_parcours_bp.route("/niveaux/actifs", methods=["GET"])
@jwt_required()
def get_niveaux_actifs():
    """
    Récupère tous les niveaux actifs (pour les formulaires).
    """
    try:
        niveaux = Niveau.query.filter_by(est_actif=True).order_by(Niveau.ordre, Niveau.nom).all()
        return jsonify({
            "niveaux": [niveau.to_dict() for niveau in niveaux]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@niveau_parcours_bp.route("/parcours/actifs", methods=["GET"])
@jwt_required()
def get_parcours_actifs():
    """
    Récupère tous les parcours actifs (pour les formulaires).
    """
    try:
        parcours = Parcours.query.filter_by(est_actif=True).order_by(Parcours.nom).all()
        return jsonify({
            "parcours": [parcours_item.to_dict() for parcours_item in parcours]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
