"""
Service Hugging Face pour la génération, correction et évaluation automatique d'exercices pédagogiques.

Ce service utilise plusieurs modèles pré-entraînés :
- T5/FLAN-T5 : Génération de questions et réponses
- Sentence-Transformers : Similarité sémantique pour correction
- BERT : Classification et analyse de texte
"""

import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSeq2SeqLM,
    AutoModelForSequenceClassification,
    pipeline,
    MarianMTModel,
    MarianTokenizer
)
from sentence_transformers import SentenceTransformer, util
from flask import current_app
import re
import random
from typing import List, Dict, Any, Optional
import numpy as np
import requests
import json


class HuggingFaceService:
    """Service intelligent pour la génération et correction d'exercices pédagogiques"""
    
    def __init__(self):
        self.api_token = current_app.config.get("HF_API_TOKEN")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        current_app.logger.info(f"🚀 Initialisation du service Hugging Face sur {self.device}")
        
        # Modèles chargés en lazy loading pour économiser la mémoire
        self._generation_model = None
        self._generation_tokenizer = None
        self._similarity_model = None
        self._qa_pipeline = None
        self._translation_model = None
        self._translation_tokenizer = None
        
    # ============================================================================
    # PROPRIÉTÉS LAZY LOADING DES MODÈLES
    # ============================================================================
    
    @property
    def generation_model(self):
        """Modèle de génération de texte (Mistral-7B → FLAN-T5-Large → FLAN-T5-Base)"""
        if self._generation_model is None:
            current_app.logger.info("Chargement du modèle de génération...")
            
            try:
                # OPTION 1 : Commencer par FLAN-T5-Large (plus rapide et fiable)
                try:
                    model_name = "google/flan-t5-large"
                    current_app.logger.info(f"🎯 Chargement de {model_name} (modèle fiable)...")
                    self._generation_tokenizer = AutoTokenizer.from_pretrained(model_name)
                    self._generation_model = AutoModelForSeq2SeqLM.from_pretrained(
                        model_name,
                        low_cpu_mem_usage=True
                    ).to(self.device)
                    current_app.logger.info(f"✅ Modèle FLAN-T5-Large chargé avec succès")
                    return self._generation_model
                    
                except Exception as e:
                    current_app.logger.warning(f"⚠️ Impossible de charger FLAN-T5-Large: {e}")
                    current_app.logger.info("🔄 Fallback vers FLAN-UL2...")
                
                # OPTION 2 : Fallback vers FLAN-UL2 (plus puissant mais plus lent)
                try:
                    model_name = "google/flan-ul2"
                    current_app.logger.info(f"🚀 Chargement FLAN-UL2 (mode optimisé anti-blocage)...")
                    current_app.logger.info("⚡ Optimisations: float16, limite mémoire, offload disque...")
                    
                    self._generation_tokenizer = AutoTokenizer.from_pretrained(model_name)
                    
                    # Chargement optimisé pour éviter les blocages mémoire
                    self._generation_model = AutoModelForSeq2SeqLM.from_pretrained(
                        model_name,
                        torch_dtype=torch.float16,  # Force float16 pour économiser la mémoire
                        device_map="auto" if torch.cuda.is_available() else None,
                        low_cpu_mem_usage=True,
                        max_memory={0: "8GB"} if torch.cuda.is_available() else None,  # Limite mémoire GPU
                        offload_folder="./offload" if not torch.cuda.is_available() else None  # Offload sur disque si CPU
                    )
                    
                    if not torch.cuda.is_available():
                        self._generation_model = self._generation_model.to("cpu")
                    
                    current_app.logger.info(f"✅ Modèle FLAN-UL2 chargé avec succès (mode optimisé)")
                    return self._generation_model
                    
                except Exception as e:
                    current_app.logger.warning(f"⚠️ Impossible de charger FLAN-UL2: {str(e)[:200]}")
                    current_app.logger.info("🔄 Fallback vers FLAN-T5-Base...")
                
                # OPTION 3 : Dernier fallback vers FLAN-T5-Base
                try:
                    model_name = "google/flan-t5-base"
                    current_app.logger.info(f"🎯 Chargement de {model_name}...")
                    self._generation_tokenizer = AutoTokenizer.from_pretrained(model_name)
                    self._generation_model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
                    current_app.logger.info("✅ Modèle FLAN-T5-Base chargé avec succès")
                    return self._generation_model
                    
                except Exception as e:
                    current_app.logger.error(f"❌ Erreur chargement modèle génération: {e}")
                    raise
                    
            except Exception as e:
                current_app.logger.error(f"❌ Erreur générale chargement modèle: {e}")
                raise
                
        return self._generation_model
    
    @property
    def generation_tokenizer(self):
        """Tokenizer pour le modèle de génération"""
        if self._generation_tokenizer is None:
            _ = self.generation_model  # Déclenche le chargement
        return self._generation_tokenizer
    
    @property
    def similarity_model(self):
        """Modèle de similarité sémantique (Sentence-BERT)"""
        if self._similarity_model is None:
            current_app.logger.info("📥 Chargement du modèle de similarité sémantique...")
            try:
                # Modèle multilingue pour supporter français et anglais
                self._similarity_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                current_app.logger.info("✅ Modèle de similarité chargé avec succès")
            except Exception as e:
                current_app.logger.error(f"❌ Erreur chargement modèle similarité: {e}")
                raise
        return self._similarity_model
    
    @property
    def translation_model(self):
        """Modèle de traduction anglais → français (MarianMT)"""
        if self._translation_model is None:
            current_app.logger.info("📥 Chargement du modèle de traduction anglais → français...")
            try:
                # Modèle MarianMT pour traduction anglais → français
                model_name = "Helsinki-NLP/opus-mt-en-fr"
                self._translation_tokenizer = MarianTokenizer.from_pretrained(model_name)
                self._translation_model = MarianMTModel.from_pretrained(model_name).to(self.device)
                current_app.logger.info("✅ Modèle de traduction chargé avec succès")
            except Exception as e:
                current_app.logger.error(f"❌ Erreur chargement modèle traduction: {e}")
                raise
        return self._translation_model
    
    @property
    def translation_tokenizer(self):
        """Tokenizer pour le modèle de traduction"""
        if self._translation_tokenizer is None:
            _ = self.translation_model  # Déclenche le chargement
        return self._translation_tokenizer
    
    @property
    def qa_pipeline(self):
        """Pipeline Question-Answering"""
        if self._qa_pipeline is None:
            current_app.logger.info("📥 Chargement du pipeline QA...")
            try:
                # Pipeline QA pour extraction de réponses
                self._qa_pipeline = pipeline(
                    "question-answering",
                    model="deepset/roberta-base-squad2",
                    device=0 if self.device == "cuda" else -1
                )
                current_app.logger.info("✅ Pipeline QA chargé avec succès")
            except Exception as e:
                current_app.logger.error(f"❌ Erreur chargement pipeline QA: {e}")
                raise
        return self._qa_pipeline
    
    # ============================================================================
    # TRADUCTION AUTOMATIQUE
    # ============================================================================
    
    def traduire_anglais_vers_francais(self, texte_anglais: str) -> str:
        """Traduit un texte anglais vers le français avec MarianMT"""
        try:
            # Tokeniser le texte anglais
            inputs = self.translation_tokenizer(
                texte_anglais, 
                max_length=512, 
                truncation=True, 
                return_tensors="pt"
            ).to(self.device)
            
            # Traduire
            with torch.no_grad():
                outputs = self.translation_model.generate(
                    **inputs,
                    max_new_tokens=200,
                    num_beams=4,
                    temperature=0.7,
                    do_sample=True,
                    early_stopping=True
                )
            
            # Décoder le texte français
            texte_francais = self.translation_tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            current_app.logger.info(f"🌐 Traduction: '{texte_anglais[:50]}...' → '{texte_francais[:50]}...'")
            return texte_francais
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur traduction: {e}")
            return texte_anglais  # Retourner l'original en cas d'erreur
    
    def traduire_qcm_anglais_vers_francais(self, qcm_anglais: Dict[str, Any]) -> Dict[str, Any]:
        """Traduit un QCM complet de l'anglais vers le français"""
        try:
            qcm_francais = {}
            
            # Traduire la question
            if "texte" in qcm_anglais:
                qcm_francais["texte"] = self.traduire_anglais_vers_francais(qcm_anglais["texte"])
            
            # Traduire les options
            for i in range(1, 5):
                key = f"reponse{i}"
                if key in qcm_anglais:
                    qcm_francais[key] = self.traduire_anglais_vers_francais(qcm_anglais[key])
            
            # Garder la bonne réponse (numérique)
            if "bonne_reponse" in qcm_anglais:
                qcm_francais["bonne_reponse"] = qcm_anglais["bonne_reponse"]
            
            current_app.logger.info("✅ QCM traduit de l'anglais vers le français")
            return qcm_francais
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur traduction QCM: {e}")
            return qcm_anglais  # Retourner l'original en cas d'erreur
    
    # ============================================================================
    # GÉNÉRATION DE QUESTIONS QCM
    # ============================================================================
    
    def generer_qcm_depuis_document(
        self, 
        contenu_document: str, 
        nombre_questions: int = 5,
        matiere: str = "",
        niveau: str = "",
        difficulte: str = "Moyen"
    ) -> Dict[str, Any]:
        """
        Génère automatiquement des questions QCM à partir d'un document de cours.
        
        Args:
            contenu_document: Texte du document source
            nombre_questions: Nombre de questions à générer
            matiere: Matière concernée
            niveau: Niveau des étudiants
            difficulte: Difficulté souhaitée (Facile, Moyen, Difficile)
            
        Returns:
            Dict contenant les questions générées et métadonnées
        """
        current_app.logger.info(f"🎯 Génération de {nombre_questions} questions QCM depuis document...")
        
        try:
            # Découper le document en chunks pour respecter les limites du modèle
            chunks = self._split_text_into_chunks(contenu_document, max_length=500)
            
            questions = []
            questions_par_chunk = max(1, nombre_questions // len(chunks))
            
            for i, chunk in enumerate(chunks[:nombre_questions]):
                current_app.logger.info(f"📝 Génération questions pour chunk {i+1}/{len(chunks)}")
                
                # Générer des questions pour ce chunk
                chunk_questions = self._generer_questions_chunk(
                    chunk, 
                    min(questions_par_chunk, nombre_questions - len(questions)),
                    matiere,
                    niveau,
                    difficulte
                )
                questions.extend(chunk_questions)
                
                if len(questions) >= nombre_questions:
                    break
            
            # S'assurer d'avoir le bon nombre de questions
            questions = questions[:nombre_questions]
            
            current_app.logger.info(f"✅ {len(questions)} questions QCM générées avec succès")
            
            return {
                "success": True,
                "questions": questions,
                "nombre_genere": len(questions),
                "matiere": matiere,
                "niveau": niveau,
                "difficulte": difficulte
            }
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur génération QCM: {e}")
            return {
                "success": False,
                "error": str(e),
                "questions": []
            }
    
    def _generer_questions_chunk(
        self, 
        texte: str, 
        nombre: int,
        matiere: str,
        niveau: str,
        difficulte: str
    ) -> List[Dict[str, Any]]:
        """Génère des questions QCM pour un chunk de texte"""
        questions = []
        
        # Extraire les concepts clés du texte
        concepts = ["concept principal"]
        
        for i in range(nombre):
            try:
                # Choisir un concept pour cette question
                concept = concepts[i % len(concepts)] if concepts else "ce sujet"
                
                # Générer la question
                prompt = self._construire_prompt_qcm(texte, concept, difficulte, matiere)
                question_data = self._generer_avec_modele(prompt)
                
                if question_data:
                    questions.append(question_data)
                    
            except Exception as e:
                current_app.logger.warning(f"⚠️ Erreur génération question {i+1}: {e}")
                continue
        
        return questions
    
    def _construire_prompt_qcm(self, contexte: str, concept: str, difficulte: str, matiere: str = "") -> str:
        """Construit un prompt optimisé PROFESSIONNEL pour FLAN-T5 - Haute qualité"""
        
        # Adapter le prompt selon la matière
        matiere_context = f" related to {matiere}" if matiere else ""
        
        # Définir le niveau selon la difficulté
        niveau_map = {
            "Facile": "beginner-level",
            "Moyen": "intermediate-level",
            "Difficile": "advanced-level"
        }
        niveau = niveau_map.get(difficulte, "intermediate-level")
        
        # PROMPT ENGINEERING OPTIMISÉ POUR FLAN-T5 - FORMAT COMPACT
        # Instructions en anglais pour génération en format compact
        prompt = f"""Create a complete multiple choice question about {concept}.

Context: {contexte[:200]}

You must include the question AND all 4 options AND the answer.

Example format:
Q: What is the correct way to declare a variable in Python?
A) var = 5
B) int var = 5
C) variable var = 5
D) declare var = 5
Answer: A

Now create a complete question about {concept}:

Q: What is the correct way to declare a variable in Python?
A) var = 5
B) int var = 5
C) variable var = 5
D) declare var = 5
Answer: A

Create a different question about {concept}:"""

        return prompt
    
    def _generer_avec_modele(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Génère du texte avec le modèle (API Inference ou local)"""
        try:
            # PRIORITÉ 1 : Utiliser l'API Inference HuggingFace (GRATUITE et PUISSANTE)
            if self.api_token and self.api_token != "hf_your_token_here":
                current_app.logger.info("🌐 Utilisation de l'API Inference HuggingFace...")
                question_api = self._generer_avec_api_inference(prompt)
                if question_api:
                    current_app.logger.info("✅ Question générée avec API Inference")
                    return question_api
                else:
                    current_app.logger.warning("⚠️ API Inference a échoué, fallback vers modèle local...")
            
            # PRIORITÉ 2 : Modèle local (si API échoue ou pas de token)
            current_app.logger.info("💻 Utilisation du modèle local...")
            
            # Tokeniser et générer
            inputs = self.generation_tokenizer(
                prompt, 
                max_length=512, 
                truncation=True, 
                return_tensors="pt"
            ).to(self.device)
            
            outputs = self.generation_model.generate(
                **inputs,
                max_new_tokens=500,  # BEAUCOUP plus d'espace pour QCM complet
                num_beams=6,         # Beams pour qualité
                temperature=0.8,     # Plus de créativité pour varier les options
                do_sample=True,
                top_p=0.95,         # Plus de diversité
                top_k=50,           # Vocabulaire plus large
                no_repeat_ngram_size=2,  # Moins restrictif
                repetition_penalty=1.1,  # Moins de pénalité
                length_penalty=1.2,      # ENCOURAGER des réponses LONGUES
                early_stopping=False,    # NE PAS s'arrêter trop tôt
                pad_token_id=self.generation_tokenizer.eos_token_id
            )
            
            generated_text = self.generation_tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # LOG IMPORTANT : Voir ce que le modèle génère
            current_app.logger.info(f"🤖 TEXTE GÉNÉRÉ PAR LE MODÈLE LOCAL :\n{generated_text}\n")
            
            # Parser la réponse générée
            question_parsee = self._parser_question_generee(generated_text)
            
            if question_parsee:
                current_app.logger.info(f"✅ Question parsée avec succès")
                # Traduire la question de l'anglais vers le français
                current_app.logger.info("🌐 Traduction de la question vers le français...")
                question_francaise = self.traduire_qcm_anglais_vers_francais(question_parsee)
                return question_francaise
            else:
                current_app.logger.warning(f"⚠️ Échec du parsing de la question locale")
                current_app.logger.error(f"❌ Hugging Face n'a pas pu générer de question valide")
                return None
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur génération avec modèle: {e}")
            return None
    
    def _generer_avec_api_inference(self, prompt: str) -> Optional[Dict[str, Any]]:
        """
        Génère une question en utilisant l'API Inference de Hugging Face (GRATUITE).
        Essaie plusieurs modèles puissants en cascade (compte gratuit).
        """
        # Liste des modèles à essayer (du meilleur au plus accessible)
        modeles_api = [
            {
                "nom": "google/flan-t5-xxl",
                "url": "https://api-inference.huggingface.co/models/google/flan-t5-xxl",
                "format_prompt": lambda p: p,  # FLAN-T5 comprend les instructions directement
                "type": "seq2seq"
            },
            {
                "nom": "google/flan-t5-xl",
                "url": "https://api-inference.huggingface.co/models/google/flan-t5-xl",
                "format_prompt": lambda p: p,
                "type": "seq2seq"
            },
            {
                "nom": "google/flan-t5-large",
                "url": "https://api-inference.huggingface.co/models/google/flan-t5-large",
                "format_prompt": lambda p: p,
                "type": "seq2seq"
            }
        ]
        
        headers = {"Authorization": f"Bearer {self.api_token}"}
        
        for modele in modeles_api:
            try:
                current_app.logger.info(f"🌐 Essai avec {modele['nom']}...")
                
                # Formater le prompt selon le modèle
                prompt_formate = modele["format_prompt"](prompt)
                
                payload = {
                    "inputs": prompt_formate,
                    "parameters": {
                        "max_new_tokens": 350,
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 40,
                        "do_sample": True,
                        "repetition_penalty": 1.2,
                        "no_repeat_ngram_size": 3
                    }
                }
                
                response = requests.post(modele["url"], headers=headers, json=payload, timeout=60)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if isinstance(result, list) and len(result) > 0:
                        generated_text = result[0].get("generated_text", "")
                    elif isinstance(result, dict):
                        generated_text = result.get("generated_text", "") or result.get(0, {}).get("generated_text", "")
                    else:
                        generated_text = str(result)
                    
                    if generated_text:
                        current_app.logger.info(f"✅ {modele['nom']} a répondu")
                        current_app.logger.info(f"🌐 TEXTE GÉNÉRÉ PAR API :\n{generated_text}\n")
                        
                        # Parser la réponse
                        question_parsee = self._parser_question_generee(generated_text)
                        if question_parsee:
                            # Traduire la question de l'anglais vers le français
                            current_app.logger.info("🌐 Traduction de la question API vers le français...")
                            question_francaise = self.traduire_qcm_anglais_vers_francais(question_parsee)
                            return question_francaise
                        else:
                            current_app.logger.warning(f"⚠️ Parsing échoué pour {modele['nom']}, essai du modèle suivant...")
                            continue
                    
                elif response.status_code == 503:
                    current_app.logger.warning(f"⚠️ {modele['nom']} en cold start (503), essai du modèle suivant...")
                    continue
                    
                elif response.status_code == 404:
                    current_app.logger.warning(f"⚠️ {modele['nom']} non disponible (404), essai du modèle suivant...")
                    continue
                    
                else:
                    current_app.logger.warning(f"⚠️ {modele['nom']} erreur {response.status_code}, essai du modèle suivant...")
                    continue
                    
            except requests.exceptions.Timeout:
                current_app.logger.warning(f"⏰ {modele['nom']} timeout, essai du modèle suivant...")
                continue
                
            except Exception as e:
                current_app.logger.warning(f"⚠️ {modele['nom']} erreur: {str(e)[:200]}, essai du modèle suivant...")
                continue
        
        # Tous les modèles API ont échoué
        current_app.logger.warning("⚠️ Tous les modèles API ont échoué, fallback vers modèle local")
        return None
    
    def _parser_question_generee(self, texte: str) -> Optional[Dict[str, Any]]:
        """Parse le texte généré par le modèle pour extraire la question QCM - Version améliorée"""
        try:
            # Nettoyer le texte
            texte = texte.strip()
            
            # FORMAT SPÉCIAL : Format compact sans espaces
            # Exemple: "Q: Which of the following is not a type of variable?Options:A Integer.B Decimal.C Floating point.D Binary.Answer:C"
            compact_match = re.search(r'Q:\s*(.+?)\?Options:A\s*([^.]+)\.B\s*([^.]+)\.C\s*([^.]+)\.D\s*([^.]+)\.Answer:([A-D])', texte, re.IGNORECASE)
            if compact_match:
                question_text = compact_match.group(1).strip()
                options = {
                    'A': compact_match.group(2).strip(),
                    'B': compact_match.group(3).strip(),
                    'C': compact_match.group(4).strip(),
                    'D': compact_match.group(5).strip()
                }
                bonne_reponse_lettre = compact_match.group(6).upper()
                bonne_reponse_index = ord(bonne_reponse_lettre) - ord('A') + 1
                
                return {
                    "texte": question_text,
                    "reponse1": options['A'],
                    "reponse2": options['B'],
                    "reponse3": options['C'],
                    "reponse4": options['D'],
                    "bonne_reponse": bonne_reponse_index
                }
            
            # Essayer différents formats de parsing
            
            # Format 1: Q: ... A) ... B) ... C) ... D) ... Answer: X
            question_match = re.search(r'Q\s*:?\s*(.+?)(?=\n\s*A\))', texte, re.DOTALL | re.IGNORECASE)
            if not question_match:
                # Format 2: Question: ... A) ... 
                question_match = re.search(r'Question\s*:?\s*(.+?)(?=\n\s*A\))', texte, re.DOTALL | re.IGNORECASE)
            if not question_match:
                # Format 3: Juste la question directe
                lines = texte.split('\n')
                for line in lines:
                    if line.strip() and not line.strip().startswith(('A)', 'B)', 'C)', 'D)', 'Answer', 'Réponse')):
                        question_text = line.strip()
                        break
                else:
                    return None
            else:
                question_text = question_match.group(1).strip()
            
            # Extraire les options A, B, C, D
            options = {}
            for letter in ['A', 'B', 'C', 'D']:
                # Pattern plus flexible
                patterns = [
                    rf'{letter}\)\s*([^\n]+)',  # A) texte
                    rf'{letter}\.\s*([^\n]+)',  # A. texte
                    rf'{letter}:\s*([^\n]+)',   # A: texte
                    rf'{letter}\s+([^A-D]+?)(?=\s+[B-D]|\s+Answer)',  # A Integer (format compact)
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, texte, re.IGNORECASE)
                    if match:
                        option_text = match.group(1).strip()
                        # Nettoyer l'option (enlever les autres lettres qui suivent)
                        option_text = re.split(r'\s+[B-D]\)', option_text)[0]
                        options[letter] = option_text
                        break
            
            # Vérifier qu'on a bien 4 options
            if len(options) < 4:
                current_app.logger.warning(f"⚠️ Seulement {len(options)} options trouvées")
                return None
            
            # Extraire la bonne réponse
            reponse_patterns = [
                r'Answer\s*:?\s*([A-D])',
                r'Réponse\s*:?\s*([A-D])',
                r'Correct\s*:?\s*([A-D])',
                r'\n([A-D])\s*$'  # Juste la lettre à la fin
            ]
            
            bonne_reponse_lettre = None
            for pattern in reponse_patterns:
                match = re.search(pattern, texte, re.IGNORECASE)
                if match:
                    bonne_reponse_lettre = match.group(1).upper()
                    break
            
            if not bonne_reponse_lettre:
                # Par défaut, prendre A
                current_app.logger.warning("⚠️ Bonne réponse non trouvée, utilisation de A par défaut")
                bonne_reponse_lettre = 'A'
            
            bonne_reponse_index = ord(bonne_reponse_lettre) - ord('A') + 1
            
            return {
                "texte": question_text,
                "reponse1": options.get('A', ''),
                "reponse2": options.get('B', ''),
                "reponse3": options.get('C', ''),
                "reponse4": options.get('D', ''),
                "bonne_reponse": bonne_reponse_index
            }
            
        except Exception as e:
            current_app.logger.warning(f"⚠️ Erreur parsing: {e}")
            import traceback
            current_app.logger.warning(traceback.format_exc())
            return None
    
    # ============================================================================
    # GÉNÉRATION DE QUESTIONS VRAI/FAUX
    # ============================================================================
    
    def generer_vrai_faux_depuis_document(
        self,
        contenu_document: str,
        nombre_questions: int = 5,
        matiere: str = "",
        niveau: str = ""
    ) -> Dict[str, Any]:
        """
        Génère des questions Vrai/Faux à partir d'un document.
        
        Args:
            contenu_document: Texte du document source
            nombre_questions: Nombre de questions à générer
            matiere: Matière concernée
            niveau: Niveau des étudiants
            
        Returns:
            Dict contenant les questions générées
        """
        current_app.logger.info(f"🎯 Génération de {nombre_questions} questions Vrai/Faux...")
        
        try:
            chunks = self._split_text_into_chunks(contenu_document, max_length=400)
            questions = []
            
            for i, chunk in enumerate(chunks[:nombre_questions * 2]):  # Générer plus pour avoir le meilleur
                try:
                    # Extraire une affirmation du texte
                    prompt = f"""Contexte : {chunk}

Génère une affirmation Vrai ou Faux basée sur ce contexte.
L'affirmation doit être claire et tester la compréhension du contenu.

Format:
Affirmation: [L'affirmation]
Réponse: [Vrai ou Faux]
Explication: [Pourquoi c'est vrai ou faux]"""

                    inputs = self.generation_tokenizer(prompt, max_length=512, truncation=True, return_tensors="pt").to(self.device)
                    outputs = self.generation_model.generate(**inputs, max_length=150, num_beams=4, temperature=0.7)
                    generated = self.generation_tokenizer.decode(outputs[0], skip_special_tokens=True)
                    
                    # Parser l'affirmation générée
                    question_data = self._parser_vrai_faux(generated)
                    if question_data:
                        questions.append(question_data)
                    
                    if len(questions) >= nombre_questions:
                        break
                        
                except Exception as e:
                    current_app.logger.warning(f"⚠️ Erreur génération V/F {i+1}: {e}")
                    continue
            
            # Compléter avec des questions de secours si nécessaire
            while len(questions) < nombre_questions:
                questions.append(self._generer_vrai_faux_secours(chunks[len(questions) % len(chunks)]))
            
            current_app.logger.info(f"✅ {len(questions)} questions Vrai/Faux générées")
            
            return {
                "success": True,
                "questions": questions[:nombre_questions],
                "nombre_genere": min(len(questions), nombre_questions)
            }
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur génération Vrai/Faux: {e}")
            return {
                "success": False,
                "error": str(e),
                "questions": []
            }
    
    def _parser_vrai_faux(self, texte: str) -> Optional[Dict[str, Any]]:
        """Parse une question Vrai/Faux générée"""
        try:
            affirmation_match = re.search(r'Affirmation\s*:?\s*(.+?)(?=Réponse|$)', texte, re.DOTALL | re.IGNORECASE)
            reponse_match = re.search(r'Réponse\s*:?\s*(Vrai|Faux)', texte, re.IGNORECASE)
            explication_match = re.search(r'Explication\s*:?\s*(.+?)$', texte, re.DOTALL | re.IGNORECASE)
            
            if not affirmation_match or not reponse_match:
                return None
            
            est_vrai = reponse_match.group(1).lower() == "vrai"
            
            return {
                "texte": affirmation_match.group(1).strip(),
                "reponse_correcte": "Vrai" if est_vrai else "Faux",
                "explication": explication_match.group(1).strip() if explication_match else ""
            }
            
        except Exception as e:
            current_app.logger.warning(f"⚠️ Erreur parsing V/F: {e}")
            return None
    
    def _generer_vrai_faux_secours(self, texte: str) -> Dict[str, Any]:
        """Génère une question Vrai/Faux de secours simple"""
        phrases = [p.strip() for p in texte.split('.') if len(p.strip()) > 20]
        if phrases:
            phrase = random.choice(phrases)
            # Transformer aléatoirement en vrai ou faux
            est_vrai = random.choice([True, False])
            return {
                "texte": phrase,
                "reponse_correcte": "Vrai" if est_vrai else "Faux",
                "explication": "Basé sur le contenu du cours"
            }
        return {
            "texte": "Cette affirmation est basée sur le contenu du cours.",
            "reponse_correcte": "Vrai",
            "explication": "Référence au contenu du document"
        }
    
    # ============================================================================
    # GÉNÉRATION DE QUESTIONS OUVERTES
    # ============================================================================
    
    def generer_questions_ouvertes_depuis_document(
        self,
        contenu_document: str,
        nombre_questions: int = 3,
        matiere: str = "",
        niveau: str = ""
    ) -> Dict[str, Any]:
        """
        Génère des questions ouvertes à partir d'un document avec leurs corrigés.
        
        Args:
            contenu_document: Texte du document source
            nombre_questions: Nombre de questions à générer
            matiere: Matière concernée
            niveau: Niveau des étudiants
            
        Returns:
            Dict contenant les questions et leurs corrigés types
        """
        current_app.logger.info(f"🎯 Génération de {nombre_questions} questions ouvertes...")
        
        try:
            chunks = self._split_text_into_chunks(contenu_document, max_length=500)
            questions = []
            
            for i, chunk in enumerate(chunks[:nombre_questions]):
                try:
                    prompt = f"""Contexte : {chunk}

Génère une question ouverte pertinente sur ce contenu et sa réponse attendue.

Format:
Question: [Question ouverte]
Réponse attendue: [Réponse complète et détaillée]
Mots-clés essentiels: [Liste des concepts clés attendus dans la réponse]"""

                    inputs = self.generation_tokenizer(prompt, max_length=512, truncation=True, return_tensors="pt").to(self.device)
                    outputs = self.generation_model.generate(
                        **inputs, 
                        max_length=300, 
                        num_beams=4,
                        temperature=0.7,
                        do_sample=True
                    )
                    generated = self.generation_tokenizer.decode(outputs[0], skip_special_tokens=True)
                    
                    # Parser la question ouverte
                    question_data = self._parser_question_ouverte(generated, chunk)
                    if question_data:
                        questions.append(question_data)
                    
                except Exception as e:
                    current_app.logger.warning(f"⚠️ Erreur génération question ouverte {i+1}: {e}")
                    # Génération de secours
                    questions.append(self._generer_question_ouverte_secours(chunk))
            
            current_app.logger.info(f"✅ {len(questions)} questions ouvertes générées")
            
            return {
                "success": True,
                "questions": questions,
                "nombre_genere": len(questions)
            }
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur génération questions ouvertes: {e}")
            return {
                "success": False,
                "error": str(e),
                "questions": []
            }
    
    def _parser_question_ouverte(self, texte: str, contexte: str) -> Optional[Dict[str, Any]]:
        """Parse une question ouverte générée"""
        try:
            question_match = re.search(r'Question\s*:?\s*(.+?)(?=Réponse|$)', texte, re.DOTALL | re.IGNORECASE)
            reponse_match = re.search(r'Réponse attendue\s*:?\s*(.+?)(?=Mots-clés|$)', texte, re.DOTALL | re.IGNORECASE)
            mots_cles_match = re.search(r'Mots-clés essentiels\s*:?\s*(.+?)$', texte, re.DOTALL | re.IGNORECASE)
            
            if not question_match:
                return None
            
            # Si pas de réponse générée, utiliser le contexte
            reponse_attendue = reponse_match.group(1).strip() if reponse_match else contexte[:200]
            mots_cles = mots_cles_match.group(1).strip() if mots_cles_match else "concept principal"
            
            return {
                "texte": question_match.group(1).strip(),
                "reponse_attendue": reponse_attendue,
                "mots_cles": mots_cles if isinstance(mots_cles, list) else [m.strip() for m in str(mots_cles).split(',')],
                "contexte_source": contexte
            }
            
        except Exception as e:
            current_app.logger.warning(f"⚠️ Erreur parsing question ouverte: {e}")
            return None
    
    def _generer_question_ouverte_secours(self, contexte: str) -> Dict[str, Any]:
        """Génère une question ouverte de secours"""
        concepts = ["concept principal"]
        concept_principal = concepts[0] if concepts else "ce sujet"
        
        questions_templates = [
            f"Expliquez en détail {concept_principal}.",
            f"Quels sont les principaux aspects de {concept_principal} ?",
            f"Décrivez le rôle et l'importance de {concept_principal}.",
            f"Analysez {concept_principal} dans son contexte."
        ]
        
        return {
            "texte": random.choice(questions_templates),
            "reponse_attendue": contexte[:300],
            "mots_cles": concepts[:5],
            "contexte_source": contexte
        }
    
    # ============================================================================
    # CORRECTION AUTOMATIQUE DES RÉPONSES
    # ============================================================================
    
    def corriger_reponse_ouverte(
        self,
        question: str,
        reponse_etudiant: str,
        reponse_attendue: str,
        mots_cles: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Corrige une réponse ouverte en utilisant la similarité sémantique.
        
        Args:
            question: La question posée
            reponse_etudiant: La réponse de l'étudiant
            reponse_attendue: La réponse correcte attendue
            mots_cles: Liste optionnelle de mots-clés essentiels
            
        Returns:
            Dict avec le score, feedback et détails de correction
        """
        current_app.logger.info("🔍 Correction de réponse ouverte avec similarité sémantique...")
        
        try:
            # Calculer la similarité sémantique globale
            score_semantique = self._calculer_similarite_semantique(
                reponse_etudiant, 
                reponse_attendue
            )
            
            # Vérifier la présence des mots-clés
            score_mots_cles = 0
            mots_cles_trouves = []
            mots_cles_manquants = []
            
            if mots_cles:
                for mot_cle in mots_cles:
                    if mot_cle.lower() in reponse_etudiant.lower():
                        mots_cles_trouves.append(mot_cle)
                    else:
                        mots_cles_manquants.append(mot_cle)
                
                score_mots_cles = len(mots_cles_trouves) / len(mots_cles) if mots_cles else 0
            
            # Score final pondéré
            score_final = (score_semantique * 0.7) + (score_mots_cles * 0.3)
            
            # Générer le feedback personnalisé
            feedback = self._generer_feedback_personnalise(
                score_final,
                score_semantique,
                score_mots_cles,
                mots_cles_trouves,
                mots_cles_manquants,
                len(reponse_etudiant),
                len(reponse_attendue)
            )
            
            # Déterminer si la réponse est correcte (seuil à 60%)
            est_correcte = score_final >= 0.6
            
            current_app.logger.info(f"✅ Correction terminée - Score: {score_final:.2%}")
            
            return {
                "est_correcte": est_correcte,
                "score": round(score_final * 100, 2),
                "score_semantique": round(score_semantique * 100, 2),
                "score_mots_cles": round(score_mots_cles * 100, 2) if mots_cles else None,
                "feedback": feedback,
                "mots_cles_trouves": mots_cles_trouves,
                "mots_cles_manquants": mots_cles_manquants,
                "note_sur_20": round(score_final * 20, 2)
            }
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur correction réponse: {e}")
            return {
                "est_correcte": False,
                "score": 0,
                "feedback": f"Erreur lors de la correction automatique: {str(e)}",
                "note_sur_20": 0
            }
    
    def _calculer_similarite_semantique(self, texte1: str, texte2: str) -> float:
        """Calcule la similarité sémantique entre deux textes"""
        try:
            # Encoder les textes
            embedding1 = self.similarity_model.encode(texte1, convert_to_tensor=True)
            embedding2 = self.similarity_model.encode(texte2, convert_to_tensor=True)
            
            # Calculer la similarité cosinus
            similarite = util.cos_sim(embedding1, embedding2)
            
            return float(similarite.item())
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur calcul similarité: {e}")
            return 0.0
    
    def _generer_feedback_personnalise(
        self,
        score_final: float,
        score_semantique: float,
        score_mots_cles: float,
        mots_cles_trouves: List[str],
        mots_cles_manquants: List[str],
        longueur_reponse: int,
        longueur_attendue: int
    ) -> str:
        """Génère un feedback personnalisé et détaillé"""
        
        feedback_parts = []
        
        # Évaluation globale
        if score_final >= 0.9:
            feedback_parts.append("🌟 Excellente réponse ! Vous avez parfaitement compris le sujet.")
        elif score_final >= 0.75:
            feedback_parts.append("✅ Très bonne réponse. Vous maîtrisez bien le sujet.")
        elif score_final >= 0.6:
            feedback_parts.append("👍 Réponse correcte, mais quelques éléments pourraient être améliorés.")
        elif score_final >= 0.4:
            feedback_parts.append("⚠️ Réponse partiellement correcte. Plusieurs points importants manquent.")
        else:
            feedback_parts.append("❌ Réponse insuffisante. Vous devez revoir ce concept.")
        
        # Analyse sémantique
        if score_semantique < 0.5:
            feedback_parts.append("\n📝 Le sens général de votre réponse s'éloigne de ce qui est attendu.")
        elif score_semantique < 0.7:
            feedback_parts.append("\n📝 Votre réponse va dans la bonne direction mais manque de précision.")
        
        # Analyse des mots-clés
        if mots_cles_trouves:
            feedback_parts.append(f"\n✓ Concepts maîtrisés : {', '.join(mots_cles_trouves)}")
        
        if mots_cles_manquants:
            feedback_parts.append(f"\n⚠️ Concepts à revoir : {', '.join(mots_cles_manquants)}")
        
        # Analyse de la longueur
        if longueur_reponse < longueur_attendue * 0.5:
            feedback_parts.append("\n💡 Votre réponse est trop courte. Développez davantage vos explications.")
        elif longueur_reponse > longueur_attendue * 2:
            feedback_parts.append("\n💡 Votre réponse est très détaillée. Veillez à rester concis et pertinent.")
        
        return "".join(feedback_parts)
    
    # ============================================================================
    # GÉNÉRATION DE RECOMMANDATIONS PÉDAGOGIQUES
    # ============================================================================
    
    def generer_recommandations(
        self,
        resultats: List[Dict[str, Any]],
        niveau: str = "",
        matiere: str = ""
    ) -> Dict[str, Any]:
        """
        Génère des recommandations pédagogiques personnalisées basées sur les résultats.
        
        Args:
            resultats: Liste des résultats d'évaluations
            niveau: Niveau de l'étudiant
            matiere: Matière concernée
            
        Returns:
            Dict avec recommandations pour l'étudiant et l'enseignant
        """
        current_app.logger.info("🎓 Génération de recommandations pédagogiques...")
        
        try:
            # Analyser les performances
            scores = [r.get('score', 0) for r in resultats if 'score' in r]
            score_moyen = np.mean(scores) if scores else 0
            
            # Identifier les points faibles
            questions_difficiles = []
            concepts_a_revoir = []
            
            for result in resultats:
                if result.get('score', 100) < 60:  # Moins de 60%
                    if 'question' in result:
                        questions_difficiles.append(result['question'])
                    if 'mots_cles_manquants' in result:
                        concepts_a_revoir.extend(result['mots_cles_manquants'])
            
            # Recommandations pour l'étudiant
            recommandations_etudiant = self._generer_recommandations_etudiant(
                score_moyen,
                concepts_a_revoir,
                niveau,
                matiere
            )
            
            # Recommandations pour l'enseignant
            recommandations_enseignant = self._generer_recommandations_enseignant(
                score_moyen,
                questions_difficiles,
                concepts_a_revoir,
                len(resultats)
            )
            
            return {
                "score_moyen": round(score_moyen, 2),
                "niveau_maitrise": self._determiner_niveau_maitrise(score_moyen),
                "recommandations_etudiant": recommandations_etudiant,
                "recommandations_enseignant": recommandations_enseignant,
                "concepts_a_revoir": list(set(concepts_a_revoir))[:5],  # Top 5 concepts
                "points_forts": self._identifier_points_forts(resultats),
                "progression_suggeree": self._suggerer_progression(score_moyen, niveau)
            }
            
        except Exception as e:
            current_app.logger.error(f"❌ Erreur génération recommandations: {e}")
            return {
                "error": str(e),
                "recommandations_etudiant": ["Continuez vos efforts !"],
                "recommandations_enseignant": ["Suivi personnalisé recommandé."]
            }
    
    def _generer_recommandations_etudiant(
        self,
        score_moyen: float,
        concepts_a_revoir: List[str],
        niveau: str,
        matiere: str
    ) -> List[str]:
        """Génère des recommandations personnalisées pour l'étudiant"""
        recommandations = []
        
        if score_moyen >= 80:
            recommandations.append("🌟 Excellent travail ! Vous maîtrisez très bien les concepts.")
            recommandations.append("💪 Défi : Essayez des exercices de niveau supérieur.")
        elif score_moyen >= 60:
            recommandations.append("✅ Bon niveau de compréhension général.")
            recommandations.append("📚 Continuez à pratiquer régulièrement pour consolider vos acquis.")
        else:
            recommandations.append("⚠️ Des lacunes importantes ont été identifiées.")
            recommandations.append("📖 Il est recommandé de revoir les fondamentaux du cours.")
        
        if concepts_a_revoir:
            concepts_uniques = list(set(concepts_a_revoir))[:3]
            recommandations.append(f"🎯 Focalisez-vous sur : {', '.join(concepts_uniques)}")
        
        recommandations.append("💡 N'hésitez pas à demander de l'aide à votre enseignant.")
        
        return recommandations
    
    def _generer_recommandations_enseignant(
        self,
        score_moyen: float,
        questions_difficiles: List[str],
        concepts_problematiques: List[str],
        nombre_evaluations: int
    ) -> List[str]:
        """Génère des recommandations pour l'enseignant"""
        recommandations = []
        
        if score_moyen < 60:
            recommandations.append("⚠️ Score moyen faible : Envisager une révision générale du chapitre.")
            recommandations.append("👥 Organiser des séances de remédiation en petits groupes.")
        
        if concepts_problematiques:
            concepts_freq = {}
            for concept in concepts_problematiques:
                concepts_freq[concept] = concepts_freq.get(concept, 0) + 1
            
            top_concepts = sorted(concepts_freq.items(), key=lambda x: x[1], reverse=True)[:3]
            recommandations.append(f"📊 Concepts les plus problématiques : {', '.join([c[0] for c in top_concepts])}")
        
        if questions_difficiles:
            recommandations.append(f"❓ {len(questions_difficiles)} questions ont posé problème à la majorité.")
            recommandations.append("💡 Prévoir des exercices supplémentaires sur ces points.")
        
        recommandations.append("📈 Proposer des ressources complémentaires (vidéos, exercices interactifs).")
        
        return recommandations
    
    def _determiner_niveau_maitrise(self, score: float) -> str:
        """Détermine le niveau de maîtrise basé sur le score"""
        if score >= 90:
            return "Excellente maîtrise"
        elif score >= 75:
            return "Bonne maîtrise"
        elif score >= 60:
            return "Maîtrise satisfaisante"
        elif score >= 40:
            return "Maîtrise partielle"
        else:
            return "Maîtrise insuffisante"
    
    def _identifier_points_forts(self, resultats: List[Dict[str, Any]]) -> List[str]:
        """Identifie les points forts de l'étudiant"""
        points_forts = []
        
        concepts_reussis = []
        for result in resultats:
            if result.get('score', 0) >= 80:
                if 'mots_cles_trouves' in result:
                    concepts_reussis.extend(result['mots_cles_trouves'])
        
        if concepts_reussis:
            # Prendre les 3 concepts les plus fréquents
            from collections import Counter
            concepts_freq = Counter(concepts_reussis)
            points_forts = [concept for concept, _ in concepts_freq.most_common(3)]
        
        return points_forts
    
    def _suggerer_progression(self, score_moyen: float, niveau: str) -> str:
        """Suggère une progression pédagogique"""
        if score_moyen >= 80:
            return "Prêt(e) pour le niveau supérieur ou des exercices avancés"
        elif score_moyen >= 60:
            return "Consolider les acquis avant de progresser"
        else:
            return "Revoir les fondamentaux avant d'avancer"
    
    # ============================================================================
    # UTILITAIRES
    # ============================================================================
    
    def _split_text_into_chunks(self, texte: str, max_length: int = 500) -> List[str]:
        """Découpe un texte en chunks de taille maximale"""
        # Découper par paragraphes d'abord
        paragraphes = [p.strip() for p in texte.split('\n\n') if p.strip()]
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphes:
            if len(current_chunk) + len(para) <= max_length:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        # Si le texte est très court, le découper par phrases
        if not chunks:
            phrases = [p.strip() + '.' for p in texte.split('.') if p.strip()]
            current_chunk = ""
            for phrase in phrases:
                if len(current_chunk) + len(phrase) <= max_length:
                    current_chunk += phrase + " "
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = phrase + " "
            if current_chunk:
                chunks.append(current_chunk.strip())
        
        return chunks if chunks else [texte[:max_length]]
    
    def _detecter_type_contenu(self, texte: str) -> str:
        """
        Détecte intelligemment le type de contenu fourni.
        
        Args:
            texte: Le texte à analyser
            
        Returns:
            str: "prompt_instruction", "contenu_cours", ou "sujet_court"
        """
        texte_lower = texte.lower()
        longueur = len(texte)
        
        # 1. Détecter un prompt d'instruction
        mots_instruction = ['génère', 'générer', 'crée', 'créer', 'fabrique', 'produis', 
                           'question', 'qcm', 'choix multiple', 'exercice']
        
        # Si le texte commence par un verbe d'instruction ou contient plusieurs mots d'instruction
        nb_mots_instruction = sum(1 for mot in mots_instruction if mot in texte_lower)
        
        if nb_mots_instruction >= 2 or texte_lower.strip().startswith(tuple(['génère', 'générer', 'crée', 'créer'])):
            return "prompt_instruction"
        
        # 2. Détecter un contenu de cours (texte long et descriptif)
        # Indicateurs : phrases longues, ponctuation, mots de liaison, longueur > 100 caractères
        nb_phrases = texte.count('.') + texte.count('!') + texte.count('?')
        nb_mots = len(texte.split())
        
        # Mots typiques d'un contenu de cours
        mots_cours = ['est', 'sont', 'permet', 'utilisé', 'définit', 'signifie', 
                      'exemple', 'cas', 'notamment', 'ainsi', 'donc', 'car', 'parce que']
        nb_mots_cours = sum(1 for mot in mots_cours if mot in texte_lower)
        
        # Si c'est un texte long (> 100 caractères) avec plusieurs phrases
        # et des mots typiques d'explication
        if longueur > 100 and nb_phrases >= 2 and nb_mots_cours >= 2:
            return "contenu_cours"
        
        # Si le texte est descriptif (contient des définitions, explications)
        if longueur > 80 and nb_mots > 15 and nb_phrases >= 1:
            # Vérifier si c'est plutôt descriptif qu'instructif
            if nb_mots_instruction == 0:
                return "contenu_cours"
        
        # 3. Par défaut : sujet court
        return "sujet_court"
    
    def _extraire_concepts_cles(self, texte: str, max_concepts: int = 5) -> List[str]:
        """
        Extrait les concepts clés d'un texte de manière intelligente.
        Fonctionne pour toutes les matières et tous les sujets.
        """
        from collections import Counter
        
        # Nettoyer le texte
        texte_clean = re.sub(r'[^\w\sàâäéèêëïîôùûüÿçœæ]', ' ', texte.lower())
        mots = texte_clean.split()
        concept_principal = concepts[0] if concepts else "ce concept"
        concepts_secondaires = concepts[1:4] if len(concepts) > 1 else ["option A", "option B", "option C"]
        
        # Compléter avec des options génériques si nécessaire
        while len(concepts_secondaires) < 3:
            concepts_secondaires.append(f"option {chr(66 + len(concepts_secondaires))}")
        
        # Templates de questions universelles adaptables à toute matière
        templates_universels = [
            {
                "texte": f"Qu'est-ce que {concept_principal} en {matiere} ?" if matiere else f"Qu'est-ce que {concept_principal} ?",
                "options": [
                    f"Un concept fondamental",
                    f"Une {concepts_secondaires[0]}",
                    f"Une {concepts_secondaires[1]}",
                    f"Une {concepts_secondaires[2]}"
                ],
                "correcte": 0
            },
            {
                "texte": f"Quelle est la caractéristique principale de {concept_principal} ?",
                "options": [
                    f"C'est un élément essentiel",
                    f"C'est une méthode secondaire",
                    f"C'est obsolète",
                    f"C'est optionnel"
                ],
                "correcte": 0
            },
            {
                "texte": f"Dans quel contexte utilise-t-on {concept_principal} ?",
                "options": [
                    f"Dans le cadre de {matiere}" if matiere else "Dans un contexte spécifique",
                    f"Uniquement en théorie",
                    f"Jamais en pratique",
                    f"Seulement en recherche"
                ],
                "correcte": 0
            },
            {
                "texte": f"Quel est le rôle principal de {concept_principal} ?",
                "options": [
                    f"Résoudre un problème spécifique",
                    f"Compliquer le processus",
                    f"Ralentir l'exécution",
                    f"Aucun rôle particulier"
                ],
                "correcte": 0
            }
        ]
        
        # Ajouter des questions spécifiques si on reconnaît des patterns dans le contexte
        # (garde quelques questions de qualité pour les matières courantes)
        questions_specifiques = {
            "Python": [
            {
                "texte": "Quelle est la différence principale entre une liste et un tuple en Python ?",
                "options": [
                    "Les listes sont mutables, les tuples sont immutables",
                    "Les tuples sont plus rapides",
                    "Les listes ne peuvent contenir que des entiers",
                    "Il n'y a aucune différence"
                ],
                "correcte": 0
            },
            {
                "texte": "Quel mot-clé est utilisé pour définir une fonction en Python ?",
                "options": [
                    "function",
                    "def",
                    "func",
                    "define"
                ],
                "correcte": 1
            },
            {
                "texte": "Comment accède-t-on au premier élément d'une liste 'ma_liste' en Python ?",
                "options": [
                    "ma_liste[1]",
                    "ma_liste[0]",
                    "ma_liste.first()",
                    "ma_liste{0}"
                ],
                "correcte": 1
            },
            {
                "texte": "Quelle méthode permet d'ajouter un élément à la fin d'une liste ?",
                "options": [
                    "add()",
                    "append()",
                    "insert()",
                    "push()"
                ],
                "correcte": 1
            },
            {
                "texte": "Quel opérateur est utilisé pour l'exponentiation en Python ?",
                "options": [
                    "^",
                    "**",
                    "exp()",
                    "pow"
                ],
                "correcte": 1
            },
            {
                "texte": "Comment déclare-t-on un dictionnaire vide en Python ?",
                "options": [
                    "dict = []",
                    "dict = {}",
                    "dict = ()",
                    "dict = set()"
                ],
                "correcte": 1
            },
            {
                "texte": "Quelle instruction permet de sortir d'une boucle prématurément ?",
                "options": [
                    "exit",
                    "break",
                    "stop",
                    "return"
                ],
                "correcte": 1
            },
            {
                "texte": "Quel mot-clé est utilisé pour importer un module en Python ?",
                "options": [
                    "include",
                    "import",
                    "require",
                    "using"
                ],
                "correcte": 1
            },
            {
                "texte": "Comment crée-t-on une chaîne de caractères sur plusieurs lignes ?",
                "options": [
                    'Avec des guillemets simples',
                    'Avec trois guillemets (""" ou \'\'\')',
                    'Avec des crochets []',
                    'Ce n\'est pas possible'
                ],
                "correcte": 1
            },
            {
                "texte": "Quelle fonction renvoie le nombre d'éléments dans une liste ?",
                "options": [
                    "size()",
                    "len()",
                    "count()",
                    "length()"
                ],
                "correcte": 1
            }
        ],
        "Mathématiques": [
            {
                "texte": "Quelle est la formule du théorème de Pythagore ?",
                "options": ["a² + b² = c²", "a + b = c", "a² - b² = c²", "a × b = c"],
                "correcte": 0
            },
            {
                "texte": "Combien y a-t-il de degrés dans un triangle ?",
                "options": ["90°", "180°", "270°", "360°"],
                "correcte": 1
            },
            {
                "texte": "Quelle est la dérivée de x² ?",
                "options": ["x", "2x", "x²", "2"],
                "correcte": 1
            }
        ],
        "Physique": [
            {
                "texte": "Quelle est la formule de la force selon Newton ?",
                "options": ["F = m × a", "F = m / a", "F = a / m", "F = m + a"],
                "correcte": 0
            },
            {
                "texte": "Quelle est l'unité de mesure de l'énergie ?",
                "options": ["Watt", "Joule", "Newton", "Pascal"],
                "correcte": 1
            }
        ],
        "Chimie": [
            {
                "texte": "Quel est le symbole chimique de l'eau ?",
                "options": ["H2O", "O2H", "HO2", "OH2"],
                "correcte": 0
            },
            {
                "texte": "Combien d'électrons possède l'atome de carbone ?",
                "options": ["4", "6", "8", "12"],
                "correcte": 1
            }
        ],
        "Histoire": [
            {
                "texte": "En quelle année a eu lieu la Révolution française ?",
                "options": ["1789", "1799", "1804", "1815"],
                "correcte": 0
            },
            {
                "texte": "Qui était le premier empereur romain ?",
                "options": ["Jules César", "Auguste", "Néron", "Constantin"],
                "correcte": 1
            }
        ],
        "Géographie": [
            {
                "texte": "Quelle est la capitale de la France ?",
                "options": ["Lyon", "Paris", "Marseille", "Bordeaux"],
                "correcte": 1
            },
            {
                "texte": "Quel est le plus grand océan du monde ?",
                "options": ["Atlantique", "Pacifique", "Indien", "Arctique"],
                "correcte": 1
            }
        ],
        "Français": [
            {
                "texte": "Quel est le participe passé du verbe 'faire' ?",
                "options": ["fai", "fait", "faisant", "faisé"],
                "correcte": 1
            },
            {
                "texte": "Quelle est la nature du mot 'lentement' ?",
                "options": ["Adjectif", "Adverbe", "Nom", "Verbe"],
                "correcte": 1
            }
        ],
        "Anglais": [
            {
                "texte": "What is the past tense of 'go'?",
                "options": ["goed", "went", "gone", "going"],
                "correcte": 1
            },
            {
                "texte": "Which article is used before a vowel sound?",
                "options": ["a", "an", "the", "no article"],
                "correcte": 1
            }
        ],
        "Économie": [
            {
                "texte": "Qu'est-ce que le PIB ?",
                "options": [
                    "Produit Intérieur Brut",
                    "Provision Internationale Bancaire",
                    "Production Industrielle Brute",
                    "Planification Investissement Budget"
                ],
                "correcte": 0
            },
            {
                "texte": "Selon la loi de l'offre et de la demande, que se passe-t-il quand la demande augmente ?",
                "options": [
                    "Le prix diminue",
                    "Le prix augmente",
                    "Le prix reste stable",
                    "L'offre diminue"
                ],
                "correcte": 1
            }
        ]
    }
        
        # Déterminer quelle source utiliser
        contexte_lower = contexte.lower()
        
        # Si on reconnaît une matière spécifique avec des patterns clairs, utiliser les questions de qualité
        questions_a_utiliser = templates_universels  # Par défaut : universel
        
        for matiere_cle, questions in questions_specifiques.items():
            matiere_lower = matiere_cle.lower()
            # Vérifier si le contexte ou la matière correspondent
            if matiere_lower in contexte_lower or (matiere and matiere_lower in matiere.lower()):
                # 70% de chance d'utiliser les questions spécifiques de qualité
                # 30% de chance d'utiliser les templates universels
                if random.random() < 0.7:
                    questions_a_utiliser = questions
                    break
        
        # Choisir une question
        template = random.choice(questions_a_utiliser)
        
        return {
            "texte": template["texte"],
            "reponse1": template["options"][0],
            "reponse2": template["options"][1],
            "reponse3": template["options"][2],
            "reponse4": template["options"][3],
            "bonne_reponse": template["correcte"] + 1
        }
    
    def _extraire_concepts_cles(self, texte: str, max_concepts: int = 5) -> List[str]:
        """
        Extrait les concepts clés d'un texte de manière intelligente.
        Fonctionne pour toutes les matières et tous les sujets.
        """
        from collections import Counter
        
        # Nettoyer le texte
        texte_clean = re.sub(r'[^\w\sàâäéèêëïîôùûüÿçœæ]', ' ', texte.lower())
        mots = texte_clean.split()
        
        # Liste étendue de mots vides (français + anglais)
        mots_vides = {
            # Français
            'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'est', 'sont', 
            'dans', 'pour', 'par', 'sur', 'avec', 'sans', 'sous', 'ce', 'ces', 'cet', 'cette',
            'qui', 'que', 'quoi', 'dont', 'où', 'mais', 'donc', 'car', 'ni', 'aux', 'au',
            'elle', 'il', 'ils', 'elles', 'nous', 'vous', 'leur', 'leurs', 'mon', 'ma', 'mes',
            'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'tout', 
            'tous', 'toute', 'toutes', 'quel', 'quelle', 'quels', 'quelles', 'si', 'très',
            'plus', 'moins', 'bien', 'mal', 'aussi', 'comme', 'même', 'être', 'avoir',
            'faire', 'dire', 'peut', 'peuvent', 'doit', 'doivent', 'était', 'étaient',
            # Anglais
            'the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
            'to', 'for', 'of', 'with', 'from', 'by', 'as', 'this', 'that', 'these', 'those',
            'it', 'its', 'you', 'your', 'he', 'she', 'his', 'her', 'they', 'their', 'them',
            'we', 'our', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'can', 'must', 'not', 'no', 'yes', 'but',
            'so', 'if', 'then', 'than', 'when', 'where', 'why', 'how', 'what', 'which',
            'who', 'whom', 'whose', 'all', 'some', 'any', 'many', 'much', 'more', 'most',
            # Mots de contexte/instruction
            'génère', 'générer', 'question', 'questions', 'qcm', 'choix', 'multiple',
            'réponse', 'réponses', 'bonne', 'correct', 'incorrecte', 'option', 'options',
            'exemple', 'exemples', 'notions', 'couvrir', 'about', 'generate', 'create',
            'answer', 'correct', 'incorrect', 'choice', 'multiple'
        }
        
        # Filtrer les mots significatifs (longueur > 3 pour garder plus de concepts)
        mots_significatifs = [m for m in mots if len(m) > 3 and m not in mots_vides]
        
        # Compter les occurrences
        freq = Counter(mots_significatifs)
        
        # Retourner les plus fréquents
        concepts = [mot.capitalize() for mot, _ in freq.most_common(max_concepts)]
        
        # Si pas assez de concepts, ajouter "concept" comme fallback
        if not concepts:
            concepts = ["concept principal"]
        elif len(concepts) < max_concepts:
            concepts.extend([f"élément {i}" for i in range(len(concepts) + 1, max_concepts + 1)])
        
        return concepts
    
    # ============================================================================
    # MÉTHODES DE COMPATIBILITÉ (pour l'existant)
    # ============================================================================
    
    def generer_qcm_complet(
        self, 
        sujet: str, 
        matiere: str, 
        niveau: str, 
        nombre_questions: int = 5,
        contexte: str = None
    ):
        """
        Génère un QCM complet à partir d'un sujet, contenu de cours ou prompt détaillé.
        
        Args:
            sujet: Peut être :
                   - Un sujet court (ex: "Les variables en Python")
                   - Un contenu de cours complet (ex: "Python est un langage...")
                   - Un prompt d'instruction (ex: "Génère 5 questions sur...")
            matiere: Nom de la matière
            niveau: Niveau des étudiants
            nombre_questions: Nombre de questions à générer
            contexte: Contexte/prompt détaillé optionnel (prioritaire sur sujet)
            
        Returns:
            Dict avec les questions générées
        """
        # Si un contexte détaillé est fourni, l'utiliser directement
        if contexte:
            current_app.logger.info("📄 Utilisation du contexte fourni")
            document_source = contexte
        else:
            # Analyser le contenu du champ "sujet" pour déterminer son type
            type_sujet = self._detecter_type_contenu(sujet)
            
            if type_sujet == "prompt_instruction":
                # C'est un prompt d'instruction (ex: "Génère 5 questions sur...")
                current_app.logger.info("🎯 Détection d'un prompt d'instruction")
                document_source = sujet
                
            elif type_sujet == "contenu_cours":
                # C'est du contenu de cours direct (texte long et descriptif)
                current_app.logger.info("📚 Détection d'un contenu de cours")
                document_source = sujet
                
            else:
                # Sujet court : créer un document fictif structuré
                current_app.logger.info("🏷️ Détection d'un sujet court, création d'un contexte")
                document_source = f"""Cours sur {sujet} en {matiere} pour le niveau {niveau}.
        
Ce cours couvre les aspects principaux de {sujet}, incluant les concepts fondamentaux,
les applications pratiques et les exemples concrets. Les étudiants doivent comprendre
les principes de base et savoir les appliquer dans différents contextes.

Thèmes à maîtriser :
- Définitions et concepts clés de {sujet}
- Applications pratiques et exemples
- Méthodologie et bonnes pratiques
- Cas d'usage courants"""
        
        return self.generer_qcm_depuis_document(
            contenu_document=document_source,
            nombre_questions=nombre_questions,
            matiere=matiere,
            niveau=niveau
        )
