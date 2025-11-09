#!/usr/bin/env python
"""
Script pour enrichir la base de données avec des données de test
Usage: python seed_database.py
"""

from app import create_app
from app.extensions import db, bcrypt
from app.models.user import Utilisateur, Admin, Enseignant, Etudiant
from app.models.matiere import Matiere, MatiereEnseignantNiveauParcours
from app.models.niveau_parcours import Mention, Niveau, Parcours
from datetime import datetime

def create_mentions():
    """Créer les mentions"""
    print("📚 Création des mentions...")
    mentions_data = [
        {"nom": "Sciences et Technologies", "code": "ST"},
        {"nom": "Sciences Économiques et de Gestion", "code": "SEG"},
        {"nom": "Lettres et Sciences Humaines", "code": "LSH"},
    ]
    
    mentions = []
    for data in mentions_data:
        mention = Mention.query.filter_by(code=data["code"]).first()
        if not mention:
            mention = Mention(**data, est_actif=True)
            db.session.add(mention)
            mentions.append(mention)
            print(f"  ✅ Mention créée: {data['nom']} ({data['code']})")
        else:
            mentions.append(mention)
            print(f"  ⏭️  Mention existe déjà: {data['nom']} ({data['code']})")
    
    db.session.commit()
    return mentions

def create_niveaux():
    """Créer les niveaux"""
    print("\n📊 Création des niveaux...")
    niveaux_data = [
        {"nom": "Licence 1", "code": "L1", "ordre": 1},
        {"nom": "Licence 2", "code": "L2", "ordre": 2},
        {"nom": "Licence 3", "code": "L3", "ordre": 3},
        {"nom": "Master 1", "code": "M1", "ordre": 4},
        {"nom": "Master 2", "code": "M2", "ordre": 5},
    ]
    
    niveaux = []
    for data in niveaux_data:
        niveau = Niveau.query.filter_by(code=data["code"]).first()
        if not niveau:
            niveau = Niveau(**data, est_actif=True)
            db.session.add(niveau)
            niveaux.append(niveau)
            print(f"  ✅ Niveau créé: {data['nom']} ({data['code']})")
        else:
            niveaux.append(niveau)
            print(f"  ⏭️  Niveau existe déjà: {data['nom']} ({data['code']})")
    
    db.session.commit()
    return niveaux

def create_parcours(mentions):
    """Créer les parcours"""
    print("\n🎓 Création des parcours...")
    parcours_data = [
        {"nom": "Informatique Générale", "code": "IG", "mention": "ST"},
        {"nom": "Génie Logiciel", "code": "GL", "mention": "ST"},
        {"nom": "Réseaux et Télécommunications", "code": "RT", "mention": "ST"},
        {"nom": "Gestion des Entreprises", "code": "GE", "mention": "SEG"},
        {"nom": "Comptabilité et Finance", "code": "CF", "mention": "SEG"},
    ]
    
    parcours_list = []
    for data in parcours_data:
        parcours = Parcours.query.filter_by(code=data["code"]).first()
        if not parcours:
            mention = next((m for m in mentions if m.code == data["mention"]), None)
            parcours = Parcours(
                nom=data["nom"],
                code=data["code"],
                mention_id=mention.id if mention else None,
                est_actif=True
            )
            db.session.add(parcours)
            parcours_list.append(parcours)
            print(f"  ✅ Parcours créé: {data['nom']} ({data['code']})")
        else:
            parcours_list.append(parcours)
            print(f"  ⏭️  Parcours existe déjà: {data['nom']} ({data['code']})")
    
    db.session.commit()
    return parcours_list

def create_matieres():
    """Créer les matières"""
    print("\n📖 Création des matières...")
    matieres_data = [
        {"nom": "Programmation Python", "code": "PYTHON", "credits": 4},
        {"nom": "Base de données", "code": "BDD", "credits": 3},
        {"nom": "Algorithmes et Structures de Données", "code": "ALGO", "credits": 4},
        {"nom": "Réseaux Informatiques", "code": "RESEAU", "credits": 3},
        {"nom": "Développement Web", "code": "WEB", "credits": 4},
        {"nom": "Intelligence Artificielle", "code": "IA", "credits": 3},
        {"nom": "Mathématiques Appliquées", "code": "MATH", "credits": 3},
        {"nom": "Gestion de Projet", "code": "PROJET", "credits": 2},
    ]
    
    matieres = []
    for data in matieres_data:
        matiere = Matiere.query.filter_by(code=data["code"]).first()
        if not matiere:
            matiere = Matiere(**data, est_actif=True)
            db.session.add(matiere)
            matieres.append(matiere)
            print(f"  ✅ Matière créée: {data['nom']} ({data['code']})")
        else:
            matieres.append(matiere)
            print(f"  ⏭️  Matière existe déjà: {data['nom']} ({data['code']})")
    
    db.session.commit()
    return matieres

def create_admin():
    """Créer un administrateur"""
    print("\n👤 Création de l'administrateur...")
    
    username = "admin"
    email = "admin@systeme-intelligent.com"
    password = "admin123"  # Mot de passe par défaut
    
    # Vérifier si l'admin existe déjà
    existing_user = Utilisateur.query.filter_by(username=username).first()
    if existing_user:
        print(f"  ⏭️  Admin existe déjà: {username}")
        return existing_user
    
    # Créer l'utilisateur admin
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    user = Utilisateur(
        username=username,
        email=email,
        password=hashed_password,
        role="admin"
    )
    db.session.add(user)
    db.session.flush()
    
    # Créer l'enregistrement admin
    admin = Admin(
        utilisateur_id=user.id,
        departement="Administration",
        est_actif=True
    )
    db.session.add(admin)
    db.session.commit()
    
    print(f"  ✅ Admin créé: {username} / {password}")
    return user

def create_enseignants(nb=5):
    """Créer des enseignants"""
    print(f"\n👨‍🏫 Création de {nb} enseignants...")
    
    enseignants_data = [
        {"username": "fontaine", "email": "fontaine@systeme-intelligent.com", "departement": "Informatique"},
        {"username": "dupont", "email": "dupont@systeme-intelligent.com", "departement": "Informatique"},
        {"username": "martin", "email": "martin@systeme-intelligent.com", "departement": "Mathématiques"},
        {"username": "bernard", "email": "bernard@systeme-intelligent.com", "departement": "Réseaux"},
        {"username": "thomas", "email": "thomas@systeme-intelligent.com", "departement": "IA"},
    ]
    
    password = "enseignant123"  # Mot de passe par défaut
    enseignants = []
    
    for i, data in enumerate(enseignants_data[:nb]):
        # Vérifier si l'enseignant existe déjà
        existing_user = Utilisateur.query.filter_by(username=data["username"]).first()
        if existing_user:
            print(f"  ⏭️  Enseignant existe déjà: {data['username']}")
            enseignants.append(existing_user.enseignant)
            continue
        
        # Créer l'utilisateur
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = Utilisateur(
            username=data["username"],
            email=data["email"],
            password=hashed_password,
            role="enseignant"
        )
        db.session.add(user)
        db.session.flush()
        
        # Créer l'enregistrement enseignant
        enseignant = Enseignant(
            utilisateur_id=user.id,
            departement=data["departement"],
            est_actif=True
        )
        db.session.add(enseignant)
        enseignants.append(enseignant)
        print(f"  ✅ Enseignant créé: {data['username']} / {password}")
    
    db.session.commit()
    return enseignants

def create_etudiants(niveaux, parcours, mentions, nb=10):
    """Créer des étudiants"""
    print(f"\n👨‍🎓 Création de {nb} étudiants...")
    
    password = "etudiant123"  # Mot de passe par défaut
    etudiants = []
    
    # Répartir les étudiants sur différents niveaux et parcours
    for i in range(1, nb + 1):
        username = f"etudiant{i:03d}"
        email = f"etudiant{i:03d}@systeme-intelligent.com"
        matricule = f"ETU{i:05d}"
        
        # Vérifier si l'étudiant existe déjà
        existing_user = Utilisateur.query.filter_by(username=username).first()
        if existing_user:
            print(f"  ⏭️  Étudiant existe déjà: {username}")
            etudiants.append(existing_user.etudiant)
            continue
        
        # Répartir sur les niveaux et parcours
        niveau = niveaux[i % len(niveaux)]
        parcours_obj = parcours[i % len(parcours)]
        mention = mentions[i % len(mentions)]
        
        # Créer l'utilisateur
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = Utilisateur(
            username=username,
            email=email,
            password=hashed_password,
            role="etudiant"
        )
        db.session.add(user)
        db.session.flush()
        
        # Créer l'enregistrement étudiant
        etudiant = Etudiant(
            utilisateur_id=user.id,
            matriculeId=matricule,
            niveau_id=niveau.id,
            parcours_id=parcours_obj.id,
            mention_id=mention.id,
            annee_universitaire="2024-2025",
            est_actif=True
        )
        db.session.add(etudiant)
        etudiants.append(etudiant)
        print(f"  ✅ Étudiant créé: {username} ({matricule}) - {niveau.nom} / {parcours_obj.nom} / {password}")
    
    db.session.commit()
    return etudiants

def assign_matieres_to_enseignants(enseignants, matieres, niveaux, parcours):
    """Assigner des matières aux enseignants"""
    print("\n📝 Assignation des matières aux enseignants...")
    
    # Assignations par défaut
    assignations = [
        {"enseignant": 0, "matiere": "PYTHON", "niveau": "L1", "parcours": "IG"},
        {"enseignant": 0, "matiere": "PYTHON", "niveau": "L2", "parcours": "IG"},
        {"enseignant": 1, "matiere": "BDD", "niveau": "L2", "parcours": "IG"},
        {"enseignant": 1, "matiere": "ALGO", "niveau": "L1", "parcours": "IG"},
        {"enseignant": 2, "matiere": "MATH", "niveau": "L1", "parcours": "IG"},
        {"enseignant": 3, "matiere": "RESEAU", "niveau": "L3", "parcours": "RT"},
        {"enseignant": 4, "matiere": "IA", "niveau": "M1", "parcours": "GL"},
    ]
    
    for assign_data in assignations:
        try:
            enseignant = enseignants[assign_data["enseignant"]]
            matiere = next((m for m in matieres if m.code == assign_data["matiere"]), None)
            niveau = next((n for n in niveaux if n.code == assign_data["niveau"]), None)
            parcours_obj = next((p for p in parcours if p.code == assign_data["parcours"]), None)
            
            if not matiere:
                continue
            
            # Vérifier si l'assignation existe déjà
            existing = MatiereEnseignantNiveauParcours.query.filter_by(
                matiere_id=matiere.id,
                enseignant_id=enseignant.id,
                niveau_id=niveau.id if niveau else None,
                parcours_id=parcours_obj.id if parcours_obj else None
            ).first()
            
            if existing:
                print(f"  ⏭️  Assignation existe déjà: {matiere.nom} -> {enseignant.utilisateur.username}")
                continue
            
            assignation = MatiereEnseignantNiveauParcours(
                matiere_id=matiere.id,
                enseignant_id=enseignant.id,
                niveau_id=niveau.id if niveau else None,
                parcours_id=parcours_obj.id if parcours_obj else None,
                est_actif=True
            )
            db.session.add(assignation)
            print(f"  ✅ Assignation créée: {matiere.nom} -> {enseignant.utilisateur.username} ({assign_data.get('niveau', 'N/A')})")
        except Exception as e:
            print(f"  ❌ Erreur lors de l'assignation: {e}")
            continue
    
    db.session.commit()

def main():
    """Fonction principale"""
    app = create_app()
    
    with app.app_context():
        print("=" * 60)
        print("🌱 Enrichissement de la base de données")
        print("=" * 60)
        
        try:
            # Créer les structures académiques
            mentions = create_mentions()
            niveaux = create_niveaux()
            parcours = create_parcours(mentions)
            
            # Créer les matières
            matieres = create_matieres()
            
            # Créer les utilisateurs
            admin = create_admin()
            enseignants = create_enseignants(nb=5)
            etudiants = create_etudiants(niveaux, parcours, mentions, nb=10)
            
            # Assigner les matières aux enseignants
            assign_matieres_to_enseignants(enseignants, matieres, niveaux, parcours)
            
            print("\n" + "=" * 60)
            print("✅ Enrichissement terminé avec succès!")
            print("=" * 60)
            print("\n📋 Résumé:")
            print(f"  - {len(mentions)} mention(s)")
            print(f"  - {len(niveaux)} niveau(x)")
            print(f"  - {len(parcours)} parcours")
            print(f"  - {len(matieres)} matière(s)")
            print(f"  - 1 administrateur")
            print(f"  - {len(enseignants)} enseignant(s)")
            print(f"  - {len(etudiants)} étudiant(s)")
            print("\n🔑 Identifiants de connexion:")
            print("  Admin: admin / admin123")
            print("  Enseignants: fontaine, dupont, martin, ... / enseignant123")
            print("  Étudiants: etudiant001, etudiant002, ... / etudiant123")
            print("\n")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Erreur lors de l'enrichissement: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    main()




