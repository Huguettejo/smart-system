from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.qcm import QCM, Question, Difficulte, TypeExercice
from ..models.reponse_composee import ReponseComposee
from ..models.resultat import Resultat

qcm_bp = Blueprint("qcm", __name__)

@qcm_bp.route("/simulate", methods=["POST"])
def simulate_qcm():
    """
    Génère un QCM de simulation Python avec 5 questions.
    Accessible via l'interface enseignant ou frontend.
    """
    from flask import request
    
    try:
        data = request.get_json() or {}
        duree_minutes = data.get('duree_minutes')
        niveau_id = data.get('niveau_id')
        parcours_id = data.get('parcours_id')
        matiere_id = data.get('matiere_id')

        # 1️⃣ Nettoyer SEULEMENT le QCM de simulation existant pour éviter les doublons
        from ..models.reponse_composee import ReponseComposee
        
        # Trouver le QCM de simulation existant
        qcm_simulation = QCM.query.filter_by(titre="QCM Simulation Python").first()
        
        if qcm_simulation:
            # Supprimer seulement les données liées à ce QCM de simulation
            ReponseComposee.query.filter_by(qcm_id=qcm_simulation.id).delete()
            Resultat.query.filter_by(qcm_id=qcm_simulation.id).delete()
            
            # Supprimer les questions de ce QCM (les options sont maintenant dans la table Question)
            Question.query.filter_by(qcm_id=qcm_simulation.id).delete()
            QCM.query.filter_by(id=qcm_simulation.id).delete()
            db.session.commit()

        # 2️⃣ Créer un document temporaire pour la simulation
        from ..models.document import Document
        
        # Vérifier si un document existe déjà, sinon en créer un
        document = Document.query.first()
        if not document:
            # Utiliser un enseignant existant (ID 10 - fontaine)
            document = Document(
                titre="Document Simulation Python",
                type="txt",
                contenu="Document temporaire pour la simulation de QCM Python",
                enseignant_id=10  # ID d'un enseignant existant
            )
            db.session.add(document)
            db.session.flush()  # Pour obtenir l'ID du document

        # 3️⃣ Créer le QCM principal
        qcm = QCM(
            titre="QCM Simulation Python",
            type_exercice=TypeExercice.QCM,
            difficulte=Difficulte.MOYEN,
            duree_minutes=duree_minutes,  # Ajouter la durée si fournie
            document_id=document.id,
            est_cible=True,  # Toujours ciblé
            niveau_id=niveau_id,
            parcours_id=parcours_id,
            matiere_id=matiere_id
        )
        db.session.add(qcm)
        db.session.flush()  # nécessaire pour récupérer qcm.id

        # 4️⃣ Questions simulées au format CSV
        questions_data = [
            {
                "texte": "Quel type de donnée est mutable en Python ?",
                "reponse1": "tuple",
                "reponse2": "list",
                "reponse3": "str",
                "reponse4": "int",
                "bonne_reponse": 2  # "list" est la bonne réponse
            },
            {
                "texte": "Quelle fonction affiche du texte à l'écran ?",
                "reponse1": "echo()",
                "reponse2": "print()",
                "reponse3": "write()",
                "reponse4": "display()",
                "bonne_reponse": 2  # "print()" est la bonne réponse
            },
            {
                "texte": "Quelle boucle permet de parcourir une liste ?",
                "reponse1": "while",
                "reponse2": "repeat",
                "reponse3": "loop",
                "reponse4": "for",
                "bonne_reponse": 4  # "for" est la bonne réponse
            },
            {
                "texte": "Quel mot-clé définit une fonction en Python ?",
                "reponse1": "func",
                "reponse2": "define",
                "reponse3": "def",
                "reponse4": "lambda",
                "bonne_reponse": 3  # "def" est la bonne réponse
            },
            {
                "texte": "Quelle structure gère les exceptions en Python ?",
                "reponse1": "try/except",
                "reponse2": "catch/throw",
                "reponse3": "error/handle",
                "reponse4": "assert/except",
                "bonne_reponse": 1  # "try/except" est la bonne réponse
            },
        ]

        # 5️⃣ Insérer les questions avec le nouveau format CSV
        for q_data in questions_data:
            question = Question(
                question=q_data["texte"],
                qcm_id=qcm.id,
                reponse1=q_data["reponse1"],
                reponse2=q_data["reponse2"],
                reponse3=q_data["reponse3"],
                reponse4=q_data["reponse4"],
                bonne_reponse=q_data["bonne_reponse"]
            )
            db.session.add(question)

        # 7️⃣ Valider les modifications
        db.session.commit()

        return jsonify({"message": "QCM Python simulé créé avec succès !"}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"ERREUR dans simulate_qcm: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/enseignant/qcms", methods=["GET"])
def get_qcms_enseignant():
    """
    Retourne la liste des QCM pour le dashboard enseignant.
    """
    qcms = QCM.query.all()
    result = []
    for q in qcms:
        # Vérifier si ce QCM a déjà été corrigé
        resultat_existant = Resultat.query.filter_by(qcm_id=q.id).first()
        est_corrige = resultat_existant is not None
        
        result.append({
            "id": q.id,
            "matiere": q.titre,
            "sujet": q.titre,
            "niveau": q.difficulte.name if q.difficulte else "Moyen",
            "parcours": "Python",  # placeholder
            "nombreEtudiants": 20,  # placeholder
            "statut": "actif",  # placeholder
            "est_publie": q.est_publie,  # Ajouter le statut de publication
            "est_corrige": est_corrige,  # Ajouter le statut de correction
            "dateExamen": None,
            "duree": f"{q.duree_minutes} min" if q.duree_minutes else "60 min"
        })
    return jsonify(result)


@qcm_bp.route("/<int:qcm_id>/questions", methods=["GET"])
def get_qcm_questions(qcm_id):
    """
    Retourne toutes les questions d'un QCM avec leurs options de réponse.
    Optimisé avec eager loading pour éviter les requêtes N+1.
    """
    # Utiliser eager loading pour charger les questions en une seule requête
    qcm = QCM.query.options(db.joinedload(QCM.questions)).get_or_404(qcm_id)
    
    questions_data = []
    for question in qcm.questions:
        # Utiliser la méthode to_dict() qui gère la compatibilité
        question_data = question.to_dict()
        questions_data.append(question_data)
    
    result = {
        "qcm": {
            "id": qcm.id,
            "titre": qcm.titre,
            "difficulte": qcm.difficulte.value if qcm.difficulte else "Moyen",
            "type_exercice": qcm.type_exercice.value if qcm.type_exercice else "QCM"
        },
        "questions": questions_data
    }
    
    return jsonify(result)


@qcm_bp.route("/etudiant/qcms", methods=["GET"])
@jwt_required()
def get_qcms_etudiant():
    """
    Retourne la liste des QCM disponibles pour les étudiants (non encore passés).
    Filtre les QCM selon le niveau et parcours de l'étudiant.
    """
    from flask_jwt_extended import get_jwt_identity
    from ..models.user import Etudiant
    
    try:
        user_id = get_jwt_identity()
        
        # Récupérer les informations de l'étudiant (niveau et parcours)
        etudiant = Etudiant.query.filter_by(utilisateur_id=user_id).first()
        if not etudiant:
            return jsonify({"error": "Étudiant non trouvé"}), 404
        
        etudiant_id = etudiant.id
        
        # Récupérer les IDs des QCM déjà passés par cet étudiant
        qcms_passes = db.session.query(Resultat.qcm_id).filter_by(etudiant_id=etudiant.utilisateur_id).all()
        qcms_passes_ids = [qcm_id[0] for qcm_id in qcms_passes]
        
        # Construire la requête pour les QCM disponibles
        query = QCM.query.options(db.joinedload(QCM.questions)).filter(
            QCM.est_publie == True,
            ~QCM.id.in_(qcms_passes_ids)
        )
        
        # Filtrer selon le ciblage
        if etudiant.niveau_id and etudiant.parcours_id:
            # L'étudiant a un niveau et parcours spécifiques
            query = query.filter(
                db.or_(
                    # QCM non ciblés (visibles par tous)
                    QCM.est_cible == False,
                    # QCM ciblés pour ce niveau et parcours
                    db.and_(
                        QCM.est_cible == True,
                        QCM.niveau_id == etudiant.niveau_id,
                        QCM.parcours_id == etudiant.parcours_id
                    )
                )
            )
        elif etudiant.niveau_id:
            # L'étudiant a seulement un niveau
            query = query.filter(
                db.or_(
                    QCM.est_cible == False,
                    db.and_(
                        QCM.est_cible == True,
                        QCM.niveau_id == etudiant.niveau_id,
                        QCM.parcours_id.is_(None)  # QCM pour tous les parcours de ce niveau
                    )
                )
            )
        else:
            # L'étudiant n'a pas de niveau/parcours défini, voir seulement les QCM non ciblés
            query = query.filter(QCM.est_cible == False)
        
        qcms = query.all()
        
        result = []
        for qcm in qcms:
            qcm_data = {
                "id": qcm.id,
                "titre": qcm.titre,
                "difficulte": qcm.difficulte.value if qcm.difficulte else "Moyen",
                "type_exercice": qcm.type_exercice.value if qcm.type_exercice else "QCM",
                "duree_minutes": qcm.duree_minutes,
                "date_creation": qcm.date_creation.isoformat() if qcm.date_creation else None,
                "questions": []
            }
            
            for question in qcm.questions:
                # Utiliser la méthode to_dict() qui gère la compatibilité
                question_data = question.to_dict()
                qcm_data["questions"].append(question_data)
            
            result.append(qcm_data)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/etudiant/soumettre", methods=["POST"])
@jwt_required()
def soumettre_reponses_etudiant():
    """
    Soumet les réponses d'un étudiant pour un QCM et crée un résultat.
    """
    from flask import request
    from ..models.reponse_composee import ReponseComposee
    from flask_jwt_extended import get_jwt_identity
    
    try:
        data = request.get_json()
        
        # Validation des données
        if not data or 'qcm_id' not in data or 'reponses' not in data:
            return jsonify({"error": "Données manquantes"}), 400
        
        qcm_id = data['qcm_id']
        reponses = data['reponses']  # Format: {question_id: option_id}
        temps_execution = data.get('temps_execution', 0)
        
        # Récupérer l'utilisateur depuis le token JWT
        utilisateur_id = get_jwt_identity()
        
        # Récupérer l'étudiant correspondant
        from ..models.user import Etudiant
        etudiant = Etudiant.query.filter_by(utilisateur_id=utilisateur_id).first()
        if not etudiant:
            return jsonify({"error": "Étudiant non trouvé"}), 404
        etudiant_id = etudiant.id
        
        # Vérifier que le QCM existe
        qcm = QCM.query.get_or_404(qcm_id)
        
        # Vérifier si l'étudiant a déjà soumis ce QCM
        resultat_existant = Resultat.query.filter_by(
            etudiant_id=etudiant.utilisateur_id, 
            qcm_id=qcm_id
        ).first()
        
        if resultat_existant:
            return jsonify({
                "error": "Vous avez déjà soumis ce QCM. Vous ne pouvez le passer qu'une seule fois."
            }), 400
        
        # Calculer le score
        score = 0
        total_questions = len(qcm.questions)
        
        for question in qcm.questions:
            if str(question.id) in reponses:
                selected_option = reponses[str(question.id)]
                # Le format des réponses est maintenant "question_id_option_index" (ex: "1_2" pour question 1, option 2)
                if "_" in selected_option:
                    question_id, option_index = selected_option.split("_")
                    if int(question_id) == question.id:
                        # Vérifier si l'option sélectionnée est correcte
                        if question.is_correct_answer(int(option_index)):
                            score += 1
        
        # Créer la réponse composée (pour l'historique) - SANS CORRECTION
        reponse_composee = ReponseComposee(
            contenu=str(reponses),
            etudiant_id=etudiant_id,
            qcm_id=qcm_id,
            est_correcte=False,  # Pas encore corrigé
            statut='soumis',  # Statut initial
            temps_execution=temps_execution
        )
        
        # NE PAS créer de résultat immédiatement - attendre la correction par l'enseignant
        
        # Sauvegarder seulement la réponse composée
        db.session.add(reponse_composee)
        db.session.commit()
        
        return jsonify({
            "message": "Réponses soumises avec succès. En attente de correction par l'enseignant.",
            "statut": "soumis",
            "reponse_id": reponse_composee.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/enseignant/qcm/<int:qcm_id>/etudiants-composes", methods=["GET"])
@jwt_required()
def get_etudiants_composes(qcm_id):
    """
    Récupère la liste des étudiants qui ont composé un QCM spécifique.
    """
    from flask_jwt_extended import get_jwt_identity
    from ..models.user import Enseignant, Etudiant
    from sqlalchemy.orm import joinedload
    
    try:
        # Vérifier que l'utilisateur est un enseignant
        current_user_id = get_jwt_identity()
        enseignant = Enseignant.query.filter_by(utilisateur_id=current_user_id).first()
        
        if not enseignant:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Vérifier que le QCM existe
        qcm = QCM.query.get_or_404(qcm_id)
        
        # Récupérer les réponses composées pour ce QCM
        reponses_composees = ReponseComposee.query.options(
            joinedload(ReponseComposee.etudiant).joinedload(Etudiant.utilisateur)
        ).filter_by(qcm_id=qcm_id).all()
        
        # Grouper par étudiant et compter les soumissions
        etudiants_composes = []
        etudiants_vus = set()
        
        for reponse in reponses_composees:
            etudiant_id = reponse.etudiant_id
            if etudiant_id not in etudiants_vus:
                etudiants_vus.add(etudiant_id)
                
                # Compter les soumissions pour cet étudiant
                soumissions_count = ReponseComposee.query.filter_by(
                    etudiant_id=etudiant_id, 
                    qcm_id=qcm_id
                ).count()
                
                # Récupérer la note si l'étudiant a été corrigé
                note = None
                resultat = Resultat.query.filter_by(
                    etudiant_id=reponse.etudiant.utilisateur_id,
                    qcm_id=qcm_id
                ).first()
                
                if resultat:
                    note = resultat.note
                
                etudiants_composes.append({
                    'etudiant_id': etudiant_id,
                    'matricule': reponse.etudiant.matriculeId,
                    'nom': reponse.etudiant.utilisateur.username,
                    'statut': reponse.statut,
                    'date_soumission': reponse.date_soumission.isoformat(),
                    'soumissions_count': soumissions_count,
                    'note': note
                })
        
        return jsonify({
            'qcm': {
                'id': qcm.id,
                'titre': qcm.titre,
                'matiere': qcm.matiere.nom if qcm.matiere else 'N/A'
            },
            'etudiants_composes': etudiants_composes,
            'total_etudiants': len(etudiants_composes)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/enseignant/qcm/<int:qcm_id>/corriger", methods=["POST"])
@jwt_required()
def corriger_qcm(qcm_id):
    """
    Corrige automatiquement toutes les réponses soumises pour un QCM.
    """
    from flask_jwt_extended import get_jwt_identity
    from ..models.user import Enseignant, Etudiant
    from sqlalchemy.orm import joinedload
    
    try:
        # Vérifier que l'utilisateur est un enseignant
        current_user_id = get_jwt_identity()
        enseignant = Enseignant.query.filter_by(utilisateur_id=current_user_id).first()
        
        if not enseignant:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Vérifier que le QCM existe
        qcm = QCM.query.get_or_404(qcm_id)
        
        # Vérifier s'il existe déjà des résultats pour ce QCM (empêcher la correction multiple)
        resultats_existants = Resultat.query.filter_by(qcm_id=qcm_id).first()
        if resultats_existants:
            return jsonify({"error": "Ce QCM a déjà été corrigé. Impossible de le corriger à nouveau."}), 400
        
        # Récupérer toutes les réponses soumises pour ce QCM
        reponses_composees = ReponseComposee.query.options(
            joinedload(ReponseComposee.etudiant).joinedload(Etudiant.utilisateur)
        ).filter_by(qcm_id=qcm_id, statut='soumis').all()
        
        if not reponses_composees:
            return jsonify({"error": "Aucune réponse en attente de correction"}), 404
        
        corrections_reussies = []
        
        for reponse in reponses_composees:
            # Marquer comme en cours de correction
            reponse.statut = 'en_correction'
            db.session.add(reponse)
            
            # Parser les réponses de l'étudiant
            import json
            try:
                reponses_etudiant = json.loads(reponse.contenu)
            except:
                reponses_etudiant = eval(reponse.contenu)  # Fallback pour l'ancien format
            
            # Calculer le score
            score = 0
            total_questions = len(qcm.questions)
            
            for question in qcm.questions:
                if str(question.id) in reponses_etudiant:
                    selected_option = reponses_etudiant[str(question.id)]
                    if "_" in selected_option:
                        question_id, option_index = selected_option.split("_")
                        if int(question_id) == question.id:
                            if question.is_correct_answer(int(option_index)):
                                score += 1
            
            # Créer le résultat
            nombre_incorrectes = total_questions - score
            pourcentage = round((score / total_questions) * 100, 2)
            note = round((pourcentage / 100) * 20, 2)
            
            resultat = Resultat(
                note=note,
                nombre_correctes=score,
                nombre_incorrectes=nombre_incorrectes,
                pourcentage=pourcentage,
                temps_total=reponse.temps_execution,
                etudiant_id=reponse.etudiant.id,  # Resultat.etudiant_id pointe vers etudiant.id
                qcm_id=qcm_id,
                evaluation_id=None
            )
            
            # Générer le feedback automatiquement
            resultat.generer_feedback()
            
            # Marquer la réponse comme corrigée
            reponse.est_correcte = (score == total_questions)
            reponse.statut = 'corrigé'
            
            db.session.add(resultat)
            db.session.add(reponse)
            
            corrections_reussies.append({
                'etudiant_id': reponse.etudiant_id,
                'matricule': reponse.etudiant.matriculeId,
                'nom': reponse.etudiant.utilisateur.username,
                'note': note,
                'pourcentage': pourcentage,
                'score': f"{score}/{total_questions}"
            })
        
        # Sauvegarder toutes les corrections
        db.session.commit()
        
        return jsonify({
            'message': f'Correction terminée pour {len(corrections_reussies)} étudiants',
            'corrections': corrections_reussies,
            'statistiques': {
                'total_corriges': len(corrections_reussies),
                'moyenne': round(sum(c['note'] for c in corrections_reussies) / len(corrections_reussies), 2) if corrections_reussies else 0
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/etudiant/resultats", methods=["GET"])
@jwt_required()
def get_resultats_etudiant():
    """
    Récupère tous les résultats d'un étudiant (corrigés) et les soumissions en attente.
    """
    from ..models.user import Etudiant
    from flask_jwt_extended import get_jwt_identity
    
    try:
        utilisateur_id = get_jwt_identity()
        
        # Récupérer l'étudiant
        etudiant = Etudiant.query.filter_by(utilisateur_id=utilisateur_id).first()
        if not etudiant:
            return jsonify({"error": "Étudiant non trouvé"}), 404
        
        # Récupérer tous les résultats corrigés de l'étudiant
        resultats = Resultat.query.filter_by(etudiant_id=etudiant.id).all()
        
        resultats_data = []
        for resultat in resultats:
            resultats_data.append({
                "id": resultat.id,
                "note": resultat.note,
                "pourcentage": resultat.pourcentage,
                "feedback": resultat.feedback,
                "date_correction": resultat.date_correction.isoformat(),
                "nombre_correctes": resultat.nombre_correctes,
                "nombre_incorrectes": resultat.nombre_incorrectes,
                "temps_total": resultat.temps_total,
                "qcm_id": resultat.qcm_id,
                "qcm_titre": resultat.qcm.titre if resultat.qcm else "QCM supprimé",
                "evaluation_id": resultat.evaluation_id,
                "statut": "corrigé"
            })
        
        # Récupérer les soumissions en attente de correction
        reponses_attente = ReponseComposee.query.filter_by(
            etudiant_id=etudiant.id,
            statut='soumis'
        ).all()
        
        for reponse in reponses_attente:
            resultats_data.append({
                "id": reponse.id,
                "note": 0,
                "pourcentage": 0,
                "feedback": "En attente de correction par l'enseignant",
                "date_correction": reponse.date_soumission.isoformat(),
                "nombre_correctes": 0,
                "nombre_incorrectes": 0,
                "temps_total": reponse.temps_execution,
                "qcm_id": reponse.qcm_id,
                "qcm_titre": reponse.qcm.titre if reponse.qcm else "QCM supprimé",
                "evaluation_id": reponse.evaluation_id,
                "statut": "soumis"
            })
        
        return jsonify(resultats_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/etudiant/profil", methods=["GET"])
@jwt_required()
def get_profil_etudiant():
    """
    Récupère le profil complet de l'étudiant connecté.
    """
    from ..models.user import Etudiant
    from flask_jwt_extended import get_jwt_identity
    from sqlalchemy.orm import joinedload
    
    try:
        # Récupérer l'utilisateur depuis le token JWT
        user_id = get_jwt_identity()
        
        # Récupérer l'étudiant avec toutes ses relations
        etudiant = Etudiant.query.options(
            joinedload(Etudiant.utilisateur),
            joinedload(Etudiant.niveau_obj),
            joinedload(Etudiant.parcours_obj),
            joinedload(Etudiant.mention_obj)
        ).filter_by(utilisateur_id=user_id).first()
        
        if not etudiant:
            return jsonify({"error": "Étudiant non trouvé"}), 404
        
        # Construire les données du profil
        profil_data = {
            'nom': etudiant.utilisateur.username if etudiant.utilisateur else "",
            'matricule': etudiant.matriculeId,
            'email': etudiant.utilisateur.email if etudiant.utilisateur else "",
            'mention': etudiant.mention_obj.nom if etudiant.mention_obj else "Non renseignée",
            'parcours': etudiant.parcours_obj.code if etudiant.parcours_obj else "Non renseigné",
            'niveau': etudiant.niveau_obj.nom if etudiant.niveau_obj else "Non renseigné",
            'annee_universitaire': etudiant.annee_universitaire,
            'telephone': "",  # À ajouter au modèle si nécessaire
            'notes': []  # Sera récupéré depuis les résultats
        }
        
        # Récupérer les notes/résultats de l'étudiant
        from ..models.matiere import Matiere
        
        resultats = db.session.query(Resultat).join(QCM).join(Matiere).filter(
            Resultat.etudiant_id == etudiant.id
        ).all()
        
        # Grouper les notes par matière et calculer la moyenne
        notes_par_matiere = {}
        for resultat in resultats:
            matiere_nom = resultat.qcm.matiere.nom if resultat.qcm and resultat.qcm.matiere else "Matière inconnue"
            if matiere_nom not in notes_par_matiere:
                notes_par_matiere[matiere_nom] = []
            notes_par_matiere[matiere_nom].append(resultat.note)
        
        # Créer la liste des notes avec moyennes
        notes_list = []
        for matiere, notes in notes_par_matiere.items():
            moyenne = sum(notes) / len(notes) if notes else 0
            notes_list.append({
                'matiere': matiere,
                'note': round(moyenne, 2)
            })
        
        profil_data['notes'] = notes_list
        
        return jsonify(profil_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/create", methods=["POST"])
@jwt_required()
def create_qcm():
    """
    Crée un nouveau QCM avec les paramètres définis par l'enseignant.
    Supporte le ciblage par niveau et parcours.
    """
    from flask import request
    from flask_jwt_extended import get_jwt_identity
    
    try:
        data = request.get_json()
        
        # Validation des données
        if not data or 'titre' not in data:
            return jsonify({"error": "Le titre est requis"}), 400
        
        # Validation du ciblage obligatoire
        if not data.get('niveau_id') or not data.get('parcours_id'):
            return jsonify({"error": "Le ciblage est obligatoire. Veuillez sélectionner un niveau et un parcours."}), 400
        
        # Validation de la matière obligatoire
        if not data.get('matiere_id'):
            return jsonify({"error": "La matière est obligatoire. Veuillez sélectionner une matière."}), 400
        
        # Récupérer l'enseignant depuis le token JWT
        enseignant_id = get_jwt_identity()
        
        # Ciblage obligatoire
        est_cible = True  # Toujours activé
        niveau_id = data.get('niveau_id')
        parcours_id = data.get('parcours_id')
        matiere_id = data.get('matiere_id')
        
        # Solution temporaire : utiliser un document existant ou en créer un
        from ..models.document import Document
        
        # Chercher un document existant ou en créer un
        document = Document.query.first()
        if not document:
            document = Document(
                titre="Document par défaut",
                type="default",
                contenu="Document par défaut pour les QCM",
                enseignant_id=enseignant_id
            )
            db.session.add(document)
            db.session.flush()
        
        # Créer le QCM avec le document
        qcm = QCM(
            titre=data['titre'],
            type_exercice=TypeExercice(data.get('type_exercice', 'QCM')),
            difficulte=Difficulte(data.get('difficulte', 'Moyen')),
            duree_minutes=data.get('duree_minutes'),  # Peut être None
            document_id=document.id,  # Utiliser un document existant
            # Champs de ciblage
            est_cible=est_cible,
            niveau_id=niveau_id,
            parcours_id=parcours_id,
            matiere_id=matiere_id
        )
        
        db.session.add(qcm)
        db.session.commit()
        
        return jsonify({
            "message": "QCM créé avec succès",
            "qcm_id": qcm.id,
            "qcm": qcm.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/<int:qcm_id>/questions", methods=["POST"])
@jwt_required()
def create_question(qcm_id):
    """
    Crée une nouvelle question pour un QCM avec le format CSV.
    Format attendu:
    {
        "texte": "Quelle est la capitale de la France ?",
        "reponse1": "Londres",
        "reponse2": "Paris", 
        "reponse3": "Berlin",
        "reponse4": "Madrid",
        "bonne_reponse": 2  // ou "B" pour Paris
    }
    """
    from flask import request
    from flask_jwt_extended import get_jwt_identity
    
    try:
        data = request.get_json()
        
        # Validation des données
        required_fields = ['texte', 'reponse1', 'reponse2', 'reponse3', 'reponse4', 'bonne_reponse']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Le champ '{field}' est requis"}), 400
        
        # Vérifier que le QCM existe
        qcm = QCM.query.get_or_404(qcm_id)
        
        # Gérer la bonne réponse (peut être un nombre ou une lettre)
        bonne_reponse = data['bonne_reponse']
        if isinstance(bonne_reponse, str):
            # Convertir la lettre en nombre (A=1, B=2, C=3, D=4)
            lettres = {"A": 1, "B": 2, "C": 3, "D": 4}
            bonne_reponse = lettres.get(bonne_reponse.upper())
            if not bonne_reponse:
                return jsonify({"error": "La bonne réponse doit être A, B, C, ou D"}), 400
        
        # Créer la question
        question = Question(
            question=data['texte'],
            qcm_id=qcm_id,
            reponse1=data['reponse1'],
            reponse2=data['reponse2'],
            reponse3=data['reponse3'],
            reponse4=data['reponse4'],
            bonne_reponse=bonne_reponse
        )
        
        db.session.add(question)
        db.session.commit()
        
        return jsonify({
            "message": "Question créée avec succès",
            "question": question.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/<int:qcm_id>/export-csv", methods=["GET"])
@jwt_required()
def export_qcm_csv(qcm_id):
    """
    Exporte un QCM au format CSV avec les colonnes: Question, Réponse1, Réponse2, Réponse3, Réponse4, BonneRéponse
    """
    from flask_jwt_extended import get_jwt_identity
    import csv
    import io
    
    try:
        # Vérifier que le QCM existe
        qcm = QCM.query.get_or_404(qcm_id)
        
        # Créer le contenu CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # En-têtes
        writer.writerow(['Question', 'Réponse1', 'Réponse2', 'Réponse3', 'Réponse4', 'BonneRéponse'])
        
        # Données des questions
        for question in qcm.questions:
            lettres = ["A", "B", "C", "D"]
            bonne_reponse_lettre = lettres[question.bonne_reponse - 1] if question.bonne_reponse else ""
            
            writer.writerow([
                question.texte,
                question.reponse1 or "",
                question.reponse2 or "",
                question.reponse3 or "",
                question.reponse4 or "",
                bonne_reponse_lettre
            ])
        
        csv_content = output.getvalue()
        output.close()
        
        return jsonify({
            "csv_content": csv_content,
            "filename": f"qcm_{qcm.titre.replace(' ', '_')}.csv",
            "qcm_id": qcm.id,
            "nombre_questions": len(qcm.questions)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/niveaux-parcours", methods=["GET"])
@jwt_required()
def get_niveaux_parcours():
    """
    Retourne la liste des niveaux et parcours disponibles pour le ciblage des QCM.
    """
    from ..models.niveau_parcours import Niveau, Parcours
    
    try:
        niveaux = Niveau.query.filter_by(est_actif=True).order_by(Niveau.ordre).all()
        parcours = Parcours.query.filter_by(est_actif=True).order_by(Parcours.nom).all()
        
        return jsonify({
            "niveaux": [n.to_dict() for n in niveaux],
            "parcours": [p.to_dict() for p in parcours]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@qcm_bp.route("/enseignant/matieres", methods=["GET"])
@jwt_required()
def get_matieres_enseignant():
    """
    Retourne la liste des matières enseignées par l'enseignant connecté avec leurs assignations complètes.
    """
    from flask_jwt_extended import get_jwt_identity
    from ..models.user import Enseignant
    
    try:
        utilisateur_id = get_jwt_identity()
        
        # Trouver l'enseignant correspondant à cet utilisateur
        enseignant = Enseignant.query.filter_by(utilisateur_id=utilisateur_id).first()
        if not enseignant:
            return jsonify({"error": "Enseignant non trouvé"}), 404
        
        from ..models.matiere import MatiereEnseignantNiveauParcours
        
        # Récupérer les assignations complètes pour cet enseignant
        assignations = MatiereEnseignantNiveauParcours.query.filter_by(
            enseignant_id=enseignant.id,
            est_actif=True
        ).all()
        
        # Grouper les assignations par matière
        matieres_dict = {}
        for assignation in assignations:
            if assignation.matiere and assignation.matiere.est_actif:
                matiere_id = assignation.matiere.id
                if matiere_id not in matieres_dict:
                    matieres_dict[matiere_id] = {
                        'matiere': assignation.matiere,
                        'assignations': []
                    }
                matieres_dict[matiere_id]['assignations'].append(assignation)
        
        # Construire la réponse avec les assignations
        result = []
        for matiere_data in matieres_dict.values():
            matiere = matiere_data['matiere']
            assignations = matiere_data['assignations']
            
            # Extraire les niveaux et parcours uniques
            niveaux = set()
            parcours = set()
            for assignation in assignations:
                if assignation.niveau:
                    niveaux.add(assignation.niveau)
                if assignation.parcours:
                    parcours.add(assignation.parcours)
            
            matiere_dict = matiere.to_dict()
            matiere_dict['assignations'] = [a.to_dict() for a in assignations]
            matiere_dict['niveaux'] = [n.to_dict() for n in niveaux]
            matiere_dict['parcours'] = [p.to_dict() for p in parcours]
            
            result.append(matiere_dict)
        
        return jsonify({
            'matieres': result
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/generate-ai", methods=["POST"])
@jwt_required()
def generate_qcm_ai():
    """
    Génère automatiquement un QCM avec Hugging Face basé sur un sujet donné.
    """
    from flask import request
    from flask_jwt_extended import get_jwt_identity
    from ..services.hugging_face_service import HuggingFaceService
    from ..models.user import Enseignant
    from ..models.document import Document
    from ..models.matiere import Matiere
    from ..models.niveau_parcours import Niveau, Parcours
    
    try:
        data = request.get_json()
        
        # Validation des données
        required_fields = ['sujet', 'matiere_id', 'niveau_id', 'parcours_id']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Le champ '{field}' est requis"}), 400
        
        # Récupérer l'enseignant depuis le token JWT
        enseignant_id = get_jwt_identity()
        enseignant = Enseignant.query.filter_by(utilisateur_id=enseignant_id).first()
        if not enseignant:
            return jsonify({"error": "Enseignant non trouvé"}), 404
        
        # Récupérer les informations de la matière, niveau et parcours
        matiere = Matiere.query.get(data['matiere_id'])
        niveau = Niveau.query.get(data['niveau_id'])
        parcours = Parcours.query.get(data['parcours_id'])
        
        if not matiere or not niveau or not parcours:
            return jsonify({"error": "Matière, niveau ou parcours non trouvé"}), 404
        
        # Paramètres optionnels
        nombre_questions = data.get('nombre_questions', 5)
        duree_minutes = data.get('duree_minutes', 60)
        difficulte = data.get('difficulte', 'Moyen')
        contexte = data.get('contexte')  # Prompt détaillé optionnel
        
        # Générer le QCM avec Hugging Face
        hf_service = HuggingFaceService()
        result = hf_service.generer_qcm_complet(
            sujet=data['sujet'],
            matiere=matiere.nom,
            niveau=niveau.code,
            nombre_questions=nombre_questions,
            contexte=contexte  # Nouveau paramètre
        )
        
        if not result['success']:
            # Si c'est une erreur de token, utiliser les questions de test
            if "Invalid credentials" in result.get('error', ''):
                current_app.logger.warning("Token Hugging Face invalide, utilisation des questions de test")
                # Utiliser les questions de test
                from ..services.hugging_face_service import HuggingFaceService
                hf_service = HuggingFaceService()
                result = hf_service._generer_questions_test(
                    data['sujet'], 
                    matiere.nom, 
                    niveau.code, 
                    nombre_questions
                )
            else:
                return jsonify({"error": f"Erreur génération IA: {result['error']}"}), 500
        
        # Solution temporaire : utiliser un document existant ou en créer un
        from ..models.document import Document
        
        # Chercher un document existant ou en créer un
        document = Document.query.first()
        if not document:
            document = Document(
                titre="Document par défaut",
                type="default",
                contenu="Document par défaut pour les QCM",
                enseignant_id=enseignant.id
            )
            db.session.add(document)
            db.session.flush()
        
        # Générer un titre court et intelligent pour le QCM
        sujet_brut = data['sujet']
        if len(sujet_brut) > 100:
            # Si le sujet est un long prompt, extraire l'essentiel
            import re
            
            # Essayer d'extraire le thème entre guillemets
            match = re.search(r'["\']([^"\']{5,100})["\']', sujet_brut)
            if match:
                sujet_court = match.group(1)
            elif "sur le thème" in sujet_brut.lower():
                # Extraire après "sur le thème"
                match = re.search(r'sur le thème[:\s]*["\']?([^"\'.\n]{5,100})', sujet_brut, re.IGNORECASE)
                sujet_court = match.group(1) if match else sujet_brut[:80]
            elif "sur" in sujet_brut.lower() and "qcm" in sujet_brut.lower():
                # Extraire après "sur"
                match = re.search(r'sur[:\s]+([^.\n]{5,80})', sujet_brut, re.IGNORECASE)
                sujet_court = match.group(1) if match else sujet_brut[:80]
            else:
                # Prendre les premiers mots
                sujet_court = sujet_brut.split('.')[0][:80]
        else:
            sujet_court = sujet_brut
        
        # Créer le titre final (max 255 caractères)
        titre_qcm = f"QCM IA - {sujet_court.strip()}"[:255]
        
        # Créer le QCM avec le document
        qcm = QCM(
            titre=titre_qcm,
            type_exercice=TypeExercice.QCM,
            difficulte=Difficulte(difficulte),
            duree_minutes=duree_minutes,
            document_id=document.id,
            est_cible=True,
            niveau_id=data['niveau_id'],
            parcours_id=data['parcours_id'],
            matiere_id=data['matiere_id']
        )
        db.session.add(qcm)
        db.session.flush()
        
        # Ajouter les questions générées
        current_app.logger.info(f"🔍 Résultat génération: {result}")
        current_app.logger.info(f"🔍 Nombre de questions à ajouter: {len(result.get('questions', []))}")
        
        questions_ajoutees = 0
        for i, question_data in enumerate(result.get('questions', [])):
            current_app.logger.info(f"🔍 Question {i+1}: {question_data}")
            
            question = Question(
                question=question_data['texte'],
                qcm_id=qcm.id,
                reponse1=question_data['reponse1'],
                reponse2=question_data['reponse2'],
                reponse3=question_data['reponse3'],
                reponse4=question_data['reponse4'],
                bonne_reponse=question_data['bonne_reponse']
            )
            db.session.add(question)
            questions_ajoutees += 1
        
        current_app.logger.info(f"🔍 Questions ajoutées à la session: {questions_ajoutees}")
        db.session.commit()
        current_app.logger.info(f"🔍 Commit réussi, QCM ID: {qcm.id}")
        
        # Vérifier que les questions sont bien sauvegardées
        qcm_verification = QCM.query.options(db.joinedload(QCM.questions)).get(qcm.id)
        questions_verifiees = len(qcm_verification.questions) if qcm_verification else 0
        current_app.logger.info(f"🔍 Vérification: QCM {qcm.id} a {questions_verifiees} questions en base")
        
        return jsonify({
            "message": f"QCM généré avec succès avec {questions_ajoutees} questions",
            "qcm_id": qcm.id,
            "qcm": qcm.to_dict(),
            "questions_generes": questions_ajoutees,
            "questions_verifiees": questions_verifiees,
            "sujet": data['sujet'],
            "matiere": matiere.nom,
            "niveau": niveau.code,
            "parcours": parcours.code
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur génération QCM IA: {str(e)}")
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/<int:qcm_id>/publier", methods=["POST"])
@jwt_required()
def publier_qcm(qcm_id):
    """
    Publie ou dépublie un QCM (le rend visible ou invisible pour les étudiants).
    """
    from flask import request
    from flask_jwt_extended import get_jwt_identity
    
    try:
        data = request.get_json() or {}
        est_publie = data.get('est_publie', True)
        
        # Récupérer l'enseignant depuis le token JWT
        enseignant_id = get_jwt_identity()
        
        # Vérifier que le QCM existe
        qcm = QCM.query.get_or_404(qcm_id)
        
        # Mettre à jour le statut de publication
        qcm.est_publie = est_publie
        db.session.commit()
        
        action = "publié" if est_publie else "dépublié"
        return jsonify({
            "message": f"QCM {action} avec succès",
            "qcm_id": qcm.id,
            "est_publie": qcm.est_publie
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@qcm_bp.route("/<int:qcm_id>", methods=["DELETE"])
@jwt_required()
def supprimer_qcm(qcm_id):
    """
    Supprime un QCM et toutes ses données associées.
    Accessible uniquement par l'enseignant qui a créé le QCM ou un admin.
    """
    from flask_jwt_extended import get_jwt_identity
    from ..models.user import Utilisateur, Enseignant
    from ..models.matiere import AssignationMatiereEnseignant
    
    try:
        utilisateur_id = get_jwt_identity()
        
        # Récupérer l'utilisateur actuel
        user = Utilisateur.query.get(utilisateur_id)
        if not user:
            return jsonify({"error": "Utilisateur non trouvé"}), 404
        
        # Vérifier que le QCM existe
        qcm = QCM.query.get_or_404(qcm_id)
        
        # Vérifier les permissions
        if user.role == 'admin':
            # Les admins peuvent tout supprimer
            current_app.logger.info(f"✅ Admin {user.id} supprime le QCM {qcm_id}")
            pass
        elif user.role == 'enseignant':
            enseignant = Enseignant.query.filter_by(utilisateur_id=user.id).first()
            if not enseignant:
                return jsonify({"error": "Enseignant non trouvé"}), 404
            
            current_app.logger.info(f"🔍 Vérification permissions pour enseignant {enseignant.id} sur QCM {qcm_id}")
            current_app.logger.info(f"   QCM matiere_id: {qcm.matiere_id}, document_id: {qcm.document_id}")
            
            # Un enseignant peut supprimer un QCM si :
            # PRIORITE 1 : Il enseigne la matière du QCM (cas le plus courant pour les QCM IA)
            # PRIORITE 2 : Il a créé le QCM (via le document)
            # PRIORITE 3 : QCM sans document ni matière (QCM test/simulation)
            
            a_acces = False
            
            # PRIORITE 1 : Vérifier via la matière assignée (QCM IA)
            if qcm.matiere_id:
                assignation = AssignationMatiereEnseignant.query.filter_by(
                    enseignant_id=enseignant.id,
                    matiere_id=qcm.matiere_id
                ).first()
                if assignation:
                    a_acces = True
                    current_app.logger.info(f"✅ Accès accordé via matière {qcm.matiere_id} pour enseignant {enseignant.id}")
                else:
                    current_app.logger.warning(f"❌ Pas d'assignation trouvée pour matière {qcm.matiere_id} et enseignant {enseignant.id}")
            
            # PRIORITE 2 : Vérifier via le document si la matière ne donne pas accès
            if not a_acces and qcm.document and qcm.document.enseignant_id == enseignant.id:
                a_acces = True
                current_app.logger.info(f"✅ Accès accordé via document pour enseignant {enseignant.id}")
            
            # PRIORITE 3 : QCM sans document ni matière (probablement un test)
            if not a_acces and not qcm.document_id and not qcm.matiere_id:
                a_acces = True
                current_app.logger.info(f"✅ Accès accordé (QCM test) pour enseignant {enseignant.id}")
            
            # Si l'enseignant n'a toujours pas accès, refuser
            if not a_acces:
                current_app.logger.error(f"🚫 Accès refusé pour enseignant {enseignant.id} - QCM {qcm_id}")
                current_app.logger.error(f"   Matiere ID: {qcm.matiere_id}, Document ID: {qcm.document_id}")
                return jsonify({
                    "error": "Vous n'avez pas la permission de supprimer ce QCM. Vous devez être assigné à la matière du QCM."
                }), 403
        else:
            # Ni enseignant ni admin
            return jsonify({
                "error": "Seul un enseignant ou un administrateur peut supprimer un QCM"
            }), 403
        
        # Supprimer toutes les données associées au QCM
        try:
            # 1. Supprimer les réponses composées des étudiants
            ReponseComposee.query.filter_by(qcm_id=qcm_id).delete()
            
            # 2. Supprimer les résultats des étudiants
            Resultat.query.filter_by(qcm_id=qcm_id).delete()
            
            # 3. Supprimer les questions du QCM (les options sont dans la table Question maintenant)
            Question.query.filter_by(qcm_id=qcm_id).delete()
            
            # 4. Supprimer le QCM lui-même
            db.session.delete(qcm)
            
            db.session.commit()
            
            current_app.logger.info(f"QCM {qcm_id} supprimé avec succès par l'utilisateur {user.username}")
            
            return jsonify({
                "message": "QCM supprimé avec succès",
                "qcm_id": qcm_id
            }), 200
            
        except Exception as delete_error:
            db.session.rollback()
            current_app.logger.error(f"Erreur lors de la suppression du QCM {qcm_id}: {str(delete_error)}")
            raise
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur suppression QCM: {str(e)}")
        return jsonify({"error": str(e)}), 500

