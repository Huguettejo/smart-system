# Utiliser Python 3.11 comme image de base
FROM python:3.11-slim

# Définir les variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Installer les dépendances système nécessaires pour PostgreSQL et autres
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    g++ \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Créer le répertoire de travail
WORKDIR /app

# Copier le fichier requirements.txt d'abord (pour optimiser le cache Docker)
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste du code de l'application
COPY . .

# Rendre le script d'initialisation exécutable
RUN chmod +x init_db.sh || true

# Créer un utilisateur non-root pour exécuter l'application (bonne pratique de sécurité)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Exposer le port sur lequel Flask écoute
EXPOSE 5000

# Commande par défaut : utiliser le script d'initialisation ou démarrer directement
# Vous pouvez changer cette ligne pour utiliser init_db.sh si vous voulez les migrations automatiques
CMD ["python", "run.py"]
# Alternative avec migrations automatiques : CMD ["./init_db.sh"]
