from ..extensions import db
from datetime import datetime, timezone

class Resultat(db.Model):
    __tablename__ = 'resultats'

    id = db.Column(db.Integer, primary_key=True)
    note = db.Column(db.Float, nullable=False)  # Note sur 20
    feedback = db.Column(db.Text)
    date_correction = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    temps_total = db.Column(db.Integer)  # en secondes
    nombre_correctes = db.Column(db.Integer, default=0)
    nombre_incorrectes = db.Column(db.Integer, default=0)
    pourcentage = db.Column(db.Float)

    # Clés étrangères
    etudiant_id = db.Column(db.Integer, db.ForeignKey("etudiant.id"), nullable=False)
    qcm_id = db.Column(db.Integer, db.ForeignKey("qcms.id"), nullable=False)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluations.id"), nullable=True)

    # Relations
    etudiant = db.relationship("Etudiant", backref="resultats")
    qcm = db.relationship("QCM", backref="resultats")
    evaluation = db.relationship("Evaluation", overlaps="evaluation_obj,resultats")  # relation simple côté Resultat

    def __repr__(self):
        return f'<Resultat {self.note}/20>'

    def calculer_note(self):
        if self.nombre_correctes + self.nombre_incorrectes > 0:
            self.pourcentage = (self.nombre_correctes / (self.nombre_correctes + self.nombre_incorrectes)) * 100
            self.note = (self.pourcentage / 100) * 20
        else:
            self.pourcentage = 0
            self.note = 0
        db.session.commit()

    def generer_feedback(self):
        if self.pourcentage >= 90:
            self.feedback = "Excellent travail ! Vous maîtrisez parfaitement le sujet."
        elif self.pourcentage >= 80:
            self.feedback = "Très bien ! Quelques petites erreurs à corriger."
        elif self.pourcentage >= 70:
            self.feedback = "Bien ! Continuez vos efforts, vous êtes sur la bonne voie."
        elif self.pourcentage >= 60:
            self.feedback = "Passable. Il serait bon de réviser certains points."
        else:
            self.feedback = "Il faut revoir les concepts de base. N'hésitez pas à demander de l'aide."
        db.session.commit()

    def generer_rapport(self):
        return {
            'note': self.note,
            'pourcentage': self.pourcentage,
            'feedback': self.feedback,
            'statistiques': {
                'correctes': self.nombre_correctes,
                'incorrectes': self.nombre_incorrectes,
                'temps_total': self.temps_total
            }
        }

    def archiver_resultat(self):
        db.session.commit()

    def to_dict(self):
        return {
            'id': self.id,
            'note': self.note,
            'feedback': self.feedback,
            'date_correction': self.date_correction.isoformat(),
            'pourcentage': self.pourcentage,
            'nombre_correctes': self.nombre_correctes,
            'nombre_incorrectes': self.nombre_incorrectes,
            'temps_total': self.temps_total,
            'etudiant': {
                "id": self.etudiant.id,
                "matricule": self.etudiant.matriculeId,
                "nom_utilisateur": self.etudiant.utilisateur.username
            },
            'qcm': {
                "id": self.qcm.id,
                "titre": self.qcm.titre
            },
            'evaluation': {
                "id": self.evaluation.id if self.evaluation else None,
                "matiere": getattr(self.evaluation, "matiere", None) if self.evaluation else None
            }
        }
