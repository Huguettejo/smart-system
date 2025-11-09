import React, { useState, useEffect } from "react";
import {
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation,
} from "react-router-dom";
import AuthPage from "./components/authentification/AuthPage";
import DashboardEnseignant from "./components/enseignant/DashboardEnseignant";
import DashboardEtudiant from "./components/etudiant/DashboardEtudiant";
import DashboardAdmin from "./components/admin/DashboardAdmin";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { setTokenExpiredCallback } from "./services/api";
import "./App.css";
import "./styles/themes.css";
import "./styles/dashboard-themes.css";
import "./styles/button-themes.css";
import "./styles/card-themes.css";

// Composant interne qui utilise le contexte d'authentification
function AppContent() {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Configurer le callback de déconnexion pour l'intercepteur API
    useEffect(() => {
        setTokenExpiredCallback(() => {
            console.log("🔐 Callback de déconnexion appelé depuis l'API");
            logout();
        });
    }, [logout]);

    // Rediriger vers le bon dashboard après connexion
    useEffect(() => {
        if (isAuthenticated && user) {
            const currentPath = location.pathname;
            // Si on est sur la page d'auth ou à la racine, rediriger vers le bon dashboard
            if (currentPath === "/" || currentPath === "/auth") {
                if (user.role === "enseignant") {
                    navigate("/enseignant/dashboard");
                } else if (user.role === "etudiant") {
                    navigate("/etudiant/evaluations");
                } else if (user.role === "admin") {
                    navigate("/admin/dashboard");
                }
            }
        }
    }, [isAuthenticated, user, navigate, location.pathname]);

    const handleLogout = () => {
        console.log("🚪 Déconnexion demandée");
        logout();
        navigate("/auth");
    };

    // Afficher un écran de chargement pendant la vérification
    if (isLoading) {
        return (
            <div className="App">
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100vh",
                        fontSize: "18px",
                        color: "#666",
                    }}
                >
                    🔄 Vérification de la session...
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <Routes>
                {/* Route d'authentification */}
                <Route
                    path="/auth"
                    element={
                        !isAuthenticated || !user ? (
                            <AuthPage onLogin={() => {}} />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* Routes pour les enseignants */}
                <Route
                    path="/enseignant/*"
                    element={
                        isAuthenticated && user?.role === "enseignant" ? (
                            <DashboardEnseignant onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/auth" replace />
                        )
                    }
                />

                {/* Routes pour les étudiants */}
                <Route
                    path="/etudiant/*"
                    element={
                        isAuthenticated && user?.role === "etudiant" ? (
                            <DashboardEtudiant onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/auth" replace />
                        )
                    }
                />

                {/* Routes pour les admins */}
                <Route
                    path="/admin/*"
                    element={
                        isAuthenticated && user?.role === "admin" ? (
                            <DashboardAdmin onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/auth" replace />
                        )
                    }
                />

                {/* Route racine - redirection selon le rôle */}
                <Route
                    path="/"
                    element={
                        isAuthenticated && user ? (
                            user.role === "enseignant" ? (
                                <Navigate to="/enseignant/dashboard" replace />
                            ) : user.role === "etudiant" ? (
                                <Navigate to="/etudiant/evaluations" replace />
                            ) : (
                                <Navigate to="/admin/dashboard" replace />
                            )
                        ) : (
                            <Navigate to="/auth" replace />
                        )
                    }
                />

                {/* Route par défaut */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

// Composant principal avec les providers
function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
