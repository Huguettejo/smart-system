#!/bin/bash
# Script d'initialisation de la base de données pour Docker

set -e

echo "Attente de la base de données PostgreSQL..."
# Attendre que PostgreSQL soit prêt
while ! pg_isready -h db -U ${POSTGRES_USER:-postgres}; do
    echo "En attente de PostgreSQL..."
    sleep 2
done

echo "PostgreSQL est prêt!"

# Initialiser les migrations si nécessaire
if [ ! -d "migrations/versions" ]; then
    echo "Initialisation des migrations Alembic..."
    flask db init || echo "Migrations déjà initialisées"
fi

# Appliquer les migrations
echo "Application des migrations..."
flask db upgrade

echo "Base de données initialisée avec succès!"

# Démarrer l'application Flask
exec python run.py

