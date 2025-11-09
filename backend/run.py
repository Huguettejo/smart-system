from app import create_app
import os

app = create_app()

if __name__ == "__main__":
    # Mode développement : activer debug et reload automatique
    # En production, ces options doivent être désactivées
    debug_mode = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=debug_mode,
        use_reloader=debug_mode,
        use_debugger=debug_mode
    )