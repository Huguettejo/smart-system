#!/bin/bash
# Script d'installation des dépendances pour le backend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

echo "📦 Installation des dépendances du backend..."
echo ""

# Détecter et utiliser l'environnement virtuel
if [ -f "venv/Scripts/activate" ]; then
    # Windows (Git Bash)
    echo "📦 Utilisation de l'environnement virtuel Windows..."
    PYTHON_CMD="venv/Scripts/python.exe"
    PIP_CMD="venv/Scripts/pip.exe"
elif [ -f "venv/bin/activate" ]; then
    # Linux/Mac
    echo "📦 Utilisation de l'environnement virtuel Linux/Mac..."
    PYTHON_CMD="venv/bin/python"
    PIP_CMD="venv/bin/pip"
elif [ -f ".venv/Scripts/activate" ]; then
    # Windows avec .venv
    PYTHON_CMD=".venv/Scripts/python.exe"
    PIP_CMD=".venv/Scripts/pip.exe"
elif [ -f ".venv/bin/activate" ]; then
    # Linux/Mac avec .venv
    PYTHON_CMD=".venv/bin/python"
    PIP_CMD=".venv/bin/pip"
else
    echo "⚠️  Aucun environnement virtuel trouvé. Création d'un nouvel environnement..."
    python -m venv venv
    if [ -f "venv/Scripts/activate" ]; then
        PYTHON_CMD="venv/Scripts/python.exe"
        PIP_CMD="venv/Scripts/pip.exe"
    else
        PYTHON_CMD="venv/bin/python"
        PIP_CMD="venv/bin/pip"
    fi
    echo "✅ Environnement virtuel créé"
fi

echo "🔧 Mise à jour de pip..."
$PIP_CMD install --upgrade pip

echo "📥 Installation des dépendances depuis requirements.txt..."
echo "   Cela peut prendre plusieurs minutes..."
$PIP_CMD install -r requirements.txt

echo ""
echo "✅ Toutes les dépendances ont été installées avec succès!"
echo ""
echo "💡 Pour activer l'environnement virtuel manuellement:"
if [ -f "venv/Scripts/activate" ] || [ -f ".venv/Scripts/activate" ]; then
    echo "   source venv/Scripts/activate  (Windows Git Bash)"
else
    echo "   source venv/bin/activate  (Linux/Mac)"
fi




