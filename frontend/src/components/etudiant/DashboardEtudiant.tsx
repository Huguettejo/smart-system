import React, { useState, useEffect } from "react";
import {
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation,
} from "react-router-dom";
import styles from "./DashboardEtudiant.module.css";
import { authenticatedFetch } from "../../services/api";
import EvaluationsSection from "./EvaluationsSection";
import ResultatsSection from "./ResultatsSection";
import ProfilSection from "./ProfilSection";

// Fonction utilitaire pour extraire les initiales
const getInitiales = (nomComplet: string): string => {
    if (!nomComplet) return "E";
    const mots = nomComplet.trim().split(/\s+/);
    if (mots.length === 1) {
        return mots[0].charAt(0).toUpperCase();
    }
    return (mots[0].charAt(0) + mots[mots.length - 1].charAt(0)).toUpperCase();
};

interface ProfilEtudiant {
    nom: string;
    matricule: string;
    niveau: string;
    parcours: string;
    mention?: string;
    annee_universitaire?: string;
    email: string;
    telephone: string;
    notes: { matiere: string; note: number }[];
}

interface QCMOption {
    id: number;
    texte: string;
    est_correcte: boolean;
}

interface QCMQuestion {
    id: number;
    texte: string;
    options: QCMOption[];
}

interface QCMEtudiant {
    id: number;
    titre: string;
    difficulte: string;
    type_exercice: string;
    duree_minutes: number | null;
    date_creation: string;
    questions: QCMQuestion[];
}

interface ResultatEtudiant {
    id: number;
    note: number;
    pourcentage: number;
    feedback: string;
    date_correction: string;
    nombre_correctes: number;
    nombre_incorrectes: number;
    temps_total: number;
    qcm_id: number;
    qcm_titre: string;
    evaluation_id: number | null;
}

interface DashboardEtudiantProps {
    onLogout: () => void;
}

const DashboardEtudiant: React.FC<DashboardEtudiantProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Déterminer l'onglet actif basé sur l'URL
    const getActiveTabFromPath = (): "evaluations" | "profil" | "resultats" => {
        const path = location.pathname;
        if (path.includes("/profil")) return "profil";
        if (path.includes("/resultats")) return "resultats";
        return "evaluations";
    };

    const [activeTab, setActiveTab] = useState<
        "evaluations" | "profil" | "resultats"
    >(getActiveTabFromPath());
    const [profilData, setProfilData] = useState<ProfilEtudiant>({
        nom: "",
        matricule: "",
        niveau: "",
        parcours: "",
        email: "",
        telephone: "",
        notes: [],
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    // États pour les QCM
    const [qcms, setQcms] = useState<QCMEtudiant[]>([]);
    const [reponsesQCM, setReponsesQCM] = useState<{
        [questionId: number]: number;
    }>({});
    const [qcmEnCours, setQcmEnCours] = useState<QCMEtudiant | null>(null);
    const [resultatQCM, setResultatQCM] = useState<{
        score: number;
        total: number;
        pourcentage: number;
        note: number;
        feedback: string;
        statut?: string;
    } | null>(null);
    const [showCompletion, setShowCompletion] = useState(false);

    // États pour les résultats
    const [resultats, setResultats] = useState<ResultatEtudiant[]>([]);

    // États pour le minuteur
    const [tempsRestant, setTempsRestant] = useState<number>(0);
    const [minuteurActif, setMinuteurActif] = useState<boolean>(false);

    // Synchroniser l'onglet actif avec l'URL
    useEffect(() => {
        setActiveTab(getActiveTabFromPath());
    }, [location.pathname]);

    // Charger le profil depuis localStorage
    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setProfilData((prev) => ({
                ...prev,
                nom: user.username || user.nom || "", // Le backend stocke le nom complet dans username
                email: user.email || "",
                matricule: user.matricule || "",
                niveau: user.niveau || "",
                parcours: user.parcours || "",
            }));
        }
    }, []);

    // Charger les données selon l'onglet actif
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError("");
            try {
                switch (activeTab) {
                    case "evaluations":
                        await loadQCMs();
                        break;
                    case "profil":
                        await loadProfilDetails();
                        break;
                    case "resultats":
                        await loadResultats();
                        break;
                }
            } catch (err) {
                console.error(err);
                setError("Erreur lors du chargement des données");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [activeTab]);

    // Empêcher la fermeture de l'onglet pendant un QCM
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (qcmEnCours && !resultatQCM) {
                e.preventDefault();
                e.returnValue =
                    "Vous avez un QCM en cours. Êtes-vous sûr de vouloir quitter ?";
                return "Vous avez un QCM en cours. Êtes-vous sûr de vouloir quitter ?";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [qcmEnCours, resultatQCM]);

    // Fonction pour fermer le menu déroulant quand on clique ailleurs
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

    const loadProfilDetails = async () => {
        try {
            const response = await authenticatedFetch(
                "/api/qcm/etudiant/profil"
            );
            if (response.ok) {
                const data = await response.json();
                setProfilData((prev) => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error("Erreur profil:", error);
        }
    };

    // Gestion du minuteur
    useEffect(() => {
        let interval: number;

        if (minuteurActif && tempsRestant > 0) {
            interval = setInterval(() => {
                setTempsRestant((prev) => {
                    if (prev <= 1) {
                        // Temps écoulé, soumettre automatiquement
                        setMinuteurActif(false);
                        if (qcmEnCours) {
                            soumettreQCM();
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [minuteurActif, tempsRestant, qcmEnCours]);

    // Fonctions pour les QCM
    const loadQCMs = async () => {
        try {
            const response = await authenticatedFetch("/api/qcm/etudiant/qcms");
            if (response.ok) {
                const data = await response.json();
                setQcms(data);
            }
        } catch (error) {
            console.error("Erreur QCM:", error);
        }
    };

    const commencerQCM = (qcm: QCMEtudiant) => {
        setQcmEnCours(qcm);
        setReponsesQCM({});
        setResultatQCM(null);
        // Démarrer le minuteur seulement si défini par l'enseignant
        if (qcm.duree_minutes && qcm.duree_minutes > 0) {
            setTempsRestant(qcm.duree_minutes * 60); // Convertir minutes en secondes
            setMinuteurActif(true);
        } else {
            setTempsRestant(0);
            setMinuteurActif(false);
        }
    };

    const selectionnerReponse = (questionId: number, optionId: number) => {
        setReponsesQCM((prev) => ({
            ...prev,
            [questionId]: optionId,
        }));
    };

    const soumettreQCM = async () => {
        if (!qcmEnCours) return;

        setLoading(true);
        setMinuteurActif(false); // Arrêter le minuteur

        try {
            // Calculer le temps écoulé seulement si un minuteur était actif
            const tempsEcoule =
                qcmEnCours.duree_minutes && qcmEnCours.duree_minutes > 0
                    ? qcmEnCours.duree_minutes * 60 - tempsRestant
                    : 0;

            const response = await authenticatedFetch(
                "/api/qcm/etudiant/soumettre",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        qcm_id: qcmEnCours.id,
                        reponses: reponsesQCM,
                        temps_execution: tempsEcoule,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();

                // Vérifier si c'est une soumission en attente de correction
                if (data.statut === "soumis") {
                    setResultatQCM({
                        score: 0,
                        total: 0,
                        pourcentage: 0,
                        note: 0,
                        feedback: "En attente de correction par l'enseignant",
                        statut: "soumis",
                    });
                } else {
                    setResultatQCM({
                        score: data.score,
                        total: data.total,
                        pourcentage: data.pourcentage,
                        note: data.note,
                        feedback: data.feedback,
                        statut: "corrigé",
                    });
                }

                // Recharger les résultats et la liste des QCM
                await loadResultats();
                await loadQCMs(); // Recharger la liste des QCM (le QCM passé disparaîtra)

                // Afficher l'interface de completion
                setShowCompletion(true);
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la soumission");
            }
        } catch (error) {
            console.error("Erreur soumission:", error);
            setError("Erreur lors de la soumission du QCM");
        } finally {
            setLoading(false);
        }
    };

    // Fonction pour empêcher la navigation pendant un QCM
    const handleTabChange = (
        newTab: "evaluations" | "profil" | "resultats"
    ) => {
        if (qcmEnCours && !resultatQCM) {
            alert(
                "⚠️ QCM en cours !\n\nVous ne pouvez pas naviguer vers d'autres onglets tant que vous n'avez pas soumis votre QCM ou que le temps n'est pas écoulé.\n\nVeuillez terminer votre évaluation en cours."
            );
            return;
        }

        // Naviguer vers la nouvelle route
        switch (newTab) {
            case "evaluations":
                navigate("/etudiant/evaluations");
                break;
            case "profil":
                navigate("/etudiant/profil");
                break;
            case "resultats":
                navigate("/etudiant/resultats");
                break;
        }
    };

    // Fonction pour empêcher la déconnexion pendant un QCM
    const handleLogout = () => {
        if (qcmEnCours && !resultatQCM) {
            alert(
                "⚠️ QCM en cours !\n\nVous ne pouvez pas vous déconnecter tant que vous n'avez pas soumis votre QCM ou que le temps n'est pas écoulé.\n\nVeuillez terminer votre évaluation en cours."
            );
            return;
        }

        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        onLogout();
    };

    // Fonction pour charger les résultats
    const loadResultats = async () => {
        try {
            const response = await authenticatedFetch(
                "/api/qcm/etudiant/resultats"
            );
            if (response.ok) {
                const data = await response.json();
                setResultats(data);
            }
        } catch (error) {
            console.error("Erreur résultats:", error);
        }
    };

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    // Fonction pour fermer l'interface de completion et naviguer
    const handleCompletionAction = (action: "resultats" | "evaluations") => {
        setShowCompletion(false);
        setQcmEnCours(null);
        setReponsesQCM({});
        setResultatQCM(null);

        // Naviguer vers la nouvelle route
        if (action === "resultats") {
            navigate("/etudiant/resultats");
        } else {
            navigate("/etudiant/evaluations");
        }
    };

    // --- Rendu ---
    return (
        <div
            className={`${styles.dashboard} ${
                theme === "dark" ? styles.dark : ""
            }`}
        >
            {/* Interface QCM plein écran - SEULEMENT le formulaire QCM */}
            {qcmEnCours && !resultatQCM && (
                <div className={styles.qcmFullScreenInterface}>
                    <div className={styles.qcmFullScreenContainer}>
                        {/* Header avec titre et minuteur */}
                        <div className={styles.qcmFullScreenHeader}>
                            <h1 className={styles.qcmFullScreenTitle}>
                                {qcmEnCours.titre}
                            </h1>
                            {qcmEnCours.duree_minutes &&
                                qcmEnCours.duree_minutes > 0 && (
                                    <div className={styles.qcmFullScreenTimer}>
                                        <span>⏱️</span>
                                        <span
                                            className={
                                                styles.qcmFullScreenTimerText
                                            }
                                        >
                                            {Math.floor(tempsRestant / 60)}:
                                            {(tempsRestant % 60)
                                                .toString()
                                                .padStart(2, "0")}
                                        </span>
                                    </div>
                                )}
                        </div>

                        {/* Formulaire QCM */}
                        <div className={styles.qcmFullScreenForm}>
                            <form className={styles.qcmForm}>
                                {qcmEnCours.questions.map((question, index) => (
                                    <div
                                        key={question.id}
                                        className={styles.questionCard}
                                    >
                                        <h4>Question {index + 1}</h4>
                                        <p className={styles.questionText}>
                                            {question.texte}
                                        </p>
                                        <div
                                            className={styles.optionsContainer}
                                        >
                                            {question.options.map((option) => (
                                                <label
                                                    key={option.id}
                                                    className={
                                                        styles.optionLabel
                                                    }
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question_${question.id}`}
                                                        value={option.id}
                                                        checked={
                                                            reponsesQCM[
                                                                question.id
                                                            ] === option.id
                                                        }
                                                        onChange={() =>
                                                            selectionnerReponse(
                                                                question.id,
                                                                option.id
                                                            )
                                                        }
                                                    />
                                                    <span>{option.texte}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Bouton de soumission */}
                                <div
                                    style={{
                                        textAlign: "center",
                                        marginTop: "32px",
                                    }}
                                >
                                    <button
                                        type="button"
                                        className={styles.btnSuccess}
                                        onClick={soumettreQCM}
                                        disabled={
                                            loading ||
                                            Object.keys(reponsesQCM).length !==
                                                qcmEnCours.questions.length
                                        }
                                    >
                                        {loading
                                            ? "Soumission..."
                                            : "Soumettre le QCM"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Interface de completion stylée après soumission */}
            {showCompletion && qcmEnCours && (
                <div className={styles.qcmCompletionInterface}>
                    <div className={styles.qcmCompletionCard}>
                        {resultatQCM?.statut === "soumis" ? (
                            <>
                                <div className={styles.qcmCompletionIcon}>
                                    ⏳
                                </div>
                                <h1 className={styles.qcmCompletionTitle}>
                                    QCM Soumis !
                                </h1>
                                <p className={styles.qcmCompletionSubtitle}>
                                    Votre évaluation a été soumise avec succès
                                </p>
                                <div className={styles.qcmCompletionSubject}>
                                    {qcmEnCours.titre}
                                </div>
                                <p className={styles.qcmCompletionMessage}>
                                    <strong>
                                        En attente de correction par
                                        l'enseignant
                                    </strong>
                                    <br />
                                    Vous recevrez vos résultats une fois la
                                    correction effectuée.
                                </p>
                                <div className={styles.qcmCompletionActions}>
                                    <button
                                        className={`${styles.qcmCompletionBtn} ${styles.secondary}`}
                                        onClick={() =>
                                            handleCompletionAction(
                                                "evaluations"
                                            )
                                        }
                                    >
                                        📝 Autres évaluations
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={styles.qcmCompletionIcon}>
                                    🎉
                                </div>
                                <h1 className={styles.qcmCompletionTitle}>
                                    QCM Terminé !
                                </h1>
                                <p className={styles.qcmCompletionSubtitle}>
                                    Félicitations pour avoir terminé votre
                                    évaluation
                                </p>
                                <div className={styles.qcmCompletionSubject}>
                                    {qcmEnCours.titre}
                                </div>
                                <p className={styles.qcmCompletionMessage}>
                                    Votre évaluation a été soumise avec succès.
                                    Vous pouvez maintenant consulter vos
                                    résultats ou passer à une autre évaluation.
                                </p>
                                <div className={styles.qcmCompletionActions}>
                                    <button
                                        className={`${styles.qcmCompletionBtn} ${styles.primary}`}
                                        onClick={() =>
                                            handleCompletionAction("resultats")
                                        }
                                    >
                                        📊 Voir mes résultats
                                    </button>
                                    <button
                                        className={`${styles.qcmCompletionBtn} ${styles.secondary}`}
                                        onClick={() =>
                                            handleCompletionAction(
                                                "evaluations"
                                            )
                                        }
                                    >
                                        📝 Autres évaluations
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Interface normale (sidebar, topbar, etc.) - masquée pendant QCM */}
            {!qcmEnCours && !showCompletion && (
                <>
                    {/* Sidebar moderne */}
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarLogo}>
                            <h1 className={styles.eniLogo}>ENI</h1>
                        </div>

                        <nav className={styles.navigation}>
                            <button
                                className={`${styles.navBtn} ${
                                    activeTab === "evaluations"
                                        ? styles.active
                                        : ""
                                } ${
                                    qcmEnCours && !resultatQCM
                                        ? styles.disabled
                                        : ""
                                }`}
                                onClick={() => handleTabChange("evaluations")}
                            >
                                <span className={styles.navIcon}>📝</span>
                                <span className={styles.navText}>
                                    Évaluations
                                </span>
                            </button>

                            <button
                                className={`${styles.navBtn} ${
                                    activeTab === "resultats"
                                        ? styles.active
                                        : ""
                                } ${
                                    qcmEnCours && !resultatQCM
                                        ? styles.disabled
                                        : ""
                                }`}
                                onClick={() => handleTabChange("resultats")}
                            >
                                <span className={styles.navIcon}>📊</span>
                                <span className={styles.navText}>
                                    Résultats
                                </span>
                            </button>
                            <button
                                className={`${styles.navBtn} ${
                                    activeTab === "profil" ? styles.active : ""
                                } ${
                                    qcmEnCours && !resultatQCM
                                        ? styles.disabled
                                        : ""
                                }`}
                                onClick={() => handleTabChange("profil")}
                            >
                                <span className={styles.navIcon}>👤</span>
                                <span className={styles.navText}>Profil</span>
                            </button>
                        </nav>

                        {/* Bouton de thème en bas */}
                        <div style={{ marginTop: "auto", padding: "20px 0" }}>
                            <div className={styles.themeToggleContainer}>
                                <span className={styles.themeToggleLabel}>
                                    {theme === "light"
                                        ? "Mode Sombre"
                                        : "Mode Clair"}
                                </span>
                                <button
                                    className={`${styles.themeToggle} ${
                                        theme === "dark" ? styles.dark : ""
                                    }`}
                                    onClick={toggleTheme}
                                >
                                    <div
                                        className={styles.themeToggleBall}
                                    ></div>
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main content area */}
                    <main className={styles.mainContent}>
                        {/* Top bar moderne */}
                        <header className={styles.topBar}>
                            <div className={styles.topBarLeft}>
                                <div className={styles.searchBar}>
                                    <span className={styles.searchIcon}>
                                        🔍
                                    </span>
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
                                        {getInitiales(profilData.nom || "")}
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
                                            <h3
                                                className={
                                                    styles.dropdownHeaderTitle
                                                }
                                            >
                                                Actuellement connecté
                                            </h3>
                                            <div
                                                className={
                                                    styles.currentUserSection
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.currentUserAvatar
                                                    }
                                                >
                                                    {getInitiales(
                                                        profilData.nom || ""
                                                    )}
                                                </div>
                                                <div
                                                    className={
                                                        styles.currentUserInfo
                                                    }
                                                >
                                                    <h4
                                                        className={
                                                            styles.currentUserName
                                                        }
                                                    >
                                                        {profilData.nom ||
                                                            "Étudiant"}
                                                    </h4>
                                                    <p
                                                        className={
                                                            styles.currentUserType
                                                        }
                                                    >
                                                        Étudiant
                                                    </p>
                                                    <p
                                                        className={
                                                            styles.currentUserEmail
                                                        }
                                                    >
                                                        {profilData.email ||
                                                            "email@exemple.com"}
                                                    </p>
                                                </div>
                                                <span
                                                    className={
                                                        styles.currentUserCheck
                                                    }
                                                >
                                                    ✓
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.dropdownMenu}>
                                            <button
                                                className={`${
                                                    styles.dropdownMenuItem
                                                } ${
                                                    qcmEnCours && !resultatQCM
                                                        ? styles.disabled
                                                        : ""
                                                }`}
                                                onClick={() => {
                                                    if (
                                                        !qcmEnCours ||
                                                        resultatQCM
                                                    ) {
                                                        navigate(
                                                            "/etudiant/profil"
                                                        );
                                                        setShowUserDropdown(
                                                            false
                                                        );
                                                    }
                                                }}
                                            >
                                                <span
                                                    className={
                                                        styles.dropdownMenuIcon
                                                    }
                                                >
                                                    👤
                                                </span>
                                                Mon Profil
                                            </button>

                                            <div
                                                className={
                                                    styles.dropdownDivider
                                                }
                                            ></div>

                                            <button
                                                className={`${styles.dropdownMenuItem} ${styles.danger}`}
                                                onClick={handleLogout}
                                            >
                                                <span
                                                    className={
                                                        styles.dropdownMenuIcon
                                                    }
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
                            {/* Statistiques modernes */}
                            <div className={styles.cardsGrid}>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>📝</div>
                                    <div className={styles.cardValue}>
                                        {qcms.length}
                                    </div>
                                    <div className={styles.cardLabel}>
                                        QCM Disponibles
                                    </div>
                                </div>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>✅</div>
                                    <div className={styles.cardValue}>
                                        {resultats.length}
                                    </div>
                                    <div className={styles.cardLabel}>
                                        QCM Terminés
                                    </div>
                                </div>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>📊</div>
                                    <div className={styles.cardValue}>
                                        {resultats.length > 0
                                            ? Math.round(
                                                  resultats.reduce(
                                                      (acc, r) => acc + r.note,
                                                      0
                                                  ) / resultats.length
                                              )
                                            : 0}
                                    </div>
                                    <div className={styles.cardLabel}>
                                        Moyenne
                                    </div>
                                </div>
                                <div className={styles.cardSmall}>
                                    <div className={styles.cardIcon}>🎯</div>
                                    <div className={styles.cardValue}>
                                        {resultats.length > 0
                                            ? Math.round(
                                                  resultats.reduce(
                                                      (acc, r) =>
                                                          acc + r.pourcentage,
                                                      0
                                                  ) / resultats.length
                                              )
                                            : 0}
                                        %
                                    </div>
                                    <div className={styles.cardLabel}>
                                        Taux de Réussite
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className={styles.errorMessage}>
                                    {error}
                                </div>
                            )}
                            {loading && (
                                <div className={styles.loadingMessage}>
                                    Chargement...
                                </div>
                            )}

                            {/* Routes pour les différentes sections */}
                            <Routes>
                                <Route
                                    path="/evaluations"
                                    element={
                                        <EvaluationsSection
                                            qcms={qcms}
                                            qcmEnCours={qcmEnCours}
                                            onCommencerQCM={commencerQCM}
                                        />
                                    }
                                />
                                <Route
                                    path="/resultats"
                                    element={
                                        <ResultatsSection
                                            resultats={resultats}
                                        />
                                    }
                                />
                                <Route
                                    path="/profil"
                                    element={
                                        <ProfilSection
                                            profilData={profilData}
                                        />
                                    }
                                />
                                <Route
                                    path="/"
                                    element={
                                        <Navigate
                                            to="/etudiant/evaluations"
                                            replace
                                        />
                                    }
                                />
                            </Routes>
                        </div>
                    </main>
                </>
            )}
        </div>
    );
};

export default DashboardEtudiant;
