from ..extensions import db
from datetime import datetime, timezone

# Table de liaison pour la relation many-to-many entre Parcours et Niveau
parcours_niveaux = db.Table('parcours_niveaux',
    db.Column('parcours_id', db.Integer, db.ForeignKey('parcours.id'), primary_key=True),
    db.Column('niveau_id', db.Integer, db.ForeignKey('niveaux.id'), primary_key=True)
)

class Mention(db.Model):
    __tablename__ = "mention"
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False, unique=True)
    code = db.Column(db.String(20), nullable=False, unique=True)
    est_actif = db.Column(db.Boolean, default=True)
    
    # Relations
    parcours = db.relationship("Parcours", back_populates="mention", cascade="all, delete-orphan")
    etudiants = db.relationship("Etudiant", back_populates="mention_obj")
    
    def to_dict(self, include_parcours=True):
        result = {
            'id': self.id,
            'nom': self.nom,
            'code': self.code,
            'est_actif': self.est_actif
        }
        if include_parcours and self.parcours:
            result['parcours'] = [parcours.to_dict(include_mention=False) for parcours in self.parcours]
        return result

class Niveau(db.Model):
    __tablename__ = 'niveaux'

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False, unique=True)  # "Licence 1", "Master 2"
    code = db.Column(db.String(10), nullable=False, unique=True)  # "L1", "M2"
    description = db.Column(db.Text)
    ordre = db.Column(db.Integer, default=0)  # Pour l'ordre d'affichage
    est_actif = db.Column(db.Boolean, default=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relations
    etudiants = db.relationship("Etudiant", lazy=True, overlaps="niveau_obj")
    parcours = db.relationship("Parcours", secondary=parcours_niveaux, back_populates="niveaux")

    def __repr__(self):
        return f'<Niveau {self.code}: {self.nom}>'

    def to_dict(self):
        return {
            'id': self.id,
            'nom': self.nom,
            'code': self.code,
            'description': self.description,
            'ordre': self.ordre,
            'est_actif': self.est_actif,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None
        }

    def activer(self):
        self.est_actif = True
        db.session.commit()

    def desactiver(self):
        self.est_actif = False
        db.session.commit()

class Parcours(db.Model):
    __tablename__ = 'parcours'

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(150), nullable=False)  # "Informatique Générale"
    code = db.Column(db.String(10), nullable=False, unique=True)  # "IG", "GB", "SR"
    description = db.Column(db.Text)
    est_actif = db.Column(db.Boolean, default=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Clé étrangère vers Mention
    mention_id = db.Column(db.Integer, db.ForeignKey("mention.id"), nullable=True)

    # Relations
    etudiants = db.relationship("Etudiant", lazy=True, overlaps="parcours_obj")
    mention = db.relationship("Mention", back_populates="parcours", lazy=True)
    niveaux = db.relationship("Niveau", secondary=parcours_niveaux, back_populates="parcours")

    def __repr__(self):
        return f'<Parcours {self.code}: {self.nom}>'

    def to_dict(self, include_mention=True, include_niveaux=True):
        result = {
            'id': self.id,
            'nom': self.nom,
            'code': self.code,
            'description': self.description,
            'est_actif': self.est_actif,
            'mention_id': self.mention_id,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None
        }
        if include_mention and self.mention:
            result['mention'] = self.mention.to_dict(include_parcours=False)
        if include_niveaux:
            result['niveaux'] = [niveau.to_dict() for niveau in self.niveaux] if self.niveaux else []
        return result

    def activer(self):
        self.est_actif = True
        db.session.commit()

    def desactiver(self):
        self.est_actif = False
        db.session.commit()
