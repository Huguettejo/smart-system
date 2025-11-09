#!/bin/bash
# Script pour appliquer les migrations de la base de données

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

echo "🔄 Application des migrations de la base de données..."
echo ""

# Détecter le Python du venv
if [ -f "venv/Scripts/python.exe" ]; then
    PYTHON_CMD="venv/Scripts/python.exe"
    FLASK_CMD="venv/Scripts/flask.exe"
elif [ -f "venv/bin/python" ]; then
    PYTHON_CMD="venv/bin/python"
    FLASK_CMD="venv/bin/flask"
else
    PYTHON_CMD="python"
    FLASK_CMD="flask"
fi

# Vérifier que .flaskenv existe
if [ ! -f ".flaskenv" ]; then
    echo "📝 Création du fichier .flaskenv..."
    cat > ".flaskenv" << 'EOF'
FLASK_APP=app:create_app
FLASK_ENV=development
FLASK_DEBUG=1
EOF
    echo "   ✅ Fichier .flaskenv créé"
fi

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env n'existe pas"
    echo "   Créez-le d'abord avec les variables d'environnement nécessaires"
    exit 1
fi

# Vérifier la connexion à la base de données
echo "🔍 Vérification de la connexion à la base de données..."
if $PYTHON_CMD -c "
import os
from dotenv import load_dotenv
load_dotenv()
import sys
try:
    import psycopg
    db_url = os.getenv('DATABASE_URL', '').replace('postgresql+psycopg://', 'postgresql://')
    if db_url:
        conn = psycopg.connect(db_url)
        conn.close()
        print('✅ Connexion réussie')
        sys.exit(0)
    else:
        print('❌ DATABASE_URL non défini')
        sys.exit(1)
except Exception as e:
    print(f'❌ Erreur: {e}')
    sys.exit(1)
" 2>&1; then
    echo "   ✅ Base de données accessible"
else
    echo "   ❌ Impossible de se connecter à la base de données"
    echo "   Vérifiez que PostgreSQL est démarré et que DATABASE_URL est correct"
    exit 1
fi

# Appliquer les migrations
echo ""
echo "📋 Application des migrations..."
export FLASK_APP=app:create_app

# Utiliser Python directement avec Flask CLI
$PYTHON_CMD -m flask db upgrade 2>&1 || {
    echo ""
    echo "⚠️  Erreur lors des migrations"
    echo "   Tentative avec une autre méthode..."
    
    # Essayer avec flask directement
    $FLASK_CMD db upgrade 2>&1 || {
        echo ""
        echo "❌ Impossible d'appliquer les migrations"
        echo ""
        echo "💡 Essayez manuellement:"
        echo "   cd backend"
        echo "   export FLASK_APP=app:create_app"
        echo "   python -m flask db upgrade"
        exit 1
    }
}

echo ""
echo "✅ Migrations appliquées avec succès!"
echo ""
echo "📋 Vérification des tables créées..."
docker exec smart-system-db psql -U postgres -d systeme_intelligent -c "\dt" | head -30 || echo "   (Vérification ignorée)"

echo ""
echo "✅ Prêt pour le seed!"
echo "   Exécutez: python seed_database.py"




