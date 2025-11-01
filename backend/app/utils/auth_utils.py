from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def role_required(required_role):
    """Décorateur pour protéger une route par rôle"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role != required_role:
                return jsonify({"msg": f"Accès refusé, rôle requis: {required_role}"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
