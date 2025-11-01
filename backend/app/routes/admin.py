from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from ..models.user import Utilisateur, Enseignant, Etudiant, Admin
from ..models.matiere import Matiere, MatiereEnseignantNiveauParcours
from ..models.niveau_parcours import Niveau, Parcours
from ..extensions import db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    """Récupérer tous les utilisateurs (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        users = Utilisateur.query.all()
        users_data = []
        
        for user in users:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        return jsonify({
            'users': users_data,
            'total': len(users_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération des utilisateurs: {str(e)}'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Récupérer un utilisateur spécifique (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        user = Utilisateur.query.get(user_id)
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404
        
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'created_at': user.created_at.isoformat() if user.created_at else None
        }
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération de l\'utilisateur: {str(e)}'}), 500

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    """Modifier le rôle d'un utilisateur (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        user = Utilisateur.query.get(user_id)
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404
        
        data = request.get_json()
        new_role = data.get('role')
        
        if not new_role or new_role not in ['admin', 'enseignant', 'etudiant']:
            return jsonify({'error': 'Rôle invalide'}), 400
        
        user.role = new_role
        db.session.commit()
        
        return jsonify({
            'message': 'Rôle mis à jour avec succès',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la mise à jour du rôle: {str(e)}'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Supprimer un utilisateur (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Empêcher l'auto-suppression
        if current_user_id == user_id:
            return jsonify({'error': 'Vous ne pouvez pas supprimer votre propre compte'}), 400
        
        user = Utilisateur.query.get(user_id)
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'Utilisateur supprimé avec succès'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la suppression de l\'utilisateur: {str(e)}'}), 500

# Routes pour la gestion des assignations de matières
@admin_bp.route('/assignations', methods=['POST'])
@jwt_required()
def create_assignation():
    """Créer une nouvelle assignation matière-enseignant (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        matiere_id = data.get('matiere_id')
        enseignant_id = data.get('enseignant_id')
        niveau_id = data.get('niveau_id')
        parcours_id = data.get('parcours_id')
        
        # Validation des données
        if not matiere_id or not enseignant_id:
            return jsonify({'error': 'Matière et enseignant sont requis'}), 400
        
        # Vérifier que la matière existe
        matiere = Matiere.query.get(matiere_id)
        if not matiere:
            return jsonify({'error': 'Matière non trouvée'}), 404
        
        # Vérifier que l'enseignant existe
        enseignant = Enseignant.query.get(enseignant_id)
        if not enseignant:
            return jsonify({'error': 'Enseignant non trouvé'}), 404
        
        # Vérifier que l'assignation n'existe pas déjà
        existing_assignation = MatiereEnseignantNiveauParcours.query.filter_by(
            matiere_id=matiere_id,
            enseignant_id=enseignant_id,
            niveau_id=niveau_id,
            parcours_id=parcours_id
        ).first()
        
        if existing_assignation:
            return jsonify({'error': 'Cette assignation existe déjà'}), 400
        
        # Créer l'assignation
        assignation = MatiereEnseignantNiveauParcours(
            matiere_id=matiere_id,
            enseignant_id=enseignant_id,
            niveau_id=niveau_id,
            parcours_id=parcours_id,
            est_actif=True
        )
        
        db.session.add(assignation)
        db.session.commit()
        
        return jsonify({
            'message': 'Assignation créée avec succès',
            'assignation': assignation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la création de l\'assignation: {str(e)}'}), 500

@admin_bp.route('/assignations/<int:assignation_id>', methods=['DELETE'])
@jwt_required()
def delete_assignation(assignation_id):
    """Supprimer une assignation matière-enseignant (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Trouver l'assignation
        assignation = MatiereEnseignantNiveauParcours.query.get(assignation_id)
        if not assignation:
            return jsonify({'error': 'Assignation non trouvée'}), 404
        
        # Supprimer l'assignation
        db.session.delete(assignation)
        db.session.commit()
        
        return jsonify({'message': 'Assignation supprimée avec succès'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la suppression de l\'assignation: {str(e)}'}), 500

@admin_bp.route('/enseignants/<int:enseignant_id>/assignations', methods=['GET'])
@jwt_required()
def get_enseignant_assignations(enseignant_id):
    """Récupérer les assignations d'un enseignant (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Récupérer les assignations de l'enseignant
        assignations = MatiereEnseignantNiveauParcours.query.filter_by(
            enseignant_id=enseignant_id
        ).all()
        
        return jsonify({
            'assignations': [assignation.to_dict() for assignation in assignations]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération des assignations: {str(e)}'}), 500

# Routes pour récupérer les données de référence
@admin_bp.route('/matieres', methods=['GET'])
@jwt_required()
def get_matieres():
    """Récupérer toutes les matières (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Charger TOUTES les matières (actives ET inactives) pour permettre la réactivation
        matieres = Matiere.query.all()
        
        return jsonify({
            'matieres': [matiere.to_dict() for matiere in matieres]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération des matières: {str(e)}'}), 500

@admin_bp.route('/matieres/<int:matiere_id>/status', methods=['PATCH'])
@jwt_required()
def toggle_matiere_status(matiere_id):
    """Active ou désactive une matière."""
    try:
        # Vérifier que l'utilisateur est admin
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        matiere = Matiere.query.get_or_404(matiere_id)
        data = request.get_json()
        
        if 'est_actif' not in data:
            return jsonify({'error': "Le champ 'est_actif' est requis"}), 400
        
        matiere.est_actif = data['est_actif']
        db.session.commit()
        
        status_text = "activée" if matiere.est_actif else "désactivée"
        return jsonify({
            'message': f'Matière {status_text} avec succès',
            'matiere': matiere.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/niveaux', methods=['GET'])
@jwt_required()
def get_niveaux():
    """Récupérer tous les niveaux (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Charger TOUS les niveaux (actifs ET inactifs) pour permettre la réactivation
        niveaux = Niveau.query.order_by(Niveau.ordre).all()
        
        return jsonify({
            'niveaux': [niveau.to_dict() for niveau in niveaux]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération des niveaux: {str(e)}'}), 500

@admin_bp.route('/parcours', methods=['GET', 'POST'])
@jwt_required()
def get_parcours():
    """Récupérer tous les parcours ou créer un nouveau parcours (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        if request.method == 'GET':
            # Charger TOUS les parcours (actifs ET inactifs) pour permettre la réactivation
            parcours = Parcours.query.order_by(Parcours.nom).all()
            
            return jsonify({
                'parcours': [parcours.to_dict() for parcours in parcours]
            }), 200
        
        elif request.method == 'POST':
            data = request.get_json()
            nom = data.get('nom')
            code = data.get('code')
            description = data.get('description', '')
            mention_id = data.get('mention_id')
            niveau_ids = data.get('niveau_ids', [])
            
            if not nom or not code:
                return jsonify({'error': 'Nom et code sont requis'}), 400
            
            # Vérifier si la mention existe (si mention_id est fourni)
            if mention_id and mention_id != 0:
                from ..models.niveau_parcours import Mention
                mention = Mention.query.get(mention_id)
                if not mention:
                    return jsonify({'error': 'Mention non trouvée'}), 404
            
            # Vérifier si les niveaux existent
            niveaux = []
            if niveau_ids:
                niveaux = Niveau.query.filter(Niveau.id.in_(niveau_ids)).all()
                if len(niveaux) != len(niveau_ids):
                    return jsonify({'error': 'Un ou plusieurs niveaux non trouvés'}), 404
            
            # Vérifier si le parcours existe déjà
            existing_parcours = Parcours.query.filter(
                (Parcours.nom == nom) | (Parcours.code == code)
            ).first()
            
            if existing_parcours:
                return jsonify({'error': 'Un parcours avec ce nom ou code existe déjà'}), 400
            
            parcours = Parcours(
                nom=nom,
                code=code,
                description=description,
                mention_id=mention_id if mention_id and mention_id != 0 else None,
                est_actif=True
            )
            
            # Ajouter les niveaux au parcours
            parcours.niveaux = niveaux
            
            db.session.add(parcours)
            db.session.commit()
            
            return jsonify({
                'message': 'Parcours créé avec succès',
                'parcours': parcours.to_dict()
            }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la récupération/création des parcours: {str(e)}'}), 500

@admin_bp.route('/parcours/<int:parcours_id>', methods=['PUT'])
@jwt_required()
def update_parcours(parcours_id):
    """Modifier un parcours (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        parcours = Parcours.query.get(parcours_id)
        if not parcours:
            return jsonify({'error': 'Parcours non trouvé'}), 404
        
        data = request.get_json()
        nom = data.get('nom')
        code = data.get('code')
        description = data.get('description')
        mention_id = data.get('mention_id')
        niveau_ids = data.get('niveau_ids')
        est_actif = data.get('est_actif')
        
        if nom:
            # Vérifier si un autre parcours a déjà ce nom
            existing = Parcours.query.filter(
                Parcours.nom == nom,
                Parcours.id != parcours_id
            ).first()
            if existing:
                return jsonify({'error': 'Un parcours avec ce nom existe déjà'}), 400
            parcours.nom = nom
        
        if code:
            # Vérifier si un autre parcours a déjà ce code
            existing = Parcours.query.filter(
                Parcours.code == code,
                Parcours.id != parcours_id
            ).first()
            if existing:
                return jsonify({'error': 'Un parcours avec ce code existe déjà'}), 400
            parcours.code = code
        
        if description is not None:
            parcours.description = description
        
        if mention_id is not None:
            if mention_id == 0:
                parcours.mention_id = None
            else:
                # Vérifier si la mention existe
                from ..models.niveau_parcours import Mention
                mention = Mention.query.get(mention_id)
                if not mention:
                    return jsonify({'error': 'Mention non trouvée'}), 404
                parcours.mention_id = mention_id
        
        if niveau_ids is not None:
            # Vider d'abord les niveaux existants
            parcours.niveaux.clear()
            if niveau_ids:
                niveaux = Niveau.query.filter(Niveau.id.in_(niveau_ids)).all()
                if len(niveaux) != len(niveau_ids):
                    return jsonify({'error': 'Un ou plusieurs niveaux non trouvés'}), 404
                # Ajouter les nouveaux niveaux
                for niveau in niveaux:
                    parcours.niveaux.append(niveau)
            # Forcer la sauvegarde immédiate
            db.session.flush()
        
        if est_actif is not None:
            parcours.est_actif = est_actif
        
        db.session.commit()
        
        return jsonify({
            'message': 'Parcours mis à jour avec succès',
            'parcours': parcours.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la mise à jour du parcours: {str(e)}'}), 500

@admin_bp.route('/enseignants', methods=['GET'])
@jwt_required()
def get_enseignants():
    """Récupérer tous les enseignants (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        enseignants = Enseignant.query.all()
        
        enseignants_data = []
        for enseignant in enseignants:
            # Récupérer les assignations de cet enseignant
            assignations = MatiereEnseignantNiveauParcours.query.filter_by(
                enseignant_id=enseignant.id,
                est_actif=True
            ).all()
            
            enseignants_data.append({
                'id': enseignant.id,
                'utilisateur_id': enseignant.utilisateur_id,
                'departement': enseignant.departement,
                'est_actif': enseignant.est_actif,
                'utilisateur': {
                    'id': enseignant.utilisateur.id,
                    'username': enseignant.utilisateur.username,
                    'email': enseignant.utilisateur.email,
                    'role': enseignant.utilisateur.role
                },
                'assignations': [assignation.to_dict() for assignation in assignations]
            })
        
        return jsonify({
            'enseignants': enseignants_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la récupération des enseignants: {str(e)}'}), 500

# Routes pour la gestion des promotions d'étudiants
@admin_bp.route('/preview-promotion', methods=['POST'])
@jwt_required()
def preview_promotion():
    """Prévisualiser les promotions d'étudiants (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=current_user_id).first()
        
        if not admin:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        annee_depart = data.get('annee_depart')
        
        if not annee_depart:
            return jsonify({'error': 'Année de départ requise'}), 400
        
        # Récupérer tous les étudiants actifs de l'année de départ avec les relations chargées
        etudiants_actifs = Etudiant.query.options(
            joinedload(Etudiant.utilisateur),
            joinedload(Etudiant.niveau_obj),
            joinedload(Etudiant.parcours_obj),
            joinedload(Etudiant.mention_obj)
        ).filter_by(
            est_actif=True,
            annee_universitaire=annee_depart
        ).all()
        
        if not etudiants_actifs:
            return jsonify({'error': 'Aucun étudiant actif trouvé pour cette année'}), 404
        
        # Créer un mapping des niveaux pour la promotion
        niveau_mapping = {
            'L1': 'L2',
            'L2': 'L3', 
            'L3': 'M1',
            'M1': 'M2',
            'M2': 'DIPLOME'
        }
        
        # Grouper les étudiants par niveau
        etudiants_par_niveau = {}
        for etudiant in etudiants_actifs:
            niveau_code = etudiant.niveau_obj.code if etudiant.niveau_obj else 'N/A'
            if niveau_code not in etudiants_par_niveau:
                etudiants_par_niveau[niveau_code] = []
            
            # Obtenir la mention de l'étudiant
            mention_nom = 'N/A'
            if etudiant.mention_obj:
                mention_nom = etudiant.mention_obj.nom
            elif etudiant.parcours_obj and etudiant.parcours_obj.mention:
                mention_nom = etudiant.parcours_obj.mention.nom
            
            etudiants_par_niveau[niveau_code].append({
                'id': etudiant.id,
                'nom': etudiant.utilisateur.username,  # Utiliser username qui contient le nom complet
                'matricule': etudiant.matriculeId,
                'parcours': etudiant.parcours_obj.nom if etudiant.parcours_obj else 'N/A',
                'mention': mention_nom
            })
        
        # Créer la prévisualisation
        preview = []
        for niveau_actuel, etudiants in etudiants_par_niveau.items():
            if niveau_actuel in niveau_mapping:
                nouveau_niveau = niveau_mapping[niveau_actuel]
                preview.append({
                    'niveau_actuel': niveau_actuel,
                    'niveau_nouveau': nouveau_niveau,
                    'nombre_etudiants': len(etudiants),
                    'etudiants': etudiants
                })
        
        return jsonify({
            'preview': preview,
            'statistiques': {
                'total_etudiants': len(etudiants_actifs),
                'niveaux_concernes': list(etudiants_par_niveau.keys())
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur lors de la prévisualisation: {str(e)}'}), 500

@admin_bp.route('/promouvoir-etudiants', methods=['POST'])
@jwt_required()
def promouvoir_etudiants():
    """Promouvoir les étudiants (admin seulement)"""
    try:
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=current_user_id).first()
        
        if not admin:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        annee_depart = data.get('annee_depart')
        annee_arrivee = data.get('annee_arrivee')
        redoublants = data.get('redoublants', [])  # Liste des IDs d'étudiants redoublants
        etudiants_attente = data.get('etudiants_attente', [])  # Liste des IDs d'étudiants en attente
        
        if not annee_depart or not annee_arrivee:
            return jsonify({'error': 'Année de départ et d\'arrivée requises'}), 400
        
        # Récupérer tous les étudiants actifs de l'année de départ
        etudiants_actifs = Etudiant.query.options(
            joinedload(Etudiant.utilisateur),
            joinedload(Etudiant.niveau_obj),
            joinedload(Etudiant.parcours_obj),
            joinedload(Etudiant.mention_obj)
        ).filter_by(
            est_actif=True,
            annee_universitaire=annee_depart
        ).all()
        
        if not etudiants_actifs:
            return jsonify({'error': 'Aucun étudiant actif trouvé pour cette année'}), 404
        
        # Vérifier si des étudiants ont déjà été promus vers cette année
        etudiants_deja_promus = Etudiant.query.filter_by(
            annee_universitaire=annee_arrivee
        ).all()
        
        utilisateurs_deja_promus = {etudiant.utilisateur_id for etudiant in etudiants_deja_promus}
        
        # Créer un mapping des niveaux pour la promotion
        niveau_mapping = {
            'L1': 'L2',
            'L2': 'L3', 
            'L3': 'M1',
            'M1': 'M2',
            'M2': 'DIPLOME'  # Fin de cursus
        }
        
        promotions_reussies = []
        redoublants_confirmes = []
        etudiants_attente_confirmes = []
        
        for etudiant in etudiants_actifs:
            etudiant_id = etudiant.id
            
            # Vérifier si l'étudiant a déjà été promu vers cette année
            if etudiant.utilisateur_id in utilisateurs_deja_promus:
                continue  # Ne pas promouvoir deux fois
            
            # Vérifier si l'étudiant est marqué comme redoublant
            if etudiant_id in redoublants:
                # L'étudiant redouble, reste au même niveau mais passe à la nouvelle année
                nouvel_etudiant = Etudiant(
                    utilisateur_id=etudiant.utilisateur_id,
                    matriculeId=etudiant.matriculeId,  # Même matricule
                    niveau_id=etudiant.niveau_id,  # Même niveau
                    parcours_id=etudiant.parcours_id,
                    mention_id=etudiant.mention_id,
                    annee_universitaire=annee_arrivee,
                    est_actif=True
                )
                
                db.session.add(nouvel_etudiant)
                
                redoublants_confirmes.append({
                    'id': etudiant_id,
                    'nom': etudiant.utilisateur.username,
                    'niveau_actuel': etudiant.niveau_obj.code if etudiant.niveau_obj else 'N/A'
                })
                continue
            
            # Vérifier si l'étudiant est en attente
            if etudiant_id in etudiants_attente:
                # L'étudiant est en attente, ne sera pas promu
                etudiants_attente_confirmes.append({
                    'id': etudiant_id,
                    'nom': etudiant.utilisateur.username,
                    'niveau_actuel': etudiant.niveau_obj.code if etudiant.niveau_obj else 'N/A'
                })
                continue
            
            # Promotion automatique
            niveau_actuel = etudiant.niveau_obj.code if etudiant.niveau_obj else None
            if niveau_actuel and niveau_actuel in niveau_mapping:
                nouveau_niveau_code = niveau_mapping[niveau_actuel]
                
                # Trouver le nouveau niveau
                nouveau_niveau = Niveau.query.filter_by(code=nouveau_niveau_code).first()
                
                if nouveau_niveau:
                    # Créer un nouvel enregistrement pour la nouvelle année (garder l'historique)
                    nouvel_etudiant = Etudiant(
                        utilisateur_id=etudiant.utilisateur_id,
                        matriculeId=etudiant.matriculeId,  # Même matricule
                        niveau_id=nouveau_niveau.id,
                        parcours_id=etudiant.parcours_id,
                        mention_id=etudiant.mention_id,
                        annee_universitaire=annee_arrivee,
                        est_actif=True
                    )
                    
                    db.session.add(nouvel_etudiant)
                    
                    promotions_reussies.append({
                        'id': etudiant_id,
                        'nom': etudiant.utilisateur.username,
                        'niveau_ancien': niveau_actuel,
                        'niveau_nouveau': nouveau_niveau_code
                    })
        
        # Sauvegarder les changements
        db.session.commit()
        
        return jsonify({
            'message': 'Promotion effectuée avec succès',
            'promotions': promotions_reussies,
            'redoublants': redoublants_confirmes,
            'etudiants_attente': etudiants_attente_confirmes,
            'statistiques': {
                'total_etudiants': len(etudiants_actifs),
                'promus': len(promotions_reussies),
                'redoublants': len(redoublants_confirmes),
                'en_attente': len(etudiants_attente_confirmes)
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de la promotion: {str(e)}'}), 500


@admin_bp.route('/annuler-promotion', methods=['POST'])
@jwt_required()
def annuler_promotion():
    try:
        # Vérifier que l'utilisateur est admin
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(utilisateur_id=current_user_id).first()
        
        if not admin:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        annee_depart = data.get('annee_depart')
        annee_arrivee = data.get('annee_arrivee')
        
        if not annee_depart or not annee_arrivee:
            return jsonify({'error': 'Année de départ et d\'arrivée requises'}), 400
        
        # Récupérer tous les étudiants actifs de l'année de départ
        etudiants_actifs = Etudiant.query.filter_by(
            est_actif=True,
            annee_universitaire=annee_depart
        ).all()
        
        if not etudiants_actifs:
            return jsonify({'error': 'Aucun étudiant actif trouvé pour cette année'}), 404
        
        # Créer un mapping inverse des niveaux pour l'annulation
        niveau_mapping_inverse = {
            'L2': 'L1',
            'L3': 'L2', 
            'M1': 'L3',
            'M2': 'M1',
            'DIPLOME': 'M2'  # Retour au niveau précédent
        }
        
        annulations_reussies = []
        
        for etudiant in etudiants_actifs:
            etudiant_id = etudiant.id
            
            # Annulation automatique
            niveau_actuel = etudiant.niveau_obj.code if etudiant.niveau_obj else None
            if niveau_actuel and niveau_actuel in niveau_mapping_inverse:
                ancien_niveau_code = niveau_mapping_inverse[niveau_actuel]
                
                # Trouver l'ancien niveau
                ancien_niveau = Niveau.query.filter_by(code=ancien_niveau_code).first()
                
                if ancien_niveau:
                    # Supprimer l'enregistrement de la promotion (retour à l'historique)
                    db.session.delete(etudiant)
                    
                    annulations_reussies.append({
                        'id': etudiant_id,
                        'nom': etudiant.utilisateur.username,
                        'niveau_ancien': niveau_actuel,
                        'niveau_nouveau': ancien_niveau_code
                    })
        
        # Sauvegarder les changements
        db.session.commit()
        
        return jsonify({
            'message': 'Annulation effectuée avec succès',
            'annulations': annulations_reussies,
            'statistiques': {
                'total_etudiants': len(etudiants_actifs),
                'annules': len(annulations_reussies)
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erreur lors de l\'annulation: {str(e)}'}), 500


# =================================================================
# ROUTES POUR LA GESTION DES ADMINISTRATEURS
# =================================================================

@admin_bp.route('/admins', methods=['GET'])
@jwt_required()
def get_admins():
    """Récupérer tous les administrateurs"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Récupérer tous les utilisateurs avec le rôle 'admin'
        admins = Utilisateur.query.filter_by(role='admin').all()
        
        admins_data = []
        for admin in admins:
            admin_obj = Admin.query.filter_by(utilisateur_id=admin.id).first()
            admins_data.append({
                'id': admin.id,
                'username': admin.username,
                'email': admin.email,
                'departement': admin_obj.departement if admin_obj else None,
                'est_actif': admin_obj.est_actif if admin_obj else True,
                'created_at': admin.created_at.isoformat() if admin.created_at else None
            })
        
        return jsonify({'admins': admins_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins', methods=['POST'])
@jwt_required()
def create_admin():
    """Créer un nouvel administrateur"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        
        # Validation des données
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Username, email et mot de passe sont requis'}), 400
        
        # Vérifier si l'utilisateur existe déjà
        existing_user = Utilisateur.query.filter(
            (Utilisateur.username == data['username']) | 
            (Utilisateur.email == data['email'])
        ).first()
        
        if existing_user:
            return jsonify({'error': 'Un utilisateur avec ce nom ou cet email existe déjà'}), 400
        
        # Créer l'utilisateur
        nouvel_utilisateur = Utilisateur(
            username=data['username'],
            email=data['email'],
            role='admin'
        )
        nouvel_utilisateur.set_password(data['password'])
        db.session.add(nouvel_utilisateur)
        db.session.flush()
        
        # Créer l'entrée Admin
        nouvel_admin = Admin(
            utilisateur_id=nouvel_utilisateur.id,
            departement=data.get('departement', ''),
            est_actif=True
        )
        db.session.add(nouvel_admin)
        db.session.commit()
        
        return jsonify({
            'message': 'Administrateur créé avec succès',
            'admin': {
                'id': nouvel_utilisateur.id,
                'username': nouvel_utilisateur.username,
                'email': nouvel_utilisateur.email,
                'departement': nouvel_admin.departement,
                'est_actif': nouvel_admin.est_actif
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>', methods=['PUT'])
@jwt_required()
def update_admin(admin_id):
    """Modifier un administrateur"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        utilisateur = Utilisateur.query.get_or_404(admin_id)
        
        if utilisateur.role != 'admin':
            return jsonify({'error': 'Cet utilisateur n\'est pas un administrateur'}), 400
        
        data = request.get_json()
        
        # Mise à jour des informations
        if 'username' in data:
            # Vérifier si le username est déjà pris par un autre utilisateur
            existing = Utilisateur.query.filter(
                Utilisateur.username == data['username'],
                Utilisateur.id != admin_id
            ).first()
            if existing:
                return jsonify({'error': 'Ce nom d\'utilisateur est déjà pris'}), 400
            utilisateur.username = data['username']
        
        if 'email' in data:
            # Vérifier si l'email est déjà pris par un autre utilisateur
            existing = Utilisateur.query.filter(
                Utilisateur.email == data['email'],
                Utilisateur.id != admin_id
            ).first()
            if existing:
                return jsonify({'error': 'Cet email est déjà pris'}), 400
            utilisateur.email = data['email']
        
        if 'password' in data and data['password']:
            utilisateur.set_password(data['password'])
        
        # Mise à jour de l'entrée Admin
        admin_obj = Admin.query.filter_by(utilisateur_id=admin_id).first()
        if admin_obj and 'departement' in data:
            admin_obj.departement = data['departement']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Administrateur mis à jour avec succès',
            'admin': {
                'id': utilisateur.id,
                'username': utilisateur.username,
                'email': utilisateur.email,
                'departement': admin_obj.departement if admin_obj else None,
                'est_actif': admin_obj.est_actif if admin_obj else True
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>/status', methods=['PATCH'])
@jwt_required()
def toggle_admin_status(admin_id):
    """Activer ou désactiver un administrateur"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Empêcher l'admin de se désactiver lui-même
        if current_user_id == admin_id:
            return jsonify({'error': 'Vous ne pouvez pas modifier votre propre statut'}), 400
        
        utilisateur = Utilisateur.query.get_or_404(admin_id)
        
        if utilisateur.role != 'admin':
            return jsonify({'error': 'Cet utilisateur n\'est pas un administrateur'}), 400
        
        data = request.get_json()
        if 'est_actif' not in data:
            return jsonify({'error': 'Le champ est_actif est requis'}), 400
        
        # Mise à jour du statut
        admin_obj = Admin.query.filter_by(utilisateur_id=admin_id).first()
        if admin_obj:
            admin_obj.est_actif = data['est_actif']
            db.session.commit()
            
            status_text = "activé" if admin_obj.est_actif else "désactivé"
            return jsonify({
                'message': f'Administrateur {status_text} avec succès',
                'admin': {
                    'id': utilisateur.id,
                    'username': utilisateur.username,
                    'email': utilisateur.email,
                    'departement': admin_obj.departement,
                    'est_actif': admin_obj.est_actif
                }
            }), 200
        else:
            return jsonify({'error': 'Profil administrateur non trouvé'}), 404
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>', methods=['DELETE'])
@jwt_required()
def delete_admin(admin_id):
    """Supprimer un administrateur"""
    try:
        current_user_id = get_jwt_identity()
        current_user = Utilisateur.query.get(current_user_id)
        
        # Vérifier si l'utilisateur est admin
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Empêcher l'admin de se supprimer lui-même
        if current_user_id == admin_id:
            return jsonify({'error': 'Vous ne pouvez pas supprimer votre propre compte'}), 400
        
        utilisateur = Utilisateur.query.get_or_404(admin_id)
        
        if utilisateur.role != 'admin':
            return jsonify({'error': 'Cet utilisateur n\'est pas un administrateur'}), 400
        
        # Supprimer l'entrée Admin puis l'utilisateur
        admin_obj = Admin.query.filter_by(utilisateur_id=admin_id).first()
        if admin_obj:
            db.session.delete(admin_obj)
        
        db.session.delete(utilisateur)
        db.session.commit()
        
        return jsonify({'message': 'Administrateur supprimé avec succès'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500






