import React, { useState, useEffect } from "react";
import {
    Routes,
    Route,
    useNavigate,
    useLocation,
    Navigate,
} from "react-router-dom";
import styles from "./DashboardAdmin.module.css";
import { authenticatedFetch } from "../../services/api";
import GestionEnseignants from "./GestionEnseignants";
import GestionEtudiants from "./GestionEtudiants";
import GestionMatieres from "./GestionMatieres";
import GestionStructureAcademique from "./GestionStructureAcademique";
import GestionApprobations from "./GestionApprobations";
import GestionPromotions from "./GestionPromotions";
import GestionAdmins from "./GestionAdmins";

interface DashboardAdminProps {
    onLogout: () => void;
}

// Fonction utilitaire pour extraire les initiales
const getInitiales = (nomComplet: string): string => {
    if (!nomComplet) return "A";
    const mots = nomComplet.trim().split(/\s+/);
    if (mots.length === 1) {
        return mots[0].charAt(0).toUpperCase();
    }
    return (mots[0].charAt(0) + mots[mots.length - 1].charAt(0)).toUpperCase();
};

const DashboardAdmin: React.FC<DashboardAdminProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [userData, setUserData] = useState({
        nom: "Administrateur",
        email: "admin@eni.com",
    });

    // Déterminer l'onglet actif basé sur l'URL
    const getActiveTabFromPath = (): string => {
        const path = location.pathname;
        if (path.includes("/enseignants")) return "enseignants";
        if (path.includes("/etudiants")) return "etudiants";
        if (path.includes("/matieres")) return "matieres";
        if (path.includes("/structure")) return "structure";
        if (path.includes("/approbations")) return "approbations";
        if (path.includes("/promotions")) return "promotions";
        if (path.includes("/statistiques")) return "statistiques";
        if (path.includes("/profil")) return "profil";
        return "enseignants";
    };

    const [activeTab, setActiveTab] = useState<string>(getActiveTabFromPath());
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalTeachers: 0,
        totalCourses: 0,
        totalNiveaux: 0,
        totalParcours: 0,
        pendingApprovals: 0,
        etudiantsActifs: 0,
        etudiantsInactifs: 0,
        enseignantsActifs: 0,
        enseignantsInactifs: 0,
    });

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
                nom: user.username || user.nom || "Administrateur",
                email: user.email || "admin@eni.com",
            });
        }
    }, []);

    // Charger les statistiques
    useEffect(() => {
        loadStats();
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

    const loadStats = async () => {
        try {
            const response = await authenticatedFetch("/api/admin/stats");
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Erreur stats:", error);
        }
    };

    // Charger les statistiques au montage du composant
    useEffect(() => {
        loadStats();
    }, []);

    // Recharger les statistiques quand on navigue vers la section statistiques
    useEffect(() => {
        if (activeTab === "statistiques") {
            loadStats();
        }
    }, [activeTab]);

    // Fonction pour changer d'onglet et naviguer
    const handleTabChange = (tab: string) => {
        // Naviguer vers la nouvelle route
        switch (tab) {
            case "enseignants":
                navigate("/admin/enseignants");
                break;
            case "etudiants":
                navigate("/admin/etudiants");
                break;
            case "admins":
                navigate("/admin/admins");
                break;
            case "matieres":
                navigate("/admin/matieres");
                break;
            case "structure":
                navigate("/admin/structure");
                break;
            case "approbations":
                navigate("/admin/approbations");
                break;
            case "promotions":
                navigate("/admin/promotions");
                break;
            case "statistiques":
                navigate("/admin/statistiques");
                break;
            case "profil":
                navigate("/admin/profil");
                break;
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        onLogout();
    };

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
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
                            activeTab === "enseignants" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("enseignants")}
                    >
                        <span className={styles.navIcon}>👨‍🏫</span>
                        <span className={styles.navText}>Enseignants</span>
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
                            activeTab === "admins" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("admins")}
                    >
                        <span className={styles.navIcon}>👨‍💼</span>
                        <span className={styles.navText}>Administrateurs</span>
                    </button>
                    <button
                        className={`${styles.navBtn} ${
                            activeTab === "matieres" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("matieres")}
                    >
                        <span className={styles.navIcon}>📚</span>
                        <span className={styles.navText}>Matières</span>
                    </button>
                    <button
                        className={`${styles.navBtn} ${
                            activeTab === "structure" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("structure")}
                    >
                        <span className={styles.navIcon}>🏛️</span>
                        <span className={styles.navText}>
                            Structure Académique
                        </span>
                    </button>
                    <button
                        className={`${styles.navBtn} ${
                            activeTab === "approbations" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("approbations")}
                    >
                        <span className={styles.navIcon}>✅</span>
                        <span className={styles.navText}>Approbations</span>
                    </button>
                    <button
                        className={`${styles.navBtn} ${
                            activeTab === "promotions" ? styles.active : ""
                        }`}
                        onClick={() => handleTabChange("promotions")}
                    >
                        <span className={styles.navIcon}>🎉</span>
                        <span className={styles.navText}>Promotions</span>
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
                                                Administrateur
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
                                            navigate("/admin/profil");
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
                    {/* Statistiques modernes - masquées pour les onglets Approbations et Promotions */}
                    {activeTab !== "approbations" &&
                        activeTab !== "promotions" && (
                            <div className={styles.cardsGrid}>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>👨‍🏫</div>
                                    <div className={styles.cardValue}>
                                        {stats.totalTeachers || 0}
                                    </div>
                                    <div className={styles.cardLabel}>
                                        Enseignants
                                    </div>
                                </div>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>👨‍🎓</div>
                                    <div className={styles.cardValue}>
                                        {stats.activeUsers || 0}
                                    </div>
                                    <div className={styles.cardLabel}>
                                        Étudiants
                                    </div>
                                </div>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>📚</div>
                                    <div className={styles.cardValue}>
                                        {stats.totalCourses || 0}
                                    </div>
                                    <div className={styles.cardLabel}>
                                        Matières
                                    </div>
                                </div>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>🎓</div>
                                    <div className={styles.cardValue}>
                                        {stats.totalNiveaux || 0}
                                    </div>
                                    <div className={styles.cardLabel}>
                                        Niveaux
                                    </div>
                                </div>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>📋</div>
                                    <div className={styles.cardValue}>
                                        {stats.totalParcours || 0}
                                    </div>
                                    <div className={styles.cardLabel}>
                                        Parcours
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Routes pour les différentes sections */}
                    <Routes>
                        <Route
                            path="/enseignants"
                            element={<GestionEnseignants theme={theme} />}
                        />
                        <Route
                            path="/etudiants"
                            element={<GestionEtudiants theme={theme} />}
                        />
                        <Route
                            path="/matieres"
                            element={<GestionMatieres theme={theme} />}
                        />
                        <Route
                            path="/structure"
                            element={
                                <GestionStructureAcademique theme={theme} />
                            }
                        />
                        <Route
                            path="/approbations"
                            element={
                                <GestionApprobations
                                    theme={theme}
                                    onApprovalChange={loadStats}
                                />
                            }
                        />
                        <Route
                            path="/promotions"
                            element={<GestionPromotions theme={theme} />}
                        />
                        <Route
                            path="/admins"
                            element={<GestionAdmins theme={theme} />}
                        />
                        <Route
                            path="/statistiques"
                            element={
                                <div className={styles.statistiquesContent}>
                                    <div className={styles.sectionHeader}>
                                        <h2>Statistiques Générales</h2>
                                        <p>
                                            Aperçu des statistiques de votre
                                            système
                                        </p>
                                    </div>

                                    {/* Statistiques détaillées */}
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}>
                                            <div className={styles.statIcon}>
                                                👥
                                            </div>
                                            <div className={styles.statContent}>
                                                <div
                                                    className={styles.statValue}
                                                >
                                                    {stats.totalUsers || 0}
                                                </div>
                                                <div
                                                    className={styles.statLabel}
                                                >
                                                    Total Utilisateurs
                                                </div>
                                                <div
                                                    className={
                                                        styles.statSubtext
                                                    }
                                                >
                                                    {stats.etudiantsActifs || 0}{" "}
                                                    étudiants actifs,{" "}
                                                    {stats.enseignantsActifs ||
                                                        0}{" "}
                                                    enseignants actifs
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.statCard}>
                                            <div className={styles.statIcon}>
                                                👨‍🎓
                                            </div>
                                            <div className={styles.statContent}>
                                                <div
                                                    className={styles.statValue}
                                                >
                                                    {stats.etudiantsActifs || 0}
                                                </div>
                                                <div
                                                    className={styles.statLabel}
                                                >
                                                    Étudiants Actifs
                                                </div>
                                                <div
                                                    className={
                                                        styles.statSubtext
                                                    }
                                                >
                                                    {stats.etudiantsInactifs ||
                                                        0}{" "}
                                                    en attente d'approbation
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.statCard}>
                                            <div className={styles.statIcon}>
                                                👨‍🏫
                                            </div>
                                            <div className={styles.statContent}>
                                                <div
                                                    className={styles.statValue}
                                                >
                                                    {stats.enseignantsActifs ||
                                                        0}
                                                </div>
                                                <div
                                                    className={styles.statLabel}
                                                >
                                                    Enseignants Actifs
                                                </div>
                                                <div
                                                    className={
                                                        styles.statSubtext
                                                    }
                                                >
                                                    {stats.enseignantsInactifs ||
                                                        0}{" "}
                                                    en attente d'approbation
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.statCard}>
                                            <div className={styles.statIcon}>
                                                📚
                                            </div>
                                            <div className={styles.statContent}>
                                                <div
                                                    className={styles.statValue}
                                                >
                                                    {stats.totalCourses || 0}
                                                </div>
                                                <div
                                                    className={styles.statLabel}
                                                >
                                                    Matières Actives
                                                </div>
                                                <div
                                                    className={
                                                        styles.statSubtext
                                                    }
                                                >
                                                    Matières disponibles dans le
                                                    système
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.statCard}>
                                            <div className={styles.statIcon}>
                                                🎓
                                            </div>
                                            <div className={styles.statContent}>
                                                <div
                                                    className={styles.statValue}
                                                >
                                                    {stats.totalNiveaux || 0}
                                                </div>
                                                <div
                                                    className={styles.statLabel}
                                                >
                                                    Niveaux
                                                </div>
                                                <div
                                                    className={
                                                        styles.statSubtext
                                                    }
                                                >
                                                    Niveaux d'études configurés
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.statCard}>
                                            <div className={styles.statIcon}>
                                                📋
                                            </div>
                                            <div className={styles.statContent}>
                                                <div
                                                    className={styles.statValue}
                                                >
                                                    {stats.totalParcours || 0}
                                                </div>
                                                <div
                                                    className={styles.statLabel}
                                                >
                                                    Parcours
                                                </div>
                                                <div
                                                    className={
                                                        styles.statSubtext
                                                    }
                                                >
                                                    Parcours d'études
                                                    disponibles
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section QCM - à développer */}
                                    <div className={styles.qcmStatsSection}>
                                        <h3>Statistiques QCM</h3>
                                        <div className={styles.emptyState}>
                                            <div className={styles.emptyIcon}>
                                                📊
                                            </div>
                                            <h4>
                                                Statistiques QCM en
                                                développement
                                            </h4>
                                            <p>
                                                Cette section contiendra les
                                                statistiques détaillées des QCM
                                                : nombre total de QCM, taux de
                                                réussite, moyennes par matière,
                                                etc.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                        <Route
                            path="/profil"
                            element={
                                <div className={styles.profilSection}>
                                    <div className={styles.sectionHeader}>
                                        <h2>Mon Profil</h2>
                                    </div>
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyIcon}>
                                            👤
                                        </div>
                                        <h4>Section Profil</h4>
                                        <p>
                                            Cette section contiendra les
                                            informations de profil de
                                            l'administrateur.
                                        </p>
                                    </div>
                                </div>
                            }
                        />
                        <Route
                            path="/"
                            element={
                                <Navigate to="/admin/enseignants" replace />
                            }
                        />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default DashboardAdmin;
