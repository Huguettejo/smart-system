# 🚀 Scripts de Démarrage pour le Développement

Ce dossier contient des scripts pour démarrer l'application en mode développement de manière sécurisée.

## 📋 Scripts disponibles

### `fix-backend.sh` ⚡ (Recommandé en cas de problème)
Script de correction automatique qui résout les problèmes courants :
- ✅ Vérifie/crée l'environnement virtuel
- ✅ Installe toutes les dépendances Python
- ✅ Crée le fichier .env si nécessaire
- ✅ Teste que l'application peut démarrer

**Usage :**
```bash
./scripts/fix-backend.sh
```

**Quand l'utiliser :**
- Erreur "ModuleNotFoundError"
- Dépendances manquantes
- Fichier .env manquant
- Premier démarrage du projet

### `check-prerequisites.sh`
Vérifie que tous les prérequis sont installés :
- ✅ Python et pip
- ✅ Node.js et npm
- ✅ Environnement virtuel Python
- ✅ Dépendances npm installées
- ✅ Base de données accessible
- ✅ Fichier .env présent

**Usage :**
```bash
./scripts/check-prerequisites.sh
```

### `start-backend.sh`
Démarre le backend Flask avec :
- ✅ Vérification de l'environnement virtuel
- ✅ Vérification des dépendances
- ✅ Test de connexion à la base de données
- ✅ Vérification que le port 5000 est libre
- ✅ Mode debug et auto-reload activés

**Usage :**
```bash
./scripts/start-backend.sh
```

### `start-frontend.sh`
Démarre le frontend Vite avec :
- ✅ Vérification des dépendances npm
- ✅ Vérification que le port 5173 est libre
- ✅ Hot-reload activé
- ✅ Proxy API configuré

**Usage :**
```bash
./scripts/start-frontend.sh
```

### `dev-start.sh` (Recommandé)
Script principal qui lance tout automatiquement :
- ✅ Vérifie les prérequis
- ✅ Lance backend et frontend en parallèle
- ✅ Utilise `concurrently` pour gérer les deux processus

**Usage :**
```bash
./scripts/dev-start.sh
```

### `dev-start.bat` (Windows CMD)
Version Windows du script principal qui ouvre deux fenêtres séparées.

**Usage :**
```cmd
scripts\dev-start.bat
```

## 🎯 Démarrage rapide

### Option 1 : Tout en une commande (Recommandé)

**Linux/Mac/Git Bash :**
```bash
./scripts/dev-start.sh
```

**Windows CMD :**
```cmd
scripts\dev-start.bat
```

### Option 2 : Services séparés

**Terminal 1 - Backend :**
```bash
./scripts/start-backend.sh
```

**Terminal 2 - Frontend :**
```bash
./scripts/start-frontend.sh
```

## ⚙️ Configuration

### Variables d'environnement

Le backend utilise les variables suivantes (définies dans `backend/.env`) :

- `DATABASE_URL` : URL de connexion PostgreSQL
- `SECRET_KEY` : Clé secrète Flask
- `JWT_SECRET_KEY` : Clé secrète JWT
- `FLASK_DEBUG` : Active/désactive le mode debug (défaut: `True`)

### Ports utilisés

- **Backend** : `http://localhost:5000`
- **Frontend** : `http://localhost:5173`
- **Base de données** : `localhost:5432`

## 🔧 Dépannage

### Erreur "Port already in use"

Si le port 5000 ou 5173 est déjà utilisé :

**Linux/Mac :**
```bash
# Trouver le processus utilisant le port
lsof -i :5000
# Tuer le processus
kill -9 <PID>
```

**Windows :**
```cmd
# Trouver le processus
netstat -ano | findstr :5000
# Tuer le processus
taskkill /PID <PID> /F
```

### Erreur "Module not found" ou "ModuleNotFoundError"

**Solution rapide (recommandée) :**
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

**Ou utiliser le script d'installation :**
```bash
./scripts/install-dependencies.sh
```

**Frontend :**
```bash
cd frontend
npm install
```

### Erreur de connexion à la base de données

1. Vérifiez que PostgreSQL est démarré
2. Vérifiez la variable `DATABASE_URL` dans `backend/.env`
3. Si vous utilisez Docker : `docker-compose up -d db`

## 📝 Notes

- Les scripts sont compatibles avec Git Bash sur Windows
- Le mode debug est activé par défaut en développement
- Le hot-reload fonctionne automatiquement (pas besoin de rebuild)
- Les modifications sont détectées automatiquement et l'application se recharge

