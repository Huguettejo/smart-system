#!/bin/bash
# Script de vérification des prérequis pour le développement

echo "🔍 Vérification des prérequis..."

ERRORS=0

# Vérifier Python
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python n'est pas installé"
    ERRORS=$((ERRORS + 1))
else
    PYTHON_CMD=$(command -v python3 || command -v python)
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
    echo "✅ Python trouvé: $PYTHON_VERSION"
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    ERRORS=$((ERRORS + 1))
else
    NODE_VERSION=$(node --version)
    echo "✅ Node.js trouvé: $NODE_VERSION"
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    ERRORS=$((ERRORS + 1))
else
    NPM_VERSION=$(npm --version)
    echo "✅ npm trouvé: v$NPM_VERSION"
fi

# Vérifier les dépendances Python
if [ -d "backend" ]; then
    if [ ! -f "backend/.venv/bin/activate" ] && [ ! -f "backend/venv/bin/activate" ]; then
        echo "⚠️  Environnement virtuel Python non trouvé dans backend/"
        echo "   Exécutez: cd backend && python -m venv venv"
    else
        echo "✅ Environnement virtuel Python trouvé"
    if [ -f "backend/requirements.txt" ]; then
        echo "   Vérifiez que les dépendances sont installées: pip install -r requirements.txt"
    fi
    fi
fi

# Vérifier les dépendances Node.js
if [ -d "frontend" ]; then
    if [ ! -d "frontend/node_modules" ]; then
        echo "⚠️  node_modules non trouvé dans frontend/"
        echo "   Exécutez: cd frontend && npm install"
    else
        echo "✅ node_modules trouvé dans frontend/"
    fi
fi

# Vérifier la base de données
if command -v docker &> /dev/null; then
    if docker ps | grep -q "smart-system-db"; then
        echo "✅ Base de données Docker est en cours d'exécution"
    else
        echo "⚠️  Base de données Docker n'est pas en cours d'exécution"
        echo "   Exécutez: docker-compose up -d db"
    fi
else
    echo "⚠️  Docker n'est pas installé ou la base de données n'est pas accessible"
fi

# Vérifier les variables d'environnement
if [ ! -f "backend/.env" ] && [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé"
    echo "   Créez un fichier .env basé sur docker.env.example"
else
    echo "✅ Fichier .env trouvé"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ Tous les prérequis essentiels sont satisfaits!"
    exit 0
else
    echo "❌ $ERRORS erreur(s) trouvée(s). Veuillez corriger avant de continuer."
    exit 1
fi




