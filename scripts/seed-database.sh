#!/bin/bash
# Script pour exécuter le seed de la base de données

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

echo "🌱 Exécution du script de seed de la base de données..."
echo ""

# Détecter le Python du venv
if [ -f "venv/Scripts/python.exe" ]; then
    PYTHON_CMD="venv/Scripts/python.exe"
elif [ -f "venv/bin/python" ]; then
    PYTHON_CMD="venv/bin/python"
else
    echo "❌ Environnement virtuel non trouvé"
    echo "   Activez d'abord le venv ou exécutez depuis le venv"
    exit 1
fi

# Vérifier que le fichier seed existe
if [ ! -f "seed_database.py" ]; then
    echo "❌ Fichier seed_database.py non trouvé"
    exit 1
fi

# Exécuter le script de seed
echo "🚀 Lancement du script de seed..."
echo ""
$PYTHON_CMD seed_database.py

echo ""
echo "✅ Seed terminé!"




