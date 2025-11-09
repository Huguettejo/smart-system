#!/bin/bash
# Script de démarrage sécurisé pour le backend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

echo "🚀 Démarrage du backend Flask..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "run.py" ]; then
    echo "❌ Erreur: run.py non trouvé. Êtes-vous dans le bon répertoire?"
    exit 1
fi

# Activer l'environnement virtuel si disponible
VENV_ACTIVATED=false
if [ -f "venv/Scripts/activate" ]; then
    # Windows (Git Bash)
    echo "📦 Activation de l'environnement virtuel (Windows)..."
    # Forcer l'utilisation du venv en désactivant d'abord tout autre venv
    if [ -n "$VIRTUAL_ENV" ]; then
        deactivate 2>/dev/null || true
    fi
    source venv/Scripts/activate
    PYTHON_CMD="venv/Scripts/python.exe"
    PIP_CMD="venv/Scripts/pip.exe"
    VENV_ACTIVATED=true
elif [ -f "venv/bin/activate" ]; then
    # Linux/Mac
    echo "📦 Activation de l'environnement virtuel (Linux/Mac)..."
    source venv/bin/activate
    PYTHON_CMD="python"
    PIP_CMD="pip"
    VENV_ACTIVATED=true
elif [ -f ".venv/Scripts/activate" ]; then
    # Windows avec .venv
    echo "📦 Activation de l'environnement virtuel (Windows .venv)..."
    source .venv/Scripts/activate
    PYTHON_CMD=".venv/Scripts/python.exe"
    PIP_CMD=".venv/Scripts/pip.exe"
    VENV_ACTIVATED=true
elif [ -f ".venv/bin/activate" ]; then
    # Linux/Mac avec .venv
    echo "📦 Activation de l'environnement virtuel (Linux/Mac .venv)..."
    source .venv/bin/activate
    PYTHON_CMD="python"
    PIP_CMD="pip"
    VENV_ACTIVATED=true
else
    echo "⚠️  Aucun environnement virtuel trouvé, utilisation de Python système"
    PYTHON_CMD="python"
    PIP_CMD="pip"
fi

# Vérifier que les dépendances sont installées
echo "🔍 Vérification des dépendances..."
if ! $PYTHON_CMD -c "import flask" 2>/dev/null; then
    echo "❌ Flask n'est pas installé. Installation des dépendances..."
    echo "   Cela peut prendre quelques minutes..."
    $PIP_CMD install --upgrade pip
    $PIP_CMD install -r requirements.txt
    echo "✅ Dépendances installées avec succès"
elif ! $PYTHON_CMD -c "import flask_sqlalchemy" 2>/dev/null; then
    echo "⚠️  Certaines dépendances manquent. Installation..."
    $PIP_CMD install --upgrade pip
    $PIP_CMD install -r requirements.txt
    echo "✅ Dépendances installées avec succès"
else
    echo "✅ Toutes les dépendances sont installées"
fi

# Vérifier la connexion à la base de données
echo "🔍 Vérification de la connexion à la base de données..."
if $PYTHON_CMD -c "
import os
from dotenv import load_dotenv
load_dotenv()
import sys
try:
    import psycopg2
    db_url = os.getenv('DATABASE_URL', '')
    if db_url:
        conn = psycopg2.connect(db_url)
        conn.close()
        print('✅ Connexion à la base de données réussie')
    else:
        print('⚠️  DATABASE_URL non défini dans .env')
        sys.exit(1)
except ImportError:
    print('⚠️  psycopg2 non installé, vérification de la base de données ignorée')
    sys.exit(0)
except Exception as e:
    print(f'⚠️  Erreur de connexion à la base de données: {e}')
    print('   Assurez-vous que PostgreSQL est démarré et que DATABASE_URL est correct')
    sys.exit(0)
" 2>&1; then
    echo "✅ Base de données accessible"
else
    echo "⚠️  Impossible de vérifier la base de données. Continuons quand même..."
    echo "   Assurez-vous que votre fichier .env contient DATABASE_URL"
fi

# Vérifier que le port 5000 n'est pas déjà utilisé
if command -v netstat &> /dev/null; then
    if netstat -an | grep -q ":5000.*LISTEN"; then
        echo "⚠️  Le port 5000 est déjà utilisé. Arrêtez l'autre processus ou changez le port."
        exit 1
    fi
elif command -v lsof &> /dev/null; then
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Le port 5000 est déjà utilisé. Arrêtez l'autre processus ou changez le port."
        exit 1
    fi
fi

# Définir les variables d'environnement pour le développement
export FLASK_DEBUG=True
export FLASK_ENV=development

echo "✅ Démarrage du serveur Flask sur http://localhost:5000"
echo "   Mode debug: activé"
echo "   Auto-reload: activé"
echo ""

# Démarrer Flask
$PYTHON_CMD run.py

