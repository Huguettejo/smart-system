import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useCallback,
} from "react";

interface User {
    id: number;
    username: string;
    email: string;
    role: "enseignant" | "etudiant" | "admin";
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
    checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fonction de déconnexion
    const logout = useCallback(() => {
        console.log("🚪 Déconnexion de l'utilisateur");
        setUser(null);
        setToken(null);
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("currentPage");
    }, []);

    // Fonction de connexion
    const login = useCallback((accessToken: string, userData: User) => {
        console.log("✅ Connexion de l'utilisateur:", userData.username);
        setToken(accessToken);
        setUser(userData);
        sessionStorage.setItem("access_token", accessToken);
        sessionStorage.setItem("user", JSON.stringify(userData));
    }, []);

    // Fonction pour vérifier le statut d'authentification
    const checkAuthStatus = useCallback(async () => {
        const storedToken = sessionStorage.getItem("access_token");
        const storedUser = sessionStorage.getItem("user");

        if (!storedToken || !storedUser) {
            setIsLoading(false);
            return;
        }

        try {
            const userData = JSON.parse(storedUser);

            // Vérifier la validité du token auprès du serveur
            const response = await fetch(
                "http://localhost:5000/auth/verify-token",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.valid && data.user) {
                    console.log("✅ Token valide, utilisateur authentifié");
                    setToken(storedToken);
                    setUser(data.user);
                    // Mettre à jour les données utilisateur au cas où
                    sessionStorage.setItem("user", JSON.stringify(data.user));
                } else {
                    console.log("❌ Token invalide");
                    logout();
                }
            } else {
                console.log(
                    "❌ Erreur de vérification du token (statut:",
                    response.status,
                    ")"
                );
                logout();
            }
        } catch (error) {
            console.error("❌ Erreur lors de la vérification du token:", error);
            logout();
        } finally {
            setIsLoading(false);
        }
    }, [logout]);

    // Vérifier l'authentification au montage du composant
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        checkAuthStatus,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

// Export d'une fonction pour accéder au logout depuis n'importe où (pour l'intercepteur API)
let authLogoutCallback: (() => void) | null = null;

export const setAuthLogoutCallback = (callback: () => void) => {
    authLogoutCallback = callback;
};

export const triggerAuthLogout = () => {
    if (authLogoutCallback) {
        authLogoutCallback();
    }
};
