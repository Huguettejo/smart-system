# 🌱 Script de Seed de la Base de Données

Ce script permet d'enrichir automatiquement la base de données avec des données de test.

## 📋 Ce que le script crée

### Structures académiques
- **3 Mentions** : Sciences et Technologies, Sciences Économiques et de Gestion, Lettres et Sciences Humaines
- **5 Niveaux** : Licence 1, Licence 2, Licence 3, Master 1, Master 2
- **5 Parcours** : Informatique Générale, Génie Logiciel, Réseaux et Télécommunications, Gestion des Entreprises, Comptabilité et Finance

### Matières
- **8 Matières** : Programmation Python, Base de données, Algorithmes, Réseaux, Développement Web, IA, Mathématiques, Gestion de Projet

### Utilisateurs
- **1 Administrateur** : `admin` / `admin123`
- **5 Enseignants** : `fontaine`, `dupont`, `martin`, `bernard`, `thomas` / `enseignant123`
- **10 Étudiants** : `etudiant001` à `etudiant010` / `etudiant123`

### Assignations
- Les matières sont assignées aux enseignants avec des niveaux et parcours spécifiques

## ⚠️ Prérequis

Avant d'exécuter le seed, assurez-vous que :

1. **PostgreSQL est démarré**
   ```bash
   docker-compose up -d db
   ```

2. **La base de données existe**
   ```bash
   ./scripts/create-database.sh
   ```

3. **Les migrations sont appliquées**
   ```bash
   cd backend
   flask db upgrade
   ```

4. **Le fichier .env est configuré**
   ```bash
   ./scripts/setup-database.sh  # Crée le .env et configure tout
   ```

## 🚀 Utilisation

### Option 1 : Configuration complète automatique (Recommandé)

```bash
# Configure tout automatiquement
./scripts/setup-database.sh

# Puis exécutez le seed
./scripts/seed-database.sh
```

### Option 2 : Manuellement

```bash
cd backend
source venv/Scripts/activate  # Windows Git Bash
# ou: source venv/bin/activate  # Linux/Mac

python seed_database.py
```

### Option 3 : Directement avec le Python du venv

```bash
cd backend
venv/Scripts/python.exe seed_database.py  # Windows
# ou
venv/bin/python seed_database.py  # Linux/Mac
```

## ⚠️ Important

- Le script vérifie si les données existent déjà avant de les créer
- Si une donnée existe déjà, elle est ignorée (pas de doublon)
- Vous pouvez exécuter le script plusieurs fois sans problème
- Les mots de passe sont en clair dans le script (à changer en production)

## 🔑 Identifiants de connexion

### Administrateur
- **Username** : `admin`
- **Password** : `admin123`
- **Email** : `admin@systeme-intelligent.com`

### Enseignants
- **Usernames** : `fontaine`, `dupont`, `martin`, `bernard`, `thomas`
- **Password** : `enseignant123`
- **Emails** : `{username}@systeme-intelligent.com`

### Étudiants
- **Usernames** : `etudiant001`, `etudiant002`, ..., `etudiant010`
- **Password** : `etudiant123`
- **Emails** : `etudiant001@systeme-intelligent.com`, etc.

## 📝 Personnalisation

Vous pouvez modifier le script `seed_database.py` pour :
- Changer le nombre d'étudiants (ligne ~200)
- Changer le nombre d'enseignants (ligne ~160)
- Ajouter d'autres matières
- Modifier les assignations matières-enseignants

## 🔄 Réinitialisation

Pour réinitialiser complètement la base de données :

```bash
# Supprimer toutes les données (ATTENTION: destructif!)
cd backend
source venv/Scripts/activate
flask db downgrade base  # Remonter à la migration de base
flask db upgrade          # Réappliquer toutes les migrations
python seed_database.py   # Réexécuter le seed
```

## ✅ Vérification

Après l'exécution, vous pouvez vérifier que tout est créé :

```bash
# Tester la connexion avec un utilisateur
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

