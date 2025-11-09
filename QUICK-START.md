# 🚀 Démarrage rapide - Prochaines étapes

## ✅ Étape 1 : Dépendances installées ✓

Toutes les dépendances sont installées avec succès, y compris `psycopg` pour Python 3.13 !

## 📋 Étape 2 : Créer le fichier .env

Créez le fichier `backend/.env` avec la configuration :

```bash
cd backend
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/systeme_intelligent
SECRET_KEY=change-me-in-production-secret-key-min-32-chars-generate-with-secrets-token-urlsafe
JWT_SECRET_KEY=change-me-in-production-jwt-secret-key-min-32-chars-generate-with-secrets-token-urlsafe
JWT_ACCESS_TOKEN_EXPIRES=10800
HF_API_TOKEN=
FLASK_DEBUG=True
EOF
```

**Ou utilisez le script automatique :**
```bash
./scripts/setup-env.sh
```

## 📋 Étape 3 : Démarrer la base de données

**Avec Docker (Recommandé) :**
```bash
# Depuis la racine du projet
docker-compose up -d db
```

**Vérifier que la base de données est démarrée :**
```bash
docker ps | grep smart-system-db
```

## 📋 Étape 4 : Appliquer les migrations

```bash
cd backend
source venv/Scripts/activate  # Vous êtes déjà dans venv, mais au cas où
flask db upgrade
```

## 📋 Étape 5 : Démarrer le backend

**Option A : Avec le script (Recommandé)**
```bash
# Depuis la racine du projet
./scripts/start-backend.sh
```

**Option B : Manuellement**
```bash
# Vous êtes déjà dans backend/ avec venv activé
python run.py
```

Vous devriez voir :
```
✅ Démarrage du serveur Flask sur http://localhost:5000
   Mode debug: activé
   Auto-reload: activé

 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

## 🎯 Résumé des commandes (dans l'ordre)

```bash
# 1. Créer .env (si pas encore fait)
cd backend
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/systeme_intelligent
SECRET_KEY=change-me-in-production-secret-key-min-32-chars-generate-with-secrets-token-urlsafe
JWT_SECRET_KEY=change-me-in-production-jwt-secret-key-min-32-chars-generate-with-secrets-token-urlsafe
JWT_ACCESS_TOKEN_EXPIRES=10800
HF_API_TOKEN=
FLASK_DEBUG=True
EOF

# 2. Démarrer la base de données
cd ..
docker-compose up -d db

# 3. Appliquer les migrations
cd backend
flask db upgrade

# 4. Démarrer le backend
python run.py
```

## 🎉 Prochaine étape : Frontend

Une fois le backend démarré, dans un autre terminal :

```bash
./scripts/start-frontend.sh
```

Ou les deux en même temps :
```bash
./scripts/dev-start.sh
```




