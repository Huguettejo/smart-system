"""
Service de correction automatique des évaluations utilisant l'IA de Hugging Face.

Ce service gère:
- La correction automatique des QCM
- La correction sémantique des réponses ouvertes
- La génération de feedbacks personnalisés
- L'analyse des performances et recommandations
"""

from .hugging_face_service import HuggingFaceService
from ..models.qcm import QCM, Question
from ..models.reponse_composee import ReponseComposee, Evaluation
from ..models.resultat import Resultat
from ..models.user import Etudiant
from ..extensions import db
from typing import List, Dict, Any
import statistics
from flask import current_app


class CorrectionService:
    """Service intelligent de correction automatique"""
    
    def __init__(self):
        self.hf_service = HuggingFaceService()

    # ============================================================================
    # CORRECTION D'UNE ÉVALUATION COMPLÈTE
    # ============================================================================
    
    def corriger_evaluation(self, evaluation: Evaluation) -> Dict[str, Any]:
        """
        Corrige automatiquement une évaluation complète (QCM + questions ouvertes).
        
        Args:
            evaluation: L'évaluation à corriger
            
        Returns:
            Dict avec le résultat et le rapport détaillé
        """
        current_app.logger.info(f"📝 Correction de l'évaluation ID {evaluation.id}...")
        
        resultats = []

        for reponse in evaluation.reponses:
            try:
                if isinstance(reponse, QCM):
                    # Correction automatique des QCM (comparaison simple)
                    est_correcte = (reponse.reponse_etudiant == reponse.reponse_correcte)
                    feedback = "✅ Bonne réponse !" if est_correcte else "❌ Réponse incorrecte."
                    score = 100 if est_correcte else 0
                    
                elif isinstance(reponse, ReponseComposee):
                    # Correction sémantique pour les réponses ouvertes
                    correction = self.hf_service.corriger_reponse_ouverte(
                        question=reponse.question or "Question",
                        reponse_etudiant=reponse.reponse_etudiant or reponse.contenu,
                        reponse_attendue=reponse.reponse_attendue or ""
                    )
                    est_correcte = correction["est_correcte"]
                    feedback = correction["feedback"]
                    score = correction["score"]
                else:
                    continue

                reponse.est_correcte = est_correcte
                db.session.add(reponse)

                resultats.append({
                    "question": getattr(reponse, "question", None) or getattr(reponse, "texte", ""),
                    "reponse_etudiant": getattr(reponse, "reponse_etudiant", None) or getattr(reponse, "contenu", ""),
                    "reponse_correcte": getattr(reponse, "reponse_correcte", None) or getattr(reponse, "reponse_attendue", ""),
                    "est_correcte": est_correcte,
                    "feedback": feedback,
                    "score": score
                })
                
            except Exception as e:
                current_app.logger.error(f"❌ Erreur correction réponse: {e}")
                continue

        # Commit unique
        db.session.commit()

        # Calcul des notes
        total_questions = len(resultats)
        bonnes_reponses = sum(1 for r in resultats if r["est_correcte"])
        score_total = sum(r.get("score", 0) for r in resultats)
        score_moyen = score_total / total_questions if total_questions else 0
        
        note_sur_20 = (score_moyen / 100) * 20
        pourcentage = score_moyen

        # Enregistrement dans Resultat
        resultat = Resultat.query.filter_by(
            etudiant_id=evaluation.etudiant_id,
            evaluation_id=evaluation.id
        ).first()

        if resultat:
            resultat.note = note_sur_20
            resultat.pourcentage = pourcentage
            resultat.nombre_correctes = bonnes_reponses
            resultat.nombre_incorrectes = total_questions - bonnes_reponses
        else:
            resultat = Resultat(
                etudiant_id=evaluation.etudiant_id,
                evaluation_id=evaluation.id,
                note=note_sur_20,
                pourcentage=pourcentage,
                nombre_correctes=bonnes_reponses,
                nombre_incorrectes=total_questions - bonnes_reponses
            )
            db.session.add(resultat)

        # Générer des recommandations personnalisées
        recommandations = self.hf_service.generer_recommandations(resultats)
        resultat.feedback = self._formater_feedback_complet(
            note_sur_20,
            pourcentage,
            recommandations
        )
        
        db.session.commit()

        # Rapport détaillé
        rapport = {
            "score_sur_20": round(note_sur_20, 2),
            "pourcentage": round(pourcentage, 2),
            "total_questions": total_questions,
            "bonnes_reponses": bonnes_reponses,
            "mauvaises_reponses": total_questions - bonnes_reponses,
            "details": resultats,
            "recommandations": recommandations
        }

        current_app.logger.info(f"✅ Correction terminée - Note: {note_sur_20:.2f}/20")

        return {
            "resultat": resultat.to_dict(),
            "rapport": rapport
        }

    # ============================================================================
    # CORRECTION DES QCM (MÉTHODE SPÉCIFIQUE)
    # ============================================================================
    
    def corriger_qcm(
        self, 
        qcm_id: int, 
        etudiant_id: int, 
        reponses_etudiant: Dict[int, int]
    ) -> Dict[str, Any]:
        """
        Corrige un QCM soumis par un étudiant.
        
        Args:
            qcm_id: ID du QCM
            etudiant_id: ID de l'étudiant
            reponses_etudiant: Dict {question_id: reponse_choisie}
            
        Returns:
            Dict avec le score et les détails
        """
        current_app.logger.info(f"📝 Correction QCM {qcm_id} pour étudiant {etudiant_id}...")
        
        try:
            # Récupérer le QCM et ses questions
            qcm = QCM.query.get(qcm_id)
            if not qcm:
                return {"error": "QCM non trouvé", "success": False}
            
            score = 0
            total_questions = len(qcm.questions)
            details_corrections = []
            
            for question in qcm.questions:
                reponse_etudiant = reponses_etudiant.get(question.id)
                est_correcte = (reponse_etudiant == question.bonne_reponse)
                
                if est_correcte:
                    score += 1
                
                details_corrections.append({
                    "question_id": question.id,
                    "question": question.question,
                    "reponse_etudiant": reponse_etudiant,
                    "bonne_reponse": question.bonne_reponse,
                    "est_correcte": est_correcte
                })
            
            pourcentage = (score / total_questions * 100) if total_questions > 0 else 0
            note_sur_20 = (pourcentage / 100) * 20
            
            current_app.logger.info(f"✅ QCM corrigé - Score: {score}/{total_questions} ({pourcentage:.1f}%)")
            
            return {
                "success": True,
                "score": score,
                "total_questions": total_questions,
                "pourcentage": round(pourcentage, 2),
                "note_sur_20": round(note_sur_20, 2),
                "details": details_corrections
            }
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur correction QCM: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    # ============================================================================
    # CORRECTION DE RÉPONSE OUVERTE (MÉTHODE SPÉCIFIQUE)
    # ============================================================================
    
    def corriger_reponse_ouverte(
        self,
        question_id: int,
        reponse_etudiant: str,
        reponse_attendue: str,
        mots_cles: List[str] = None
    ) -> Dict[str, Any]:
        """
        Corrige une réponse ouverte avec analyse sémantique.
        
        Args:
            question_id: ID de la question
            reponse_etudiant: Texte de la réponse de l'étudiant
            reponse_attendue: Texte de la réponse correcte
            mots_cles: Liste de mots-clés essentiels
            
        Returns:
            Dict avec score, feedback et détails
        """
        return self.hf_service.corriger_reponse_ouverte(
            question="Question",  # Peut être enrichi avec la vraie question
            reponse_etudiant=reponse_etudiant,
            reponse_attendue=reponse_attendue,
            mots_cles=mots_cles
        )

    # ============================================================================
    # ANALYSE GLOBALE DE LA CLASSE
    # ============================================================================
    
    def analyser_performance_classe(self, evaluations: List[Evaluation]) -> Dict[str, Any]:
        """
        Analyse les performances globales d'une classe sur une évaluation.
        
        Args:
            evaluations: Liste des évaluations de la classe
            
        Returns:
            Dict avec statistiques et recommandations
        """
        current_app.logger.info(f"📊 Analyse de performance de {len(evaluations)} évaluations...")
        
        notes = []
        difficultes = {}
        tous_resultats = []

        for evaluation in evaluations:
            try:
                rapport = self.corriger_evaluation(evaluation)["rapport"]
                notes.append(rapport["score_sur_20"])
                tous_resultats.extend(rapport["details"])

                for r in rapport["details"]:
                    if not r["est_correcte"]:
                        question = r["question"]
                        difficultes[question] = difficultes.get(question, 0) + 1
                        
            except Exception as e:
                current_app.logger.error(f"❌ Erreur analyse évaluation: {e}")
                continue

        stats = {
            "note_moyenne": round(statistics.mean(notes), 2) if notes else 0,
            "note_mediane": round(statistics.median(notes), 2) if notes else 0,
            "note_max": round(max(notes), 2) if notes else 0,
            "note_min": round(min(notes), 2) if notes else 0,
            "ecart_type": round(statistics.stdev(notes), 2) if len(notes) > 1 else 0,
            "nombre_participants": len(notes),
            "difficultes_principales": sorted(difficultes.items(), key=lambda x: x[1], reverse=True)[:5],
            "taux_reussite": round(sum(1 for n in notes if n >= 10) / len(notes) * 100, 2) if notes else 0
        }
        
        # Générer des recommandations pour l'enseignant
        recommandations_classe = self.hf_service.generer_recommandations(
            tous_resultats,
            niveau="classe",
            matiere=""
        )
        
        stats["recommandations"] = recommandations_classe.get("recommandations_enseignant", [])

        current_app.logger.info(f"✅ Analyse terminée - Moyenne: {stats['note_moyenne']}/20")

        return stats

    # ============================================================================
    # RECOMMANDATIONS PERSONNALISÉES
    # ============================================================================
    
    def generer_recommandations_etudiant(self, rapport: Dict[str, Any]) -> List[str]:
        """
        Génère des recommandations personnalisées pour l'étudiant.
        
        Args:
            rapport: Rapport de correction
            
        Returns:
            Liste de recommandations
        """
        resultats = rapport.get("details", [])
        recommandations_ia = self.hf_service.generer_recommandations(resultats)
        
        return recommandations_ia.get("recommandations_etudiant", [
            "Continuez vos efforts !",
            "N'hésitez pas à demander de l'aide si nécessaire."
        ])

    def generer_recommandations_enseignant(self, stats: Dict[str, Any]) -> List[str]:
        """
        Génère des recommandations pour l'enseignant basées sur les stats de classe.
        
        Args:
            stats: Statistiques de performance de la classe
            
        Returns:
            Liste de recommandations
        """
        recommandations = []
        
        note_moyenne = stats.get("note_moyenne", 0)
        taux_reussite = stats.get("taux_reussite", 0)
        
        if note_moyenne < 10:
            recommandations.append("⚠️ Moyenne de classe faible : Prévoir une révision générale du chapitre.")
            recommandations.append("👥 Organiser des séances de remédiation collective.")
        elif note_moyenne < 12:
            recommandations.append("📚 Résultats moyens : Renforcer certains concepts clés.")
        else:
            recommandations.append("✅ Bons résultats globaux : La classe maîtrise les concepts principaux.")
        
        if taux_reussite < 50:
            recommandations.append("⚠️ Moins de 50% de réussite : Revoir la méthode pédagogique.")
        
        if stats.get("difficultes_principales"):
            questions_diff = [d[0][:50] + "..." for d in stats["difficultes_principales"][:3]]
            recommandations.append(f"📌 Questions problématiques : {', '.join(questions_diff)}")
            recommandations.append("💡 Prévoir des exercices supplémentaires sur ces points.")
        
        return recommandations

    # ============================================================================
    # UTILITAIRES
    # ============================================================================
    
    def _formater_feedback_complet(
        self,
        note: float,
        pourcentage: float,
        recommandations: Dict[str, Any]
    ) -> str:
        """Formate un feedback complet pour l'étudiant"""
        
        feedback_parts = []
        
        # En-tête avec note
        feedback_parts.append(f"📊 Note obtenue : {note:.2f}/20 ({pourcentage:.1f}%)")
        feedback_parts.append("")
        
        # Niveau de maîtrise
        niveau = recommandations.get("niveau_maitrise", "")
        if niveau:
            feedback_parts.append(f"🎯 Niveau de maîtrise : {niveau}")
            feedback_parts.append("")
        
        # Recommandations
        reco_etudiant = recommandations.get("recommandations_etudiant", [])
        if reco_etudiant:
            feedback_parts.append("💡 Recommandations :")
            for reco in reco_etudiant:
                feedback_parts.append(f"  • {reco}")
            feedback_parts.append("")
        
        # Points forts
        points_forts = recommandations.get("points_forts", [])
        if points_forts:
            feedback_parts.append(f"✅ Points forts : {', '.join(points_forts)}")
            feedback_parts.append("")
        
        # Concepts à revoir
        concepts_revoir = recommandations.get("concepts_a_revoir", [])
        if concepts_revoir:
            feedback_parts.append(f"📚 À revoir : {', '.join(concepts_revoir)}")
            feedback_parts.append("")
        
        # Progression suggérée
        progression = recommandations.get("progression_suggeree", "")
        if progression:
            feedback_parts.append(f"🚀 Prochaine étape : {progression}")
        
        return "\n".join(feedback_parts)
    
    def exporter_rapport_detaille(
        self,
        evaluation_id: int,
        format_export: str = "json"
    ) -> Dict[str, Any]:
        """
        Exporte un rapport détaillé d'évaluation.
        
        Args:
            evaluation_id: ID de l'évaluation
            format_export: Format d'export (json, pdf, csv)
            
        Returns:
            Dict avec les données du rapport
        """
        evaluation = Evaluation.query.get(evaluation_id)
        if not evaluation:
            return {"error": "Évaluation non trouvée"}
        
        rapport = self.corriger_evaluation(evaluation)
        
        # Ajouter des métadonnées
        rapport["metadata"] = {
            "evaluation_id": evaluation_id,
            "etudiant_id": evaluation.etudiant_id,
            "date_correction": rapport["resultat"].get("date_correction"),
            "format": format_export
        }
        
        return rapport
