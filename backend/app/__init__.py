from flask import Flask, jsonify
from .extensions import db,migrate, jwt, bcrypt
from config import Config
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configuration JWT dynamique pour le développement
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600  # 3 heures
    
    CORS(app, origins=["http://localhost:5173"])

    # Initialiser extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Gestionnaires d'erreurs JWT personnalisés
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Appelé quand un token expiré est utilisé"""
        return jsonify({
            'error': 'Token expiré',
            'message': 'Votre session a expiré. Veuillez vous reconnecter.'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Appelé quand un token invalide est utilisé"""
        return jsonify({
            'error': 'Token invalide',
            'message': 'Le token fourni est invalide. Veuillez vous reconnecter.'
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Appelé quand aucun token n'est fourni"""
        return jsonify({
            'error': 'Token manquant',
            'message': 'Authentification requise. Veuillez vous connecter.'
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """Appelé quand un token révoqué est utilisé"""
        return jsonify({
            'error': 'Token révoqué',
            'message': 'Votre session a été révoquée. Veuillez vous reconnecter.'
        }), 401


    # Importer les modèles (important pour que SQLAlchemy les enregistre)
    from . import models

    # Importer et enregistrer les routes
    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/auth")

    from .routes.document import document_bp
    app.register_blueprint(document_bp, url_prefix="/api/documents")

    from .routes.qcm import qcm_bp
    app.register_blueprint(qcm_bp, url_prefix="/api/qcm")

    from .routes.admin import admin_bp
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    from .routes.niveau_parcours import niveau_parcours_bp
    app.register_blueprint(niveau_parcours_bp, url_prefix="/api/admin")

    from .routes.etudiants import etudiants_bp
    app.register_blueprint(etudiants_bp, url_prefix="/api/admin")

    from .routes.enseignants import enseignants_bp
    app.register_blueprint(enseignants_bp, url_prefix="/api/admin")

    from .routes.matieres import matieres_bp
    app.register_blueprint(matieres_bp, url_prefix="/api")

    from .routes.stats import stats_bp
    app.register_blueprint(stats_bp)

    from .routes.mentions import mentions_bp
    app.register_blueprint(mentions_bp, url_prefix="/api/admin")

    return app
