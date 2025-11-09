from ..extensions import db
from datetime import datetime, timezone
from enum import Enum

class TypeExercice(Enum):
    QCM = "QCM"
    VRAI_FAUX = "Vrai/Faux"
    QUESTION_OUVERTE = "Question ouverte"

class Difficulte(Enum):
    FACILE = "Facile"
    MOYEN = "Moyen"
    DIFFICILE = "Difficile"

class QCM(db.Model):
    __tablename__ = 'qcms'

    id = db.Column(db.Integer, primary_key=True)
    titre = db.Column(db.String(255), nullable=False)
    type_exercice = db.Column(db.Enum(TypeExercice), nullable=False, default=TypeExercice.QCM)
    difficulte = db.Column(db.Enum(Difficulte), nullable=False, default=Difficulte.MOYEN)
    duree_minutes = db.Column(db.Integer, nullable=True)  # Durée en minutes (définie par l'enseignant)
    est_publie = db.Column(db.Boolean, default=False)  # QCM publié ou non (visible pour les étudiants)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Clé étrangère vers le document associé (optionnel pour les QCM générés par IA)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=True)
    
    # Champs de ciblage pour les étudiants
    niveau_id = db.Column(db.Integer, db.ForeignKey('niveaux.id'), nullable=True)
    parcours_id = db.Column(db.Integer, db.ForeignKey('parcours.id'), nullable=True)
    est_cible = db.Column(db.Boolean, default=False)  # Si True, le QCM est ciblé par niveau/parcours
    
    # Clé étrangère vers la matière
    matiere_id = db.Column(db.Integer, db.ForeignKey('matieres.id'), nullable=True)

    # Relations
    questions = db.relationship('Question', backref='qcm', lazy=True, cascade='all, delete-orphan')
    niveau = db.relationship('Niveau', lazy=True)
    parcours = db.relationship('Parcours', lazy=True)
    matiere = db.relationship('Matiere', lazy=True)

    def __repr__(self):
        return f'<QCM {self.titre}>'

    def to_dict(self):
        return {
            'id': self.id,
            'titre': self.titre,
            'type_exercice': self.type_exercice.value,
            'difficulte': self.difficulte.value,
            'duree_minutes': self.duree_minutes,
            'est_publie': self.est_publie,
            'date_creation': self.date_creation.isoformat(),
            'questions': [q.to_dict() for q in self.questions],
            # Informations de ciblage
            'est_cible': self.est_cible,
            'niveau_id': self.niveau_id,
            'parcours_id': self.parcours_id,
            'niveau': self.niveau.to_dict() if self.niveau else None,
            'parcours': self.parcours.to_dict() if self.parcours else None,
            'matiere': self.matiere.to_dict() if self.matiere else None,
            'ciblage_text': self.get_ciblage_text()
        }
    
    def get_ciblage_text(self):
        """Retourne un texte descriptif du ciblage du QCM"""
        if not self.est_cible:
            return "Tous les étudiants"
        
        niveau_text = self.niveau.code if self.niveau else "Tous niveaux"
        parcours_text = self.parcours.code if self.parcours else "Tous parcours"
        
        return f"{niveau_text} - {parcours_text}"

class Question(db.Model):
    __tablename__ = 'questions'

    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.Text, nullable=False)  # La question
    qcm_id = db.Column(db.Integer, db.ForeignKey('qcms.id'), nullable=False, index=True)
    
    # Nouvelles colonnes pour le format CSV
    reponse1 = db.Column(db.Text, nullable=True)
    reponse2 = db.Column(db.Text, nullable=True)
    reponse3 = db.Column(db.Text, nullable=True)
    reponse4 = db.Column(db.Text, nullable=True)
    bonne_reponse = db.Column(db.Integer, nullable=True)  # 1, 2, 3, ou 4

    def __repr__(self):
        return f'<Question {self.question[:50]}>'

    def to_dict(self):
        # Créer les options avec les lettres A, B, C, D
        options = []
        letters = ["A", "B", "C", "D"]
        reponses = [self.reponse1, self.reponse2, self.reponse3, self.reponse4]
        
        for i, reponse in enumerate(reponses):
            if reponse:  # Seulement si la réponse existe
                options.append({
                    'id': f"{self.id}_{i+1}",
                    'lettre': letters[i],
                    'texte': reponse,
                    'texte_complet': f"{letters[i]} - {reponse}",
                    'est_correcte': self.bonne_reponse == (i + 1),
                    'index': i + 1
                })
        
        return {
            'id': self.id,
            'texte': self.question,  # Garder 'texte' pour la compatibilité avec le frontend
            'question': self.question,  # Ajouter le nouveau champ
            'options': options,
            'bonne_reponse_lettre': letters[self.bonne_reponse - 1] if self.bonne_reponse else None,
            'bonne_reponse_index': self.bonne_reponse,
            # Format CSV pour l'export/import
            'csv_format': {
                'question': self.question,
                'reponse1': self.reponse1,
                'reponse2': self.reponse2,
                'reponse3': self.reponse3,
                'reponse4': self.reponse4,
                'bonne_reponse': self.bonne_reponse,
                'bonne_reponse_lettre': letters[self.bonne_reponse - 1] if self.bonne_reponse else None
            }
        }
    
    def get_reponse_by_index(self, index):
        """Retourne la réponse correspondant à l'index (1-4)"""
        reponses = [self.reponse1, self.reponse2, self.reponse3, self.reponse4]
        if 1 <= index <= 4:
            return reponses[index - 1]
        return None
    
    def is_correct_answer(self, selected_index):
        """Vérifie si l'index sélectionné correspond à la bonne réponse"""
        return self.bonne_reponse == selected_index

# La classe OptionReponse a été supprimée car nous utilisons maintenant le format CSV
# Les options sont maintenant stockées directement dans la table Question
