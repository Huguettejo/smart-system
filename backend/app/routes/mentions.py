from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import Utilisateur
from ..models.niveau_parcours import Mention, Parcours
from ..extensions import db

mentions_bp = Blueprint('mentions', __name__)

@mentions_bp.route('/mentions', methods=['GET'])
@jwt_required()
def get_mentions():
    """Récupérer toutes les mentions (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Charger TOUTES les mentions (actives ET inactives) pour permettre la réactivation
        mentions = Mention.query.order_by(Mention.nom).all()
        
        return jsonify({
            'mentions': [mention.to_dict() for mention in mentions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération des mentions: {str(e)}'}), 500

@mentions_bp.route('/mentions', methods=['POST'])
@jwt_required()
def create_mention():
    """Créer une nouvelle mention (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        nom = data.get('nom')
        code = data.get('code')
        
        if not nom or not code:
            return jsonify({'error': 'Nom et code sont requis'}), 400
        
        # Vérifier si la mention existe déjà
        existing_mention = Mention.query.filter(
            (Mention.nom == nom) | (Mention.code == code)
        ).first()
        
        if existing_mention:
            return jsonify({'error': 'Une mention avec ce nom ou code existe déjà'}), 400
        
        mention = Mention(nom=nom, code=code, est_actif=True)
        db.session.add(mention)
        db.session.commit()
        
        return jsonify({
            'message': 'Mention créée avec succès',
            'mention': mention.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la création de la mention: {str(e)}'}), 500

@mentions_bp.route('/mentions/<int:mention_id>', methods=['PUT'])
@jwt_required()
def update_mention(mention_id):
    """Modifier une mention (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        mention = Mention.query.get(mention_id)
        if not mention:
            return jsonify({'error': 'Mention non trouvée'}), 404
        
        data = request.get_json()
        nom = data.get('nom')
        code = data.get('code')
        est_actif = data.get('est_actif')
        
        if nom:
            # Vérifier si une autre mention a déjà ce nom
            existing = Mention.query.filter(
                Mention.nom == nom,
                Mention.id != mention_id
            ).first()
            if existing:
                return jsonify({'error': 'Une mention avec ce nom existe déjà'}), 400
            mention.nom = nom
        
        if code:
            # Vérifier si une autre mention a déjà ce code
            existing = Mention.query.filter(
                Mention.code == code,
                Mention.id != mention_id
            ).first()
            if existing:
                return jsonify({'error': 'Une mention avec ce code existe déjà'}), 400
            mention.code = code
        
        if est_actif is not None:
            mention.est_actif = est_actif
        
        db.session.commit()
        
        return jsonify({
            'message': 'Mention mise à jour avec succès',
            'mention': mention.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la mise à jour de la mention: {str(e)}'}), 500

@mentions_bp.route('/mentions/<int:mention_id>', methods=['DELETE'])
@jwt_required()
def delete_mention(mention_id):
    """Supprimer une mention (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        mention = Mention.query.get(mention_id)
        if not mention:
            return jsonify({'error': 'Mention non trouvée'}), 404
        
        # Vérifier s'il y a des étudiants associés à cette mention
        from ..models.user import Etudiant
        etudiants_count = Etudiant.query.filter_by(mention_id=mention_id).count()
        if etudiants_count > 0:
            return jsonify({
                'error': f'❌ Impossible de supprimer cette mention car {etudiants_count} étudiant(s) y sont associés. Veuillez d\'abord retirer les étudiants ou désactiver la mention.'
            }), 400
        
        # Vérifier s'il y a des parcours liés à cette mention
        parcours_count = Parcours.query.filter_by(mention_id=mention_id).count()
        if parcours_count > 0:
            return jsonify({
                'error': f'❌ Impossible de supprimer cette mention car {parcours_count} parcours y sont associés. Veuillez d\'abord retirer ou supprimer les parcours ou désactiver la mention.'
            }), 400
        
        db.session.delete(mention)
        db.session.commit()
        
        return jsonify({'message': 'Mention supprimée avec succès'}), 200
        
    except Exception as e:
        db.session.rollback()
        # Intercepter les erreurs de contrainte de clé étrangère
        error_message = str(e)
        if "foreign key constraint" in error_message.lower() or "ForeignKeyViolation" in error_message:
            return jsonify({
                'error': '❌ Impossible de supprimer cette mention car elle est encore référencée dans la base de données. Veuillez d\'abord retirer toutes les dépendances ou désactiver la mention.'
            }), 400
        return jsonify({'error': f'Erreur lors de la suppression de la mention: {str(e)}'}), 500

# NOTE: Les routes CRUD pour /parcours ont été déplacées vers niveau_parcours.py
# pour éviter les conflits de routes et centraliser la logique admin/enseignant

# Routes pour les parcours liés aux mentions
@mentions_bp.route('/mentions/<int:mention_id>/parcours', methods=['GET'])
@jwt_required()
def get_parcours_by_mention(mention_id):
    """Récupérer les parcours d'une mention (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        mention = Mention.query.get(mention_id)
        if not mention:
            return jsonify({'error': 'Mention non trouvée'}), 404
        
        parcours = Parcours.query.filter_by(
            mention_id=mention_id,
            est_actif=True
        ).all()
        
        return jsonify({
            'parcours': [parcours.to_dict() for parcours in parcours]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération des parcours: {str(e)}'}), 500
