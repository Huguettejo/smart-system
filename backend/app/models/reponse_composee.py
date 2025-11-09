from ..extensions import db
from datetime import datetime, timezone

class ReponseComposee(db.Model):
    __tablename__ = 'reponses_composees'

    id = db.Column(db.Integer, primary_key=True)
    contenu = db.Column(db.Text, nullable=False)
    date_soumission = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    temps_execution = db.Column(db.Integer)  # en secondes
    est_correcte = db.Column(db.Boolean, default=False)
    statut = db.Column(db.String(20), default='soumis')  # 'soumis', 'en_correction', 'corrigé'

    # Clés étrangères
    etudiant_id = db.Column(db.Integer, db.ForeignKey('etudiant.id'), nullable=False)
    qcm_id = db.Column(db.Integer, db.ForeignKey('qcms.id'), nullable=False)
    evaluation_id = db.Column(db.Integer, db.ForeignKey('evaluations.id'), nullable=True)

    # Relations
    etudiant = db.relationship('Etudiant', backref='reponses_composees')
    qcm = db.relationship('QCM', backref='reponses_composees')

    def __repr__(self):
        return f'<ReponseComposee {self.id}>'

    def soumettre_reponse(self):
        db.session.add(self)
        db.session.commit()

    def valider(self):
        return bool(self.contenu)

    def sauvegarder(self):
        db.session.add(self)
        db.session.commit()

    def to_dict(self):
        return {
            'id': self.id,
            'contenu': self.contenu,
            'date_soumission': self.date_soumission.isoformat(),
            'temps_execution': self.temps_execution,
            'est_correcte': self.est_correcte,
            'statut': self.statut,
            'etudiant_id': self.etudiant_id,
            'qcm_id': self.qcm_id
        }

class Evaluation(db.Model):
    __tablename__ = 'evaluations'

    id = db.Column(db.Integer, primary_key=True)
    titre = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    duree_limite = db.Column(db.Integer)  # en minutes
    nombre_questions = db.Column(db.Integer, default=20)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    date_limite = db.Column(db.DateTime)
    est_active = db.Column(db.Boolean, default=True)

    # Clés étrangères
    enseignant_id = db.Column(db.Integer, db.ForeignKey('utilisateur.id'), nullable=False)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)

    # Relations
    reponses = db.relationship('ReponseComposee', backref='evaluation', lazy=True)
    resultats = db.relationship("Resultat", backref="evaluation_obj", lazy=True)  # backref corrigé pour éviter conflit

    def __repr__(self):
        return f'<Evaluation {self.titre}>'

    def creer_evaluation(self):
        db.session.add(self)
        db.session.commit()

    def modifier_evaluation(self):
        db.session.commit()

    def supprimer_evaluation(self):
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        return {
            'id': self.id,
            'titre': self.titre,
            'description': self.description,
            'duree_limite': self.duree_limite,
            'nombre_questions': self.nombre_questions,
            'date_creation': self.date_creation.isoformat(),
            'date_limite': self.date_limite.isoformat() if self.date_limite else None,
            'est_active': self.est_active
        }
