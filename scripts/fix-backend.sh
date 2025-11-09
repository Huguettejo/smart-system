#!/bin/bash
# Script de correction automatique pour le backend
# Résout les problèmes courants: dépendances manquantes, .env manquant, etc.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

echo "🔧 Correction automatique du backend..."
echo "========================================"
echo ""

# Étape 1: Vérifier/Créer l'environnement virtuel
echo "📋 Étape 1/4: Vérification de l'environnement virtuel..."
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "   Création d'un nouvel environnement virtuel..."
    python -m venv venv
    echo "   ✅ Environnement virtuel créé"
else
    echo "   ✅ Environnement virtuel trouvé"
fi

# Détecter le chemin Python
if [ -f "venv/Scripts/python.exe" ]; then
    PYTHON_CMD="venv/Scripts/python.exe"
    PIP_CMD="venv/Scripts/pip.exe"
elif [ -f "venv/bin/python" ]; then
    PYTHON_CMD="venv/bin/python"
    PIP_CMD="venv/bin/pip"
elif [ -f ".venv/Scripts/python.exe" ]; then
    PYTHON_CMD=".venv/Scripts/python.exe"
    PIP_CMD=".venv/Scripts/pip.exe"
else
    PYTHON_CMD=".venv/bin/python"
    PIP_CMD=".venv/bin/pip"
fi

# Étape 2: Installer/Mettre à jour les dépendances
echo ""
echo "📋 Étape 2/4: Installation des dépendances..."

# Vérifier la version de Python
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

echo "   Version Python: $PYTHON_VERSION"

# Si Python 3.13+, installer psycopg d'abord (compatible)
if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 13 ]; then
    echo "   ⚠️  Python 3.13+ détecté"
    echo "   Installation de psycopg (compatible Python 3.13)..."
    $PIP_CMD install --upgrade pip --quiet
    $PIP_CMD install "psycopg[binary]>=3.1.0" || {
        echo "   ⚠️  Erreur avec psycopg, tentative avec psycopg2-binary..."
    }
fi

echo "   Mise à jour de pip..."
$PIP_CMD install --upgrade pip --quiet

echo "   Installation des dépendances (cela peut prendre plusieurs minutes)..."
$PIP_CMD install -r requirements.txt

# Vérifier que Flask est installé
if $PYTHON_CMD -c "import flask" 2>/dev/null; then
    echo "   ✅ Flask installé"
else
    echo "   ❌ Erreur: Flask n'a pas pu être installé"
    exit 1
fi

# Vérifier que flask_sqlalchemy est installé
if $PYTHON_CMD -c "import flask_sqlalchemy" 2>/dev/null; then
    echo "   ✅ Flask-SQLAlchemy installé"
else
    echo "   ❌ Erreur: Flask-SQLAlchemy n'a pas pu être installé"
    exit 1
fi

# Étape 3: Vérifier/Créer le fichier .env
echo ""
echo "📋 Étape 3/4: Vérification du fichier .env..."
if [ ! -f ".env" ]; then
    echo "   Création du fichier .env..."
    cat > ".env" << 'EOF'
# Configuration de la base de données
# Si vous utilisez Docker: postgresql://postgres:postgres@localhost:5432/systeme_intelligent
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/systeme_intelligent

# Clés secrètes (IMPORTANT: Changez-les en production!)
SECRET_KEY=change-me-in-production-secret-key-min-32-chars-generate-with-secrets-token-urlsafe
JWT_SECRET_KEY=change-me-in-production-jwt-secret-key-min-32-chars-generate-with-secrets-token-urlsafe

# Configuration JWT
JWT_ACCESS_TOKEN_EXPIRES=10800

# Configuration Hugging Face (Optionnel)
HF_API_TOKEN=

# Mode développement Flask
FLASK_DEBUG=True
EOF
    echo "   ✅ Fichier .env créé"
    echo "   ⚠️  IMPORTANT: Modifiez DATABASE_URL si nécessaire"
else
    echo "   ✅ Fichier .env existe déjà"
fi

# Étape 4: Test de démarrage
echo ""
echo "📋 Étape 4/4: Test de démarrage..."
if $PYTHON_CMD -c "from app import create_app; app = create_app(); print('✅ Application Flask peut être créée')" 2>&1; then
    echo "   ✅ Backend prêt à démarrer!"
else
    echo "   ⚠️  Il y a encore des erreurs. Vérifiez les messages ci-dessus."
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Correction terminée avec succès!"
echo ""
echo "🚀 Vous pouvez maintenant démarrer le backend avec:"
echo "   ./scripts/start-backend.sh"
echo ""
echo "💡 Ou manuellement:"
if [ -f "venv/Scripts/activate" ] || [ -f ".venv/Scripts/activate" ]; then
    echo "   source venv/Scripts/activate"
else
    echo "   source venv/bin/activate"
fi
echo "   python run.py"

