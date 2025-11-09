#!/bin/bash
# Script principal de démarrage pour le développement
# Lance le backend et le frontend en parallèle

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Démarrage de l'environnement de développement"
echo "================================================"
echo ""

# Vérifier les prérequis
echo "📋 Vérification des prérequis..."
if ! "$SCRIPT_DIR/check-prerequisites.sh"; then
    echo ""
    echo "❌ Les prérequis ne sont pas satisfaits. Veuillez corriger les erreurs ci-dessus."
    exit 1
fi

echo ""
echo "✅ Prérequis satisfaits!"
echo ""

# Vérifier si concurrently est installé
if ! command -v concurrently &> /dev/null; then
    echo "📦 Installation de concurrently pour lancer les services en parallèle..."
    cd "$PROJECT_ROOT/frontend"
    npm install --save-dev concurrently
fi

echo "🔄 Démarrage des services..."
echo ""

# Lancer backend et frontend en parallèle
cd "$PROJECT_ROOT"

concurrently \
    --names "BACKEND,FRONTEND" \
    --prefix-colors "blue,green" \
    --kill-others-on-fail \
    "bash $SCRIPT_DIR/start-backend.sh" \
    "bash $SCRIPT_DIR/start-frontend.sh"




