from ..extensions import db
from datetime import datetime, timezone

class Matiere(db.Model):
    __tablename__ = 'matieres'

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(150), nullable=False, unique=True)  # "Mathématiques", "Informatique"
    code = db.Column(db.String(10), nullable=False, unique=True)  # "MATH", "INFO"
    description = db.Column(db.Text)
    credits = db.Column(db.Integer, default=3)  # Nombre de crédits
    est_actif = db.Column(db.Boolean, default=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relations
    assignations = db.relationship("MatiereEnseignantNiveauParcours", lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Matiere {self.code}: {self.nom}>'

    def to_dict(self):
        return {
            'id': self.id,
            'nom': self.nom,
            'code': self.code,
            'description': self.description,
            'credits': self.credits,
            'est_actif': self.est_actif,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None,
            'assignations_count': len(self.assignations) if self.assignations else 0
        }

    def activer(self):
        self.est_actif = True
        db.session.commit()

    def desactiver(self):
        self.est_actif = False
        db.session.commit()

# Table de liaison avancée entre Matiere, Enseignant, Niveau et Parcours
class MatiereEnseignantNiveauParcours(db.Model):
    __tablename__ = 'matiere_enseignant_niveau_parcours'

    id = db.Column(db.Integer, primary_key=True)
    matiere_id = db.Column(db.Integer, db.ForeignKey('matieres.id'), nullable=False)
    enseignant_id = db.Column(db.Integer, db.ForeignKey('enseignant.id'), nullable=False)
    niveau_id = db.Column(db.Integer, db.ForeignKey('niveaux.id'), nullable=True)  # Optionnel
    parcours_id = db.Column(db.Integer, db.ForeignKey('parcours.id'), nullable=True)  # Optionnel
    est_actif = db.Column(db.Boolean, default=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relations
    matiere = db.relationship("Matiere", lazy=True, overlaps="assignations")
    enseignant = db.relationship("Enseignant", lazy=True, overlaps="assignations")
    niveau = db.relationship("Niveau", lazy=True)
    parcours = db.relationship("Parcours", lazy=True)

    def __repr__(self):
        return f'<Assignation {self.matiere.code} -> {self.enseignant.utilisateur.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'matiere_id': self.matiere_id,
            'enseignant_id': self.enseignant_id,
            'niveau_id': self.niveau_id,
            'parcours_id': self.parcours_id,
            'est_actif': self.est_actif,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None,
            'matiere': {
                'id': self.matiere.id,
                'nom': self.matiere.nom,
                'code': self.matiere.code
            } if self.matiere else None,
            'enseignant': {
                'id': self.enseignant.id,
                'utilisateur': {
                    'id': self.enseignant.utilisateur.id,
                    'username': self.enseignant.utilisateur.username,
                    'email': self.enseignant.utilisateur.email
                }
            } if self.enseignant else None,
            'niveau': {
                'id': self.niveau.id,
                'nom': self.niveau.nom,
                'code': self.niveau.code
            } if self.niveau else None,
            'parcours': {
                'id': self.parcours.id,
                'nom': self.parcours.nom,
                'code': self.parcours.code
            } if self.parcours else None
        }
