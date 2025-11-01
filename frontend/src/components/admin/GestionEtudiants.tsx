import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../services/api";
import styles from "./DashboardAdmin.module.css";
import ConfirmationModal from "../common/ConfirmationModal";

interface GestionEtudiantsProps {
    theme?: "dark" | "light";
}

interface Etudiant {
    id: number;
    matriculeId: string;
    utilisateur: {
        username: string;
        email: string;
    };
    niveau?: {
        code: string;
        nom: string;
    };
    parcours?: {
        code: string;
        nom: string;
    };
    mention?: {
        code: string;
        nom: string;
    };
    annee_universitaire: string;
    est_actif: boolean;
}

interface Niveau {
    id: number;
    code: string;
    nom: string;
}

interface Parcours {
    id: number;
    code: string;
    nom: string;
}

interface Mention {
    id: number;
    code: string;
    nom: string;
}

const GestionEtudiants: React.FC<GestionEtudiantsProps> = ({
    theme = "dark",
}) => {
    const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);
    const [parcours, setParcours] = useState<Parcours[]>([]);
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // États pour les filtres
    const [filtreAnnee, setFiltreAnnee] = useState("2024-2025");
    const [filtreNiveau, setFiltreNiveau] = useState("");
    const [filtreParcours, setFiltreParcours] = useState("");
    const [filtreMention, setFiltreMention] = useState("");

    // États pour les modales
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEtudiant, setSelectedEtudiant] = useState<Etudiant | null>(
        null
    );

    // État pour le modal de confirmation
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info" as "danger" | "warning" | "success" | "info",
        onConfirm: () => {},
        confirmText: "Confirmer",
        isLoading: false,
    });

    // États pour le formulaire
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        niveau_id: "",
        parcours_id: "",
        mention_id: "",
    });

    // Charger les étudiants
    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams();
            if (filtreAnnee) params.append("annee_universitaire", filtreAnnee);
            if (filtreNiveau) params.append("niveau", filtreNiveau);
            if (filtreParcours) params.append("parcours", filtreParcours);
            if (filtreMention) params.append("mention", filtreMention);

            const url = `/api/admin/etudiants${
                params.toString() ? "?" + params.toString() : ""
            }`;
            const response = await authenticatedFetch(url);

            if (response.ok) {
                const data = await response.json();
                setEtudiants(data.etudiants || []);
            } else {
                const errorData = await response.json();
                setError(
                    errorData.error || "Erreur lors du chargement des étudiants"
                );
            }
        } catch (err) {
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    // Charger les données de référence au montage
    useEffect(() => {
        const loadReferenceData = async () => {
            try {
                // Charger les niveaux
                const niveauxResponse = await authenticatedFetch(
                    "/api/admin/niveaux"
                );
                if (niveauxResponse.ok) {
                    const niveauxData = await niveauxResponse.json();
                    setNiveaux(niveauxData.niveaux || []);
                }

                // Charger les parcours
                const parcoursResponse = await authenticatedFetch(
                    "/api/admin/parcours"
                );
                if (parcoursResponse.ok) {
                    const parcoursData = await parcoursResponse.json();
                    setParcours(parcoursData.parcours || []);
                }

                // Charger les mentions
                const mentionsResponse = await authenticatedFetch(
                    "/api/admin/mentions"
                );
                if (mentionsResponse.ok) {
                    const mentionsData = await mentionsResponse.json();
                    setMentions(mentionsData.mentions || []);
                }
            } catch (error) {
                console.error("Erreur lors du chargement des données:", error);
            }
        };

        loadReferenceData();
    }, []);

    // Charger les étudiants quand les filtres changent
    useEffect(() => {
        loadData();
    }, [filtreAnnee, filtreNiveau, filtreParcours, filtreMention]);

    // Gérer le rechargement depuis l'extérieur
    useEffect(() => {
        const handleReload = () => {
            loadData();
        };

        window.addEventListener("reloadEtudiants", handleReload);
        return () => {
            window.removeEventListener("reloadEtudiants", handleReload);
        };
    }, [filtreAnnee, filtreNiveau, filtreParcours, filtreMention]);

    // Fonction pour obtenir les années disponibles
    const getAvailableYears = () => {
        const currentYear = new Date().getFullYear();
        const activeYears = [];
        const archivedYears = [];

        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            const yearStr = `${year}-${year + 1}`;
            if (i < 2) {
                activeYears.push(yearStr);
            } else {
                archivedYears.push(yearStr);
            }
        }

        return { activeYears, archivedYears };
    };

    // Filtrer les étudiants
    const etudiantsFiltres = etudiants.filter((etudiant) => {
        if (filtreAnnee && etudiant.annee_universitaire !== filtreAnnee)
            return false;
        if (filtreNiveau && etudiant.niveau?.code !== filtreNiveau)
            return false;
        if (filtreParcours && etudiant.parcours?.code !== filtreParcours)
            return false;
        if (filtreMention && etudiant.mention?.code !== filtreMention)
            return false;
        return true;
    });

    // Gestion des étudiants
    const handleAddEtudiant = async () => {
        try {
            const response = await authenticatedFetch("/api/admin/etudiants", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSuccessMessage("Étudiant ajouté avec succès");
                setShowAddModal(false);
                resetForm();
                loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de l'ajout");
            }
        } catch (err) {
            setError("Erreur de connexion");
        }
    };

    const handleEditEtudiant = async () => {
        if (!selectedEtudiant) return;

        try {
            const response = await authenticatedFetch(
                `/api/admin/etudiants/${selectedEtudiant.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                }
            );

            if (response.ok) {
                setSuccessMessage("Étudiant modifié avec succès");
                setShowEditModal(false);
                resetForm();
                loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la modification");
            }
        } catch (err) {
            setError("Erreur de connexion");
        }
    };

    const handleDeleteEtudiant = async (etudiant: Etudiant) => {
        setConfirmationModal({
            isOpen: true,
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer l'étudiant "${etudiant.utilisateur.username}" ? Cette action est irréversible.`,
            type: "danger",
            confirmText: "Supprimer",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/etudiants/${etudiant.id}`,
                        {
                            method: "DELETE",
                        }
                    );

                    if (response.ok) {
                        setSuccessMessage("✅ Étudiant supprimé avec succès");
                        loadData();
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                    } else {
                        const errorData = await response.json();
                        setError(
                            errorData.error || "Erreur lors de la suppression"
                        );
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                    }
                } catch (err) {
                    setError("Erreur de connexion");
                    setConfirmationModal((prev) => ({
                        ...prev,
                        isOpen: false,
                        isLoading: false,
                    }));
                }
            },
        });
    };

    const resetForm = () => {
        setFormData({
            username: "",
            email: "",
            niveau_id: "",
            parcours_id: "",
            mention_id: "",
        });
        setSelectedEtudiant(null);
        setError("");
        setSuccessMessage("");
    };

    const openEditModal = (etudiant: Etudiant) => {
        setSelectedEtudiant(etudiant);
        setFormData({
            username: etudiant.utilisateur.username,
            email: etudiant.utilisateur.email,
            niveau_id: etudiant.niveau?.id?.toString() || "",
            parcours_id: etudiant.parcours?.id?.toString() || "",
            mention_id: etudiant.mention?.id?.toString() || "",
        });
        setShowEditModal(true);
    };

    // Toggle du statut d'un étudiant
    const toggleEtudiantStatus = async (id: number, newStatus: boolean) => {
        const etudiant = etudiants.find((e) => e.id === id);
        const nom = etudiant?.utilisateur?.username || "cet étudiant";
        const action = newStatus ? "activer" : "désactiver";

        setConfirmationModal({
            isOpen: true,
            title: `${newStatus ? "Activer" : "Désactiver"} l'étudiant`,
            message: `Êtes-vous sûr de vouloir ${action} ${nom} ?`,
            type: newStatus ? "success" : "warning",
            confirmText: newStatus ? "Activer" : "Désactiver",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/etudiants/${id}/status`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ est_actif: newStatus }),
                        }
                    );

                    if (response.ok) {
                        loadData();
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                        // Notification de succès - setTimeout pour laisser le modal se fermer
                        setTimeout(() => {
                            alert(
                                `✅ Étudiant ${
                                    newStatus ? "activé" : "désactivé"
                                } avec succès !`
                            );
                        }, 200);
                    } else {
                        const errorData = await response.json();
                        setError(
                            errorData.error ||
                                "Erreur lors du changement de statut"
                        );
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                    }
                } catch (error) {
                    setError("Erreur de connexion");
                    setConfirmationModal((prev) => ({
                        ...prev,
                        isOpen: false,
                        isLoading: false,
                    }));
                }
            },
        });
    };

    const { activeYears, archivedYears } = getAvailableYears();

    if (loading) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                Chargement...
            </div>
        );
    }

    return (
        <>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Gestion des Étudiants</h2>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                {successMessage && (
                    <div className={styles.successMessage}>
                        {successMessage}
                    </div>
                )}

                {/* Filtres */}
                <div className={styles.filtersContainer}>
                    <div className={styles.filterGroup}>
                        <label>Année universitaire:</label>
                        <select
                            value={filtreAnnee}
                            onChange={(e) => setFiltreAnnee(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <optgroup label="Années actives">
                                {activeYears.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Années archivées">
                                {archivedYears.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Niveau:</label>
                        <select
                            value={filtreNiveau}
                            onChange={(e) => setFiltreNiveau(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="">Tous les niveaux</option>
                            {niveaux.map((niveau) => (
                                <option key={niveau.id} value={niveau.code}>
                                    {niveau.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Parcours:</label>
                        <select
                            value={filtreParcours}
                            onChange={(e) => setFiltreParcours(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="">Tous les parcours</option>
                            {parcours.map((parcours) => (
                                <option key={parcours.id} value={parcours.code}>
                                    {parcours.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Mention:</label>
                        <select
                            value={filtreMention}
                            onChange={(e) => setFiltreMention(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="">Toutes les mentions</option>
                            {mentions.map((mention) => (
                                <option key={mention.id} value={mention.code}>
                                    {mention.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: "12px",
                            marginTop: "20px",
                        }}
                    >
                        <button
                            className={`${styles.btn} ${styles.depublieBtn}`}
                            onClick={() => setShowAddModal(true)}
                        >
                            ➕ Ajouter un Étudiant
                        </button>
                    </div>
                </div>

                {/* Tableau des étudiants */}
                <div className={styles.tableContainer}>
                    {loading ? (
                        <div style={{ padding: "40px", textAlign: "center" }}>
                            <div className={styles.loadingSpinner}>⏳</div>
                            <p>Chargement des étudiants...</p>
                        </div>
                    ) : etudiantsFiltres.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center" }}>
                            <p>Aucun étudiant trouvé</p>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Matricule</th>
                                    <th>Nom complet</th>
                                    <th>Email</th>
                                    <th>Mention</th>
                                    <th>Parcours</th>
                                    <th>Niveau</th>
                                    <th>Année</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {etudiantsFiltres.map((etudiant) => (
                                    <tr key={etudiant.id}>
                                        <td>{etudiant.matriculeId}</td>
                                        <td>{etudiant.utilisateur.username}</td>
                                        <td>{etudiant.utilisateur.email}</td>
                                        <td>
                                            {etudiant.mention?.code || "N/A"}
                                        </td>
                                        <td>
                                            {etudiant.parcours?.code || "N/A"}
                                        </td>
                                        <td>
                                            {etudiant.niveau?.code || "N/A"}
                                        </td>
                                        <td>{etudiant.annee_universitaire}</td>
                                        <td>
                                            <div
                                                className={
                                                    styles.statusContainer
                                                }
                                            >
                                                <span
                                                    className={`${
                                                        styles.statusDot
                                                    } ${
                                                        etudiant.est_actif
                                                            ? styles.actif
                                                            : styles.inactif
                                                    }`}
                                                ></span>
                                                <span
                                                    className={`${
                                                        styles.status
                                                    } ${
                                                        etudiant.est_actif
                                                            ? styles.actif
                                                            : styles.inactif
                                                    }`}
                                                >
                                                    {etudiant.est_actif
                                                        ? "Actif"
                                                        : "Inactif"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <div
                                                    className={
                                                        styles.statusToggleContainer
                                                    }
                                                >
                                                    <button
                                                        className={`${
                                                            styles.statusToggle
                                                        } ${
                                                            etudiant.est_actif
                                                                ? styles.active
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            toggleEtudiantStatus(
                                                                etudiant.id,
                                                                !etudiant.est_actif
                                                            )
                                                        }
                                                        title={
                                                            etudiant.est_actif
                                                                ? "Désactiver"
                                                                : "Activer"
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.statusToggleBall
                                                            }
                                                        ></div>
                                                    </button>
                                                </div>
                                                <button
                                                    className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                                                    onClick={() =>
                                                        openEditModal(etudiant)
                                                    }
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                                                    onClick={() =>
                                                        handleDeleteEtudiant(
                                                            etudiant
                                                        )
                                                    }
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div
                    style={{
                        padding: "20px",
                        textAlign: "center",
                        borderTop: "1px solid var(--border-light)",
                    }}
                >
                    <p style={{ margin: 0, color: "var(--text-light)" }}>
                        Total: {etudiantsFiltres.length} étudiant(s)
                    </p>
                </div>
            </div>

            {/* Modal d'ajout */}
            {showAddModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Ajouter un étudiant</h3>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowAddModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleAddEtudiant();
                            }}
                            className={styles.modalForm}
                        >
                            <div className={styles.formGroup}>
                                <label htmlFor="student-username">
                                    Nom d'utilisateur *
                                </label>
                                <input
                                    type="text"
                                    id="student-username"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })
                                    }
                                    placeholder="Nom complet (ex: Jean Dupont)"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="student-email">Email *</label>
                                <input
                                    type="email"
                                    id="student-email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    placeholder="email@exemple.com"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="student-mention">
                                    Mention *
                                </label>
                                <select
                                    id="student-mention"
                                    value={formData.mention_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            mention_id: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">
                                        Sélectionner une mention
                                    </option>
                                    {mentions.map((mention) => (
                                        <option
                                            key={mention.id}
                                            value={mention.id}
                                        >
                                            {mention.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="student-parcours">
                                    Parcours *
                                </label>
                                <select
                                    id="student-parcours"
                                    value={formData.parcours_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            parcours_id: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">
                                        Sélectionner un parcours
                                    </option>
                                    {parcours.map((parcours) => (
                                        <option
                                            key={parcours.id}
                                            value={parcours.id}
                                        >
                                            {parcours.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="student-niveau">Niveau *</label>
                                <select
                                    id="student-niveau"
                                    value={formData.niveau_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            niveau_id: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">
                                        Sélectionner un niveau
                                    </option>
                                    {niveaux.map((niveau) => (
                                        <option
                                            key={niveau.id}
                                            value={niveau.id}
                                        >
                                            {niveau.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.secondary}`}
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className={`${styles.btn} ${styles.primary}`}
                                >
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de modification */}
            {showEditModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Modifier l'étudiant</h3>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowEditModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleEditEtudiant();
                            }}
                            className={styles.modalForm}
                        >
                            <div className={styles.formGroup}>
                                <label htmlFor="edit-student-username">
                                    Nom d'utilisateur *
                                </label>
                                <input
                                    type="text"
                                    id="edit-student-username"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })
                                    }
                                    placeholder="Nom complet (ex: Jean Dupont)"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="edit-student-email">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    id="edit-student-email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    placeholder="email@exemple.com"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="edit-student-mention">
                                    Mention *
                                </label>
                                <select
                                    id="edit-student-mention"
                                    value={formData.mention_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            mention_id: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">
                                        Sélectionner une mention
                                    </option>
                                    {mentions.map((mention) => (
                                        <option
                                            key={mention.id}
                                            value={mention.id}
                                        >
                                            {mention.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="edit-student-parcours">
                                    Parcours *
                                </label>
                                <select
                                    id="edit-student-parcours"
                                    value={formData.parcours_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            parcours_id: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">
                                        Sélectionner un parcours
                                    </option>
                                    {parcours.map((parcours) => (
                                        <option
                                            key={parcours.id}
                                            value={parcours.id}
                                        >
                                            {parcours.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="edit-student-niveau">
                                    Niveau *
                                </label>
                                <select
                                    id="edit-student-niveau"
                                    value={formData.niveau_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            niveau_id: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">
                                        Sélectionner un niveau
                                    </option>
                                    {niveaux.map((niveau) => (
                                        <option
                                            key={niveau.id}
                                            value={niveau.id}
                                        >
                                            {niveau.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.secondary}`}
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className={`${styles.btn} ${styles.primary}`}
                                >
                                    Modifier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de confirmation */}
            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={() =>
                    setConfirmationModal((prev) => ({ ...prev, isOpen: false }))
                }
                onConfirm={confirmationModal.onConfirm}
                title={confirmationModal.title}
                message={confirmationModal.message}
                type={confirmationModal.type}
                confirmText={confirmationModal.confirmText}
                isLoading={confirmationModal.isLoading}
                theme={theme}
            />
        </>
    );
};

export default GestionEtudiants;
