// src/services/api.ts
const API_BASE_URL = "http://localhost:5000";

// Variable pour stocker la fonction de déconnexion
let onTokenExpired: (() => void) | null = null;

/**
 * Définir la fonction callback à appeler quand le token expire
 * Cette fonction sera appelée par l'AuthContext
 */
export const setTokenExpiredCallback = (callback: () => void) => {
    onTokenExpired = callback;
};

/**
 * Fonction utilitaire pour faire des requêtes authentifiées avec gestion automatique de l'expiration du token
 */
export const authenticatedFetch = async (
    endpoint: string,
    options: RequestInit = {}
) => {
    const token = sessionStorage.getItem("access_token");

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

        // Déconnexion automatique uniquement si 401 (token expiré/invalide)
        if (response.status === 401) {
            console.error(
                "🔐 Token expiré ou invalide, déconnexion automatique..."
            );

            // Nettoyer le localStorage
            sessionStorage.removeItem("access_token");
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("currentPage");

            // Appeler la fonction de déconnexion si elle est définie
            if (onTokenExpired) {
                onTokenExpired();
            } else {
                // Fallback: recharger la page pour forcer le retour à la page de connexion
                window.location.href = "/";
            }

            // Retourner une réponse d'erreur
            throw new Error("Token expiré. Veuillez vous reconnecter.");
        }

        // 403: accès refusé (rôle ou autorisations) → ne pas déconnecter, laisser l'appelant gérer
        // On renvoie simplement la réponse pour que le composant affiche un message adéquat

        return response;
    } catch (error) {
        // Si c'est une erreur réseau ou autre, la propager
        throw error;
    }
};

// Exemple de fonctions spécifiques
export const getUserProfile = async () => {
    const response = await authenticatedFetch("/api/profile");
    return response.json();
};

export const getCourses = async () => {
    const response = await authenticatedFetch("/api/courses");
    return response.json();
};

// Vérifier la validité du token
export const verifyToken = async () => {
    const response = await authenticatedFetch("/auth/verify-token");
    return response.json();
};
