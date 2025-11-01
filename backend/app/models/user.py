from ..extensions import db
from datetime import datetime

class Utilisateur(db.Model):
    __tablename__ = "utilisateur"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin'/'enseignant'/'etudiant'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # relations One-to-One (backrefs)
    etudiant = db.relationship("Etudiant", uselist=False, back_populates="utilisateur")
    enseignant = db.relationship("Enseignant", uselist=False, back_populates="utilisateur")
    admin = db.relationship("Admin", uselist=False, back_populates="utilisateur")

    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.password = generate_password_hash(password)
    
    def check_password(self, bcrypt, password):
        return bcrypt.check_password(self.password, password)

class Etudiant(db.Model):
    __tablename__ = "etudiant"
    id = db.Column(db.Integer, primary_key=True)
    utilisateur_id = db.Column(db.Integer, db.ForeignKey("utilisateur.id"), unique=True, nullable=False)
    matriculeId = db.Column(db.String(50), nullable=False)
    est_actif = db.Column(db.Boolean, default=True)
    annee_universitaire = db.Column(db.String(20), nullable=False, default="2024-2025")
    
    # Clés étrangères vers les tables Niveau, Parcours et Mention
    niveau_id = db.Column(db.Integer, db.ForeignKey("niveaux.id"), nullable=True)
    parcours_id = db.Column(db.Integer, db.ForeignKey("parcours.id"), nullable=True)
    mention_id = db.Column(db.Integer, db.ForeignKey("mention.id"), nullable=True)
    
    # Relations
    utilisateur = db.relationship("Utilisateur", back_populates="etudiant")
    niveau_obj = db.relationship("Niveau", lazy=True)
    parcours_obj = db.relationship("Parcours", lazy=True)
    mention_obj = db.relationship("Mention", back_populates="etudiants", lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'utilisateur_id': self.utilisateur_id,
            'matriculeId': self.matriculeId,
            'est_actif': self.est_actif,
            'annee_universitaire': self.annee_universitaire,
            'niveau_id': self.niveau_id,
            'parcours_id': self.parcours_id,
            'mention_id': self.mention_id,
            'niveau': self.niveau_obj.to_dict() if self.niveau_obj else None,
            'parcours': self.parcours_obj.to_dict() if self.parcours_obj else None,
            'mention': self.mention_obj.to_dict() if self.mention_obj else None,
            'utilisateur': {
                'id': self.utilisateur.id,
                'username': self.utilisateur.username,
                'email': self.utilisateur.email,
                'role': self.utilisateur.role
            } if self.utilisateur else None
        }

class Enseignant(db.Model):
    __tablename__ = "enseignant"
    id = db.Column(db.Integer, primary_key=True)
    utilisateur_id = db.Column(db.Integer, db.ForeignKey("utilisateur.id"), unique=True, nullable=False)
    departement = db.Column(db.String(120))
    est_actif = db.Column(db.Boolean, default=True)
    utilisateur = db.relationship("Utilisateur", back_populates="enseignant")
    assignations = db.relationship("MatiereEnseignantNiveauParcours", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'utilisateur_id': self.utilisateur_id,
            'departement': self.departement,
            'est_actif': self.est_actif,
            'assignations': [assignation.to_dict() for assignation in self.assignations] if self.assignations else [],
            'utilisateur': {
                'id': self.utilisateur.id,
                'username': self.utilisateur.username,
                'email': self.utilisateur.email,
                'role': self.utilisateur.role
            } if self.utilisateur else None
        }

class Admin(db.Model):
    __tablename__ = "admin"
    id = db.Column(db.Integer, primary_key=True)
    utilisateur_id = db.Column(db.Integer, db.ForeignKey("utilisateur.id"), unique=True, nullable=False)
    departement = db.Column(db.String(120))
    est_actif = db.Column(db.Boolean, default=True)
    utilisateur = db.relationship("Utilisateur", back_populates="admin")

    def to_dict(self):
        return {
            'id': self.id,
            'utilisateur_id': self.utilisateur_id,
            'departement': self.departement,
            'est_actif': self.est_actif,
            'utilisateur': {
                'id': self.utilisateur.id,
                'username': self.utilisateur.username,
                'email': self.utilisateur.email,
                'role': self.utilisateur.role
            } if self.utilisateur else None
        }
