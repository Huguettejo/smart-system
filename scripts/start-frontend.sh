#!/bin/bash
# Script de démarrage sécurisé pour le frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

cd "$FRONTEND_DIR"

echo "🚀 Démarrage du frontend Vite..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Êtes-vous dans le bon répertoire?"
    exit 1
fi

# Vérifier que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances npm..."
    npm install
fi

# Vérifier que le port 5173 n'est pas déjà utilisé
if command -v netstat &> /dev/null; then
    if netstat -an | grep -q ":5173.*LISTEN"; then
        echo "⚠️  Le port 5173 est déjà utilisé. Arrêtez l'autre processus ou changez le port."
        exit 1
    fi
elif command -v lsof &> /dev/null; then
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Le port 5173 est déjà utilisé. Arrêtez l'autre processus ou changez le port."
        exit 1
    fi
fi

echo "✅ Démarrage du serveur de développement Vite sur http://localhost:5173"
echo "   Hot-reload: activé"
echo "   Proxy API: http://localhost:5000"
echo ""

# Démarrer Vite
npm run dev




