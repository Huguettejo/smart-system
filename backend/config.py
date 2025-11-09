import os
from dotenv import load_dotenv

# Charger .env
load_dotenv()

# Configuration du cache Hugging Face (optionnel - décommenter si besoin de changer le disque)
# Par défaut : C:\Users\{user}\.cache\huggingface
# Pour changer vers D: :
# os.environ['HF_HOME'] = r'D:\HuggingFace_Cache'
# os.environ['TRANSFORMERS_CACHE'] = r'D:\HuggingFace_Cache\transformers'

class Config:
    # Clés secrètes
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    # Base de données PostgreSQL
    # Convertir postgresql:// en postgresql+psycopg:// pour utiliser psycopg (v3) au lieu de psycopg2
    _database_url = os.getenv("DATABASE_URL", "")
    if _database_url and _database_url.startswith("postgresql://") and "+psycopg" not in _database_url:
        # Remplacer postgresql:// par postgresql+psycopg:// pour forcer l'utilisation de psycopg3
        _database_url = _database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    SQLALCHEMY_DATABASE_URI = _database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # (optionnel) configuration JWT
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 10800))  # 3 heures par défaut


    #huggingface
    HF_API_TOKEN = os.getenv("HF_API_TOKEN")

