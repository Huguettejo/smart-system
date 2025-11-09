# 🐳 Guide Docker pour Smart System

Ce guide explique comment démarrer le projet avec Docker et Docker Compose.

## 📋 Prérequis

- **Docker** 20.10 ou supérieur
- **Docker Compose** 2.0 ou supérieur

## 🚀 Démarrage rapide

### 1. Configuration de l'environnement

Créez un fichier `.env` à la racine du projet en copiant `docker.env.example` :

```bash
cp docker.env.example .env
```

Modifiez les valeurs dans `.env` selon vos besoins, notamment :
- Les mots de passe PostgreSQL
- Les clés secrètes (SECRET_KEY, JWT_SECRET_KEY)
- Le token Hugging Face (optionnel)

### 2. Générer les clés secrètes (recommandé)

Pour générer des clés secrètes sécurisées :

```bash
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

### 3. Démarrer les services

**⚠️ Important : Utilisez `docker compose` (sans tiret) - c'est la commande moderne intégrée à Docker CLI**

```bash
docker compose up -d
```

Si vous utilisez encore l'ancienne commande `docker-compose` (avec tiret) et rencontrez des erreurs de connexion, utilisez plutôt `docker compose` (sans tiret).

Cette commande va :
- Construire l'image Docker du backend
- Démarrer PostgreSQL
- Démarrer le backend Flask
- Créer automatiquement les volumes pour la persistance des données

### 4. Appliquer les migrations de la base de données

```bash
# Accéder au conteneur backend
docker-compose exec backend bash

# Dans le conteneur, exécuter :
flask db upgrade
```

Ou si vous avez utilisé `init_db.sh` dans le CMD du Dockerfile, les migrations s'appliquent automatiquement.

### 5. Vérifier que tout fonctionne

- **Backend API** : http://localhost:5000
- **PostgreSQL** : localhost:5432

## 📝 Commandes utiles

### Voir les logs

```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f backend
docker compose logs -f db
```

### Arrêter les services

```bash
docker compose stop
```

### Arrêter et supprimer les conteneurs

```bash
docker compose down
```

### Arrêter et supprimer les conteneurs + volumes (⚠️ supprime les données)

```bash
docker compose down -v
```

### Reconstruire les images

```bash
# Reconstruire sans cache
docker compose build --no-cache

# Reconstruire et redémarrer
docker compose up -d --build
```

### Accéder aux conteneurs

```bash
# Backend
docker compose exec backend bash

# PostgreSQL
docker compose exec db psql -U postgres -d systeme_intelligent
```

### Exécuter des commandes Flask

```bash
# Migrations
docker compose exec backend flask db upgrade
docker compose exec backend flask db migrate -m "description"

# Shell Flask
docker compose exec backend flask shell
```

## 🔧 Configuration

### Variables d'environnement

Toutes les variables d'environnement sont définies dans le fichier `.env`. Les principales :

- **POSTGRES_USER** : Utilisateur PostgreSQL (défaut: postgres)
- **POSTGRES_PASSWORD** : Mot de passe PostgreSQL (défaut: postgres)
- **POSTGRES_DB** : Nom de la base de données (défaut: systeme_intelligent)
- **SECRET_KEY** : Clé secrète Flask (⚠️ changez en production)
- **JWT_SECRET_KEY** : Clé secrète JWT (⚠️ changez en production)
- **HF_API_TOKEN** : Token Hugging Face (optionnel)

### Ports

- **Backend** : 5000 (configurable via BACKEND_PORT)
- **PostgreSQL** : 5432 (configurable via POSTGRES_PORT)

### Volumes

- **postgres_data** : Données PostgreSQL (persistance)
- **huggingface_cache** : Cache Hugging Face (persistance)

## 🐛 Dépannage

### Le backend ne peut pas se connecter à PostgreSQL

1. Vérifiez que PostgreSQL est démarré : `docker-compose ps`
2. Vérifiez les logs : `docker-compose logs db`
3. Vérifiez la variable `DATABASE_URL` dans les variables d'environnement

### Erreurs de migration

```bash
# Réinitialiser les migrations (⚠️ perte de données)
docker compose exec backend flask db downgrade base
docker compose exec backend flask db upgrade
```

### Le conteneur se redémarre en boucle

Vérifiez les logs : `docker compose logs backend` pour voir l'erreur.

### Erreur "The system cannot find the file specified" ou problèmes de connexion Docker

Si vous rencontrez des erreurs de connexion avec Docker :

1. **Utilisez `docker compose` (sans tiret) au lieu de `docker-compose`** - c'est la commande moderne recommandée
2. Vérifiez que Docker Desktop est bien démarré : `docker ps` doit fonctionner
3. Redémarrez Docker Desktop si nécessaire
4. Sur Windows, assurez-vous que Docker Desktop utilise le backend WSL2 (recommandé)

### Port déjà utilisé

Modifiez le port dans le fichier `.env` :
- `BACKEND_PORT=5001` pour changer le port du backend
- `POSTGRES_PORT=5433` pour changer le port de PostgreSQL

## 🔒 Sécurité

⚠️ **IMPORTANT pour la production** :

1. Changez tous les mots de passe par défaut
2. Utilisez des clés secrètes fortes et uniques
3. Ne commitez jamais le fichier `.env`
4. Utilisez un gestionnaire de secrets (AWS Secrets Manager, HashiCorp Vault, etc.)
5. Configurez un reverse proxy (Nginx, Traefik) avec SSL/TLS

## 📚 Ressources

- [Documentation Docker](https://docs.docker.com/)
- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [README principal](../README.md) pour plus d'informations sur le projet

