# 🎓 Système Intelligent de Gestion d'Examens

Un système complet de gestion d'examens avec génération automatique de QCM utilisant l'intelligence artificielle, développé avec Flask (backend) et React (frontend).

## 📋 Table des matières

-   [Fonctionnalités](#-fonctionnalités)
-   [Technologies utilisées](#-technologies-utilisées)
-   [Architecture](#-architecture)
-   [Installation](#-installation)
-   [Configuration](#-configuration)
-   [Utilisation](#-utilisation)
-   [API Endpoints](#-api-endpoints)
-   [Structure du projet](#-structure-du-projet)
-   [Contribution](#-contribution)

## ✨ Fonctionnalités

### 🔐 Authentification

-   **Connexion sécurisée** avec JWT
-   **Gestion des rôles** : Enseignant, Étudiant, Administrateur
-   **Sessions persistantes** avec localStorage

### 👨‍🏫 Interface Enseignant

-   **Dashboard complet** avec statistiques
-   **Gestion des QCM** : création, modification, visualisation
-   **Visualisation des questions** avec options de réponse
-   **Suivi des étudiants** et leurs performances
-   **Génération automatique** de QCM Python

### 👨‍🎓 Interface Étudiant

-   **Dashboard personnalisé** avec notes et présence
-   **Accès aux examens** et QCM
-   **Historique des résultats**

### 🤖 Intelligence Artificielle

-   **Intégration Hugging Face** pour la génération de contenu
-   **Génération automatique** de questions et réponses
-   **Correction intelligente** des réponses composées

### 📊 Gestion des Données

-   **Base de données PostgreSQL** robuste
-   **Modèles relationnels** bien structurés
-   **Migration automatique** avec Alembic

## 🛠 Technologies utilisées

### Backend

-   **Flask 2.3.3** - Framework web Python
-   **PostgreSQL** - Base de données relationnelle
-   **SQLAlchemy 2.0.21** - ORM Python
-   **Flask-JWT-Extended** - Authentification JWT
-   **Flask-Migrate** - Gestion des migrations
-   **Hugging Face Transformers** - IA pour génération de contenu
-   **PyTorch** - Framework d'apprentissage automatique

### Frontend

-   **React 19.1.1** - Bibliothèque UI
-   **TypeScript** - Typage statique
-   **Vite** - Build tool moderne
-   **CSS Modules** - Styles modulaires

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Flask)       │◄──►│   (PostgreSQL)  │
│   Port: 5173    │    │   Port: 5000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Hugging Face  │
                    │   (IA Services) │
                    └─────────────────┘
```

## 🚀 Installation

### Prérequis

-   **Python 3.8+**
-   **Node.js 16+**
-   **PostgreSQL 12+**
-   **Git**

### 1. Cloner le projet

```bash
git clone <votre-repo-url>
cd SystemeIntelligent
```

### 2. Configuration Backend

#### Créer l'environnement virtuel

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

#### Installer les dépendances

```bash
pip install -r requirements.txt
```

#### Configuration de la base de données

```bash
# Créer la base de données PostgreSQL
createdb systeme_intelligent

# Initialiser les migrations
flask db init

# Appliquer les migrations
flask db upgrade
```

### 3. Configuration Frontend

```bash
cd frontend
npm install
```

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` dans le dossier `backend/` :

```env
# Base de données
DATABASE_URL=postgresql://username:password@localhost:5432/systeme_intelligent

# Sécurité
SECRET_KEY=votre_cle_secrete_tres_longue_et_complexe
JWT_SECRET_KEY=votre_jwt_secret_key_different

# Hugging Face (optionnel)
HF_API_TOKEN=votre_token_hugging_face
```

### Configuration PostgreSQL

1. **Installer PostgreSQL** sur votre système
2. **Créer un utilisateur** et une base de données :

```sql
CREATE USER systeme_user WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE systeme_intelligent OWNER systeme_user;
GRANT ALL PRIVILEGES ON DATABASE systeme_intelligent TO systeme_user;
```

## 🎯 Utilisation

### Démarrage des services

#### Option 1 : Démarrage automatique (Recommandé) 🚀

**Pour Linux/Mac/Git Bash (Windows) :**
```bash
# Rendre les scripts exécutables (première fois seulement)
chmod +x scripts/*.sh

# Démarrer tous les services en une commande
./scripts/dev-start.sh
```

**Pour Windows (CMD) :**
```cmd
scripts\dev-start.bat
```

Ce script :
- ✅ Vérifie tous les prérequis
- ✅ Lance le backend et le frontend en parallèle
- ✅ Active le hot-reload automatique
- ✅ Configure le proxy API automatiquement

#### Option 2 : Démarrage manuel

**1. Démarrer la base de données (si vous utilisez Docker)**
```bash
docker-compose up -d db
```

**2. Démarrer le backend**
```bash
# Linux/Mac/Git Bash
./scripts/start-backend.sh

# Ou manuellement
cd backend
source venv/bin/activate  # ou venv\Scripts\activate sur Windows
python run.py
```

Le serveur sera accessible sur `http://localhost:5000` avec :
- 🔄 Auto-reload activé (redémarre automatiquement à chaque modification)
- 🐛 Mode debug activé

**3. Démarrer le frontend**
```bash
# Linux/Mac/Git Bash
./scripts/start-frontend.sh

# Ou manuellement
cd frontend
npm run dev
```

L'application sera accessible sur `http://localhost:5173` avec :
- 🔥 Hot-reload activé (recharge automatiquement à chaque modification)
- 🔀 Proxy API configuré (redirige `/api` et `/auth` vers le backend)

### Première utilisation

1. **Accédez à l'application** via `http://localhost:5173`
2. **Connectez-vous** avec vos identifiants
3. **Générez un QCM de simulation** via le bouton "Générer QCM Python"
4. **Visualisez les questions** en cliquant sur "Voir questions"

## 📡 API Endpoints

### Authentification

-   `POST /auth/login` - Connexion utilisateur
-   `POST /auth/register` - Inscription utilisateur
-   `POST /auth/logout` - Déconnexion

### QCM

-   `GET /api/qcm/enseignant/qcm` - Liste des QCM pour enseignant
-   `GET /api/qcm/{id}/questions` - Questions d'un QCM spécifique
-   `POST /api/qcm/simulate` - Générer un QCM de simulation

### Enseignant

-   `GET /api/enseignant/etudiants` - Liste des étudiants
-   `GET /api/enseignant/statistiques` - Statistiques enseignant
-   `GET /api/enseignant/profil` - Profil enseignant
-   `PUT /api/enseignant/profil` - Modifier le profil

## 📁 Structure du projet

```
SystemeIntelligent/
├── backend/                    # API Flask
│   ├── app/
│   │   ├── models/            # Modèles de données
│   │   │   ├── user.py        # Modèle utilisateur
│   │   │   ├── qcm.py         # Modèle QCM et questions
│   │   │   ├── document.py    # Modèle document
│   │   │   └── resultat.py    # Modèle résultats
│   │   ├── routes/            # Routes API
│   │   │   ├── auth.py        # Authentification
│   │   │   ├── qcm.py         # Gestion QCM
│   │   │   └── document.py    # Gestion documents
│   │   ├── services/          # Services métier
│   │   │   ├── hugging_face_service.py  # Service IA
│   │   │   └── correction_service.py    # Correction
│   │   └── utils/             # Utilitaires
│   ├── migrations/            # Migrations base de données
│   ├── config.py              # Configuration
│   ├── requirements.txt       # Dépendances Python
│   └── run.py                 # Point d'entrée
├── frontend/                   # Interface React
│   ├── src/
│   │   ├── components/        # Composants React
│   │   │   ├── admin/         # Interface administrateur
│   │   │   ├── enseignant/    # Interface enseignant
│   │   │   ├── etudiant/      # Interface étudiant
│   │   │   └── authentification/ # Authentification
│   │   ├── services/          # Services API
│   │   └── assets/            # Ressources statiques
│   ├── package.json           # Dépendances Node.js
│   └── vite.config.ts         # Configuration Vite
└── README.md                  # Ce fichier
```

## 🔧 Fonctionnalités récentes

### ✨ Visualisation des Questions (Nouveau)

-   **Interface dédiée** pour afficher toutes les questions d'un QCM
-   **Options de réponse** avec indication des bonnes réponses
-   **Design responsive** et intuitif
-   **Navigation fluide** entre la liste des QCM et les questions

### 🎯 Génération de QCM Python

-   **5 questions simulées** sur Python
-   **Options multiples** avec une seule bonne réponse
-   **Intégration base de données** automatique
-   **Interface enseignant** pour visualisation

## 🐛 Dépannage

### Correction automatique rapide

Si vous rencontrez des erreurs de dépendances manquantes ou de configuration :

```bash
# Script de correction automatique
./scripts/fix-backend.sh
```

Ce script :
- ✅ Vérifie/crée l'environnement virtuel
- ✅ Installe toutes les dépendances Python
- ✅ Crée le fichier .env si nécessaire
- ✅ Teste que tout fonctionne

### Problèmes courants

#### Erreur "ModuleNotFoundError: No module named 'psycopg2'"

**Problème :** SQLAlchemy essaie d'utiliser `psycopg2` mais vous avez installé `psycopg` (v3).

**Solution :** Le fichier `config.py` convertit automatiquement `postgresql://` en `postgresql+psycopg://` pour utiliser psycopg3.

Si le problème persiste :
```bash
./scripts/fix-psycopg-dialect.sh
```

#### Erreur "Microsoft Visual C++ 14.0 or greater is required" (Python 3.13)

**Problème :** `psycopg2-binary` n'a pas de wheels précompilés pour Python 3.13.

**Solution :** Le projet utilise maintenant `psycopg` (version 3) qui est compatible Python 3.13.

```bash
# Le script fix-backend.sh gère cela automatiquement
./scripts/fix-backend.sh

# Ou manuellement
cd backend
source venv/Scripts/activate
pip install "psycopg[binary]>=3.1.0"
pip install -r requirements.txt
```

Voir `scripts/README-PYTHON313.md` pour plus de détails.

#### Erreur "ModuleNotFoundError: No module named 'flask_sqlalchemy'"

**Solution rapide :**
```bash
./scripts/fix-backend.sh
```

**Solution manuelle :**
```bash
cd backend
source venv/Scripts/activate  # Windows Git Bash
# ou: source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

#### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
sudo service postgresql start

# Vérifier la configuration dans .env
DATABASE_URL=postgresql://user:password@localhost:5432/db_name
```

#### Erreur de dépendances Python

```bash
# Réinstaller les dépendances
pip install --upgrade pip
pip install -r requirements.txt
```

#### Erreur de build frontend

```bash
# Nettoyer le cache et réinstaller
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contribution

1. **Fork** le projet
2. **Créer une branche** pour votre fonctionnalité (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Commit** vos changements (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. **Push** vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. **Ouvrir une Pull Request**

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👥 Équipe

-   **Développeur Principal** : [Votre nom]
-   **Projet** : Système Intelligent de Gestion d'Examens
-   **Année** : 2025

## 📞 Support

Pour toute question ou problème :

-   **Email** : [votre-email@example.com]
-   **Issues** : Utilisez la section Issues de GitHub

---

**🎓 Bon développement avec votre système intelligent !**

