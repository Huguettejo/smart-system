import React, { useState, useEffect } from "react";
import {
    Routes,
    Route,
    useNavigate,
    useLocation,
    Navigate,
} from "react-router-dom";
import styles from "./DashboardEnseignant.module.css";
import { authenticatedFetch } from "../../services/api";
import { useTheme } from "../../contexts/ThemeContext";
import QCMSection from "./QCMSection";
import EtudiantsSection from "./EtudiantsSection";
import StatistiquesSection from "./StatistiquesSection";
import ProfilSection from "./ProfilSection";
import CreerQCMPage from "./CreerQCMPage";

interface DashboardEnseignantProps {
    onLogout: () => void;
}

// Fonction utilitaire pour extraire les initiales
const getInitiales = (nomComplet: string): string => {
    if (!nomComplet) return "E";
    const mots = nomComplet.trim().split(/\s+/);
    if (mots.length === 1) {
        return mots[0].charAt(0).toUpperCase();
    }
    return (mots[0].charAt(0) + mots[mots.length - 1].charAt(0)).toUpperCase();
};

const DashboardEnseignant: React.FC<DashboardEnseignantProps> = ({
    onLogout,
}) => {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [userData, setUserData] = useState({
        nom: "Enseignant",
        email: "enseignant@eni.com",
    });

    // Déterminer l'onglet actif basé sur l'URL
    const getActiveTabFromPath = ():
        | "qcm"
        | "etudiants"
        | "statistiques"
        | "profil" => {
        const path = location.pathname;
        if (path.includes("/etudiants")) return "etudiants";
        if (path.includes("/statistiques")) return "statistiques";
        if (path.includes("/profil")) return "profil";
        return "qcm";
    };

    const [activeTab, setActiveTab] = useState<
        "qcm" | "etudiants" | "statistiques" | "profil"
    >(getActiveTabFromPath());
    const [qcms, setQcms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Synchroniser l'onglet actif avec l'URL
    useEffect(() => {
        setActiveTab(getActiveTabFromPath());
    }, [location.pathname]);

    // Charger les données utilisateur
    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserData({
                nom: user.username || user.nom || "Enseignant",
                email: user.email || "enseignant@eni.com",
            });
        }
    }, []);

    // Charger les QCM
    useEffect(() => {
        loadQCMs();
    }, []);

    // Fermer le menu déroulant quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (
                !target.closest(`.${styles.userProfile}`) &&
                !target.closest(`.${styles.userDropdown}`)
            ) {
                setShowUserDropdown(false);
            }
        };

        if (showUserDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showUserDropdown]);

    const loadQCMs = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(
                "/api/qcm/enseignant/qcms"
            );
            if (response.ok) {
                const data = await response.json();
                // L'API retourne un tableau directement, pas un objet
                setQcms(Array.isArray(data) ? data : []);
                setError(""); // Clear any previous errors
            } else {
                setError("Erreur lors du chargement des QCM");
            }
        } catch (error) {
            console.error("Erreur QCM:", error);
            setError("Erreur lors du chargement des QCM");
        } finally {
            setLoading(false);
        }
    };

    // Fonction pour changer d'onglet et naviguer
    const handleTabChange = (
        tab: "qcm" | "etudiants" | "statistiques" | "profil"
    ) => {
        // Naviguer vers la nouvelle route
        switch (tab) {
            case "qcm":
                navigate("/enseignant/dashboard");
                break;
            case "etudiants":
                navigate("/enseignant/etudiants");
                break;
            case "statistiques":
                navigate("/enseignant/statistiques");
                break;
            case "profil":
                navigate("/enseignant/profil");
                break;
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        onLogout();
    };

    // Fonctions pour les QCM
    const handleCreerQCM = () => {
        // Naviguer vers la page de création de QCM
        navigate("/enseignant/creer-qcm");
    };

    const handleModifierQCM = (qcm: any) => {
        // Naviguer vers la page de modification
        navigate(`/enseignant/modifier-qcm/${qcm.id}`);
    };

    const handleSupprimerQCM = async (qcm: any) => {
        if (
            window.confirm(
                `Êtes-vous sûr de vouloir supprimer le QCM "${qcm.sujet}" ?`
            )
        ) {
            try {
                const response = await authenticatedFetch(
                    `/api/qcm/${qcm.id}`,
                    {
                        method: "DELETE",
                    }
                );
                if (response.ok) {
                    alert("QCM supprimé avec succès !");
                    loadQCMs(); // Recharger la liste
                } else {
                    alert("Erreur lors de la suppression");
                }
            } catch (error) {
                console.error("Erreur suppression:", error);
                alert("Erreur lors de la suppression");
            }
        }
    };

    const handlePublierQCM = async (qcm: any) => {
        try {
            const response = await authenticatedFetch(
                `/api/qcm/${qcm.id}/publier`,
                {
                    method: "POST",
                }
            );
            if (response.ok) {
                alert("QCM publié avec succès !");
                loadQCMs(); // Recharger la liste
            } else {
                alert("Erreur lors de la publication");
            }
        } catch (error) {
            console.error("Erreur publication:", error);
            alert("Erreur lors de la publication");
        }
    };

    const handleDepublierQCM = async (qcm: any) => {
        try {
            const response = await authenticatedFetch(
                `/api/qcm/${qcm.id}/depublier`,
                {
                    method: "POST",
                }
            );
            if (response.ok) {
                alert("QCM dépublié avec succès !");
                loadQCMs(); // Recharger la liste
            } else {
                alert("Erreur lors de la dépublication");
            }
        } catch (error) {
            console.error("Erreur dépublication:", error);
            alert("Erreur lors de la dépublication");
        }
    };

    const handleVoirResultats = (qcm: any) => {
        // Naviguer vers la page des résultats
        navigate(`/enseignant/resultats-qcm/${qcm.id}`);
    };

    const handleCorrigerQCM = async (qcm: any) => {
        try {
            const response = await authenticatedFetch(
                `/api/qcm/${qcm.id}/corriger`,
                {
                    method: "POST",
                }
            );
            if (response.ok) {
                alert("QCM corrigé avec succès !");
                loadQCMs(); // Recharger la liste
            } else {
                alert("Erreur lors de la correction");
            }
        } catch (error) {
            console.error("Erreur correction:", error);
            alert("Erreur lors de la correction");
        }
    };

    return (
        <div
            className={`${styles.dashboard} ${
                theme === "dark" ? styles.dark : ""
            }`}
        >
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    <h1 className={styles.eniLogo}>ENI</h1>
                </div>

                <nav className={styles.navigation}>
                    <button
                        className={`${styles.navBtn} ${
                            activeTab === "qcm" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("qcm")}
                    >
                        <span className={styles.navIcon}>📝</span>
                        <span className={styles.navText}>Gestion QCM</span>
                    </button>
                    <button
                        className={`${styles.navBtn} ${
                            activeTab === "etudiants" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("etudiants")}
                    >
                        <span className={styles.navIcon}>👥</span>
                        <span className={styles.navText}>Étudiants</span>
                    </button>
                    <button
                        className={`${styles.navBtn} ${
                            activeTab === "statistiques" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("statistiques")}
                    >
                        <span className={styles.navIcon}>📊</span>
                        <span className={styles.navText}>Statistiques</span>
                    </button>
                    <button
                        className={`${styles.navBtn} ${
                            activeTab === "profil" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("profil")}
                    >
                        <span className={styles.navIcon}>👤</span>
                        <span className={styles.navText}>Profil</span>
                    </button>
                </nav>

                {/* Bouton de thème */}
                <div style={{ marginTop: "auto", padding: "20px 0" }}>
                    <div className={styles.themeToggleContainer}>
                        <span className={styles.themeToggleLabel}>
                            {theme === "light" ? "Mode Sombre" : "Mode Clair"}
                        </span>
                        <button
                            className={`${styles.themeToggle} ${
                                theme === "dark" ? styles.dark : ""
                            }`}
                            onClick={toggleTheme}
                        >
                            <div className={styles.themeToggleBall}></div>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className={styles.mainContent}>
                {/* Top bar */}
                <header className={styles.topBar}>
                    <div className={styles.topBarLeft}>
                        <div className={styles.searchBar}>
                            <span className={styles.searchIcon}>🔍</span>
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                className={styles.searchInput}
                            />
                        </div>
                    </div>
                    <div className={styles.topBarRight}>
                        <div
                            className={styles.userProfile}
                            onClick={() =>
                                setShowUserDropdown(!showUserDropdown)
                            }
                        >
                            <div className={styles.userAvatar}>
                                {getInitiales(userData.nom)}
                            </div>
                            <span
                                className={styles.dropdownArrow}
                                style={{ fontSize: "12px" }}
                            >
                                ▼
                            </span>
                        </div>

                        {/* Menu déroulant utilisateur */}
                        {showUserDropdown && (
                            <div className={styles.userDropdown}>
                                <div className={styles.dropdownHeader}>
                                    <h3 className={styles.dropdownHeaderTitle}>
                                        Actuellement connecté
                                    </h3>
                                    <div className={styles.currentUserSection}>
                                        <div
                                            className={styles.currentUserAvatar}
                                        >
                                            {getInitiales(userData.nom)}
                                        </div>
                                        <div className={styles.currentUserInfo}>
                                            <h4
                                                className={
                                                    styles.currentUserName
                                                }
                                            >
                                                {userData.nom}
                                            </h4>
                                            <p
                                                className={
                                                    styles.currentUserType
                                                }
                                            >
                                                Enseignant
                                            </p>
                                            <p
                                                className={
                                                    styles.currentUserEmail
                                                }
                                            >
                                                {userData.email}
                                            </p>
                                        </div>
                                        <span
                                            className={styles.currentUserCheck}
                                        >
                                            ✓
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.dropdownMenu}>
                                    <button
                                        className={styles.dropdownMenuItem}
                                        onClick={() => {
                                            navigate("/enseignant/profil");
                                            setShowUserDropdown(false);
                                        }}
                                    >
                                        <span
                                            className={styles.dropdownMenuIcon}
                                        >
                                            👤
                                        </span>
                                        Mon Profil
                                    </button>

                                    <div
                                        className={styles.dropdownDivider}
                                    ></div>

                                    <button
                                        className={`${styles.dropdownMenuItem} ${styles.danger}`}
                                        onClick={handleLogout}
                                    >
                                        <span
                                            className={styles.dropdownMenuIcon}
                                        >
                                            🚪
                                        </span>
                                        Se déconnecter
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Content area */}
                <div className={styles.content}>
                    {error && (
                        <div className={styles.errorMessage}>{error}</div>
                    )}
                    {loading && (
                        <div className={styles.loadingMessage}>
                            Chargement...
                        </div>
                    )}

                    {/* Routes pour les différentes sections */}
                    <Routes>
                        <Route
                            path="/dashboard"
                            element={
                                <div>
                                    {loading && (
                                        <div className={styles.loading}>
                                            <div
                                                className={styles.spinner}
                                            ></div>
                                            <p>Chargement des QCM...</p>
                                        </div>
                                    )}
                                    {error && (
                                        <div className={styles.error}>
                                            <p>❌ {error}</p>
                                            <button
                                                className={styles.btnPrimary}
                                                onClick={loadQCMs}
                                            >
                                                Réessayer
                                            </button>
                                        </div>
                                    )}
                                    {!loading && !error && (
                                        <QCMSection
                                            qcms={qcms}
                                            onCreerQCM={handleCreerQCM}
                                            onModifierQCM={handleModifierQCM}
                                            onSupprimerQCM={handleSupprimerQCM}
                                            onPublierQCM={handlePublierQCM}
                                            onDepublierQCM={handleDepublierQCM}
                                            onVoirResultats={
                                                handleVoirResultats
                                            }
                                            onCorrigerQCM={handleCorrigerQCM}
                                        />
                                    )}
                                </div>
                            }
                        />
                        <Route
                            path="/etudiants"
                            element={<EtudiantsSection />}
                        />
                        <Route
                            path="/statistiques"
                            element={<StatistiquesSection />}
                        />
                        <Route path="/profil" element={<ProfilSection />} />
                        <Route path="/creer-qcm" element={<CreerQCMPage />} />
                        <Route
                            path="/"
                            element={
                                <Navigate to="/enseignant/dashboard" replace />
                            }
                        />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default DashboardEnseignant;
