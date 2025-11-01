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
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # (optionnel) configuration JWT
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 10800))  # 3 heures par défaut


    #huggingface
    HF_API_TOKEN = os.getenv("HF_API_TOKEN")

