from ..extensions import db
from datetime import datetime, UTC


class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    titre = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'pdf' ou 'txt'
    contenu = db.Column(db.Text, nullable=False)  # Texte extrait
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    enseignant_id = db.Column(db.Integer, db.ForeignKey('utilisateur.id'), nullable=False)

    # Relations
    qcms = db.relationship('QCM', backref='document', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Document {self.titre}>'

    def extraire_text(self):
        """Méthode pour extraire le texte du document"""
        return self.contenu

    def valider_format(self):
        """Valider le format du document"""
        return self.type in ['pdf', 'txt', 'docx']

    def sauvegarder(self):
        """Sauvegarder le document"""
        db.session.add(self)
        db.session.commit()

    def modifier(self):
        """Modifier le document"""
        db.session.commit()

    def supprimer(self):
        """Supprimer le document"""
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        return {
            'id': self.id,
            'titre': self.titre,
            'type': self.type,
            'date_upload': self.created_at.isoformat(),
            'enseignant_id': self.enseignant_id
        }