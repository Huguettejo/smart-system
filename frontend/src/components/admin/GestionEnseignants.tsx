import React, { useState, useEffect } from "react";
import styles from "./DashboardAdmin.module.css";
import { authenticatedFetch } from "../../services/api";
import ConfirmationModal from "../common/ConfirmationModal";
import ModalAssignationSimple from "./ModalAssignationSimple";

// Styles CSS pour les animations
const modalStyles = `
@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
`;

// Injecter les styles CSS
if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = modalStyles;
    document.head.appendChild(styleSheet);
}

interface Enseignant {
    id: number;
    utilisateur_id: number;
    departement: string;
    est_actif: boolean;
    assignations: {
        id: number;
        matiere_id: number;
        niveau_id: number | null;
        parcours_id: number | null;
        est_actif: boolean;
        matiere: {
            id: number;
            nom: string;
            code: string;
        };
        niveau: {
            id: number;
            nom: string;
            code: string;
        } | null;
        parcours: {
            id: number;
            nom: string;
            code: string;
        } | null;
    }[];
    utilisateur: {
        id: number;
        username: string;
        email: string;
        role: string;
    };
}

interface Matiere {
    id: number;
    nom: string;
    code: string;
    est_actif: boolean;
}

interface Niveau {
    id: number;
    nom: string;
    code: string;
}

interface Parcours {
    id: number;
    nom: string;
    code: string;
}

interface GestionEnseignantsProps {
    theme: "dark" | "light";
}

const GestionEnseignants: React.FC<GestionEnseignantsProps> = ({ theme }) => {
    // Fonctions pour obtenir les couleurs selon le thème
    const getThemeColors = () => {
        if (theme === "light") {
            return {
                bgPrimary: "#ffffff",
                bgSecondary: "#f8f9fa",
                bgTertiary: "#e9ecef",
                textPrimary: "#212529",
                textSecondary: "#6c757d",
                textMuted: "#adb5bd",
                borderColor: "#dee2e6",
                borderLight: "#e9ecef",
                shadow: "rgba(0, 0, 0, 0.1)",
                shadowHover: "rgba(0, 0, 0, 0.15)",
                accentPrimary: "#ff6b35",
                accentSecondary: "#f7931e",
                success: "#28a745",
                warning: "#ffc107",
                danger: "#dc3545",
                info: "#17a2b8",
                modalOverlay: "rgba(0, 0, 0, 0.5)",
                modalBg: "#ffffff",
                inputBg: "#ffffff",
                inputBorder: "#ced4da",
                inputFocus: "#80bdff",
            };
        } else {
            return {
                bgPrimary: "#1a1a2e",
                bgSecondary: "#16213e",
                bgTertiary: "#0f3460",
                textPrimary: "#ffffff",
                textSecondary: "#b8c5d6",
                textMuted: "#8a9ba8",
                borderColor: "#2d3748",
                borderLight: "#4a5568",
                shadow: "rgba(0, 0, 0, 0.3)",
                shadowHover: "rgba(0, 0, 0, 0.4)",
                accentPrimary: "#ff6b35",
                accentSecondary: "#f7931e",
                success: "#48bb78",
                warning: "#ed8936",
                danger: "#f56565",
                info: "#4299e1",
                modalOverlay: "rgba(0, 0, 0, 0.8)",
                modalBg: "#1e293b",
                inputBg: "#334155",
                inputBorder: "rgba(148, 163, 184, 0.3)",
                inputFocus: "#3b82f6",
            };
        }
    };

    const colors = getThemeColors();

    const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
    const [matieres, setMatieres] = useState<Matiere[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);
    const [parcours, setParcours] = useState<Parcours[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showAssignationModal, setShowAssignationModal] = useState(false);
    const [editingEnseignant, setEditingEnseignant] =
        useState<Enseignant | null>(null);
    const [formData, setFormData] = useState({
        nomComplet: "",
        email: "",
        password: "",
        departement: "",
        est_actif: true,
    });

    // État pour la modal de confirmation
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info" as "danger" | "warning" | "success" | "info",
        onConfirm: () => {},
        confirmText: "Confirmer",
        isLoading: false,
    });

    // Charger les assignations d'un enseignant spécifique
    const loadAssignations = async (enseignantId: number) => {
        try {
            const response = await authenticatedFetch(
                `/api/admin/enseignants/${enseignantId}/assignations`
            );

            if (response.ok) {
                const data = await response.json();
                // Mettre à jour les assignations de l'enseignant en cours d'édition
                setEnseignants((prev) =>
                    prev.map((enseignant) =>
                        enseignant.id === enseignantId
                            ? { ...enseignant, assignations: data.assignations }
                            : enseignant
                    )
                );

                // Mettre à jour aussi l'enseignant en cours d'édition
                if (
                    editingEnseignant &&
                    editingEnseignant.id === enseignantId
                ) {
                    setEditingEnseignant((prev) =>
                        prev
                            ? { ...prev, assignations: data.assignations }
                            : null
                    );
                }
            }
        } catch (error) {
            console.error("Erreur lors du chargement des assignations:", error);
        }
    };

    // Charger les données
    const loadData = async () => {
        try {
            setLoading(true);

            // Charger les enseignants
            const enseignantsResponse = await authenticatedFetch(
                "/api/admin/enseignants"
            );

            // Charger les matières
            const matieresResponse = await authenticatedFetch("/api/matieres");

            // Charger les niveaux
            const niveauxResponse = await authenticatedFetch(
                "/api/admin/niveaux"
            );

            // Charger les parcours
            const parcoursResponse = await authenticatedFetch(
                "/api/admin/parcours"
            );

            if (
                enseignantsResponse.ok &&
                matieresResponse.ok &&
                niveauxResponse.ok &&
                parcoursResponse.ok
            ) {
                const enseignantsData = await enseignantsResponse.json();
                const matieresData = await matieresResponse.json();
                const niveauxData = await niveauxResponse.json();
                const parcoursData = await parcoursResponse.json();

                setEnseignants(enseignantsData.enseignants);
                setMatieres(matieresData.matieres);
                setNiveaux(niveauxData.niveaux);
                setParcours(parcoursData.parcours);

                // Recharger les assignations de l'enseignant en cours d'édition
                if (editingEnseignant) {
                    await loadAssignations(editingEnseignant.id);
                }
            } else {
                setError("Erreur lors du chargement des données");
            }
        } catch (error) {
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Ouvrir le modal pour ajouter/modifier
    const openModal = (enseignant?: Enseignant) => {
        if (enseignant) {
            setEditingEnseignant(enseignant);
            setFormData({
                nomComplet: enseignant.utilisateur.username,
                email: enseignant.utilisateur.email,
                password: "", // Ne pas pré-remplir le mot de passe
                departement: enseignant.departement || "",
                est_actif: enseignant.est_actif,
            });
        } else {
            setEditingEnseignant(null);
            setFormData({
                nomComplet: "",
                email: "",
                password: "",
                departement: "",
                est_actif: true,
            });

            // Nettoyer agressivement les champs après ouverture du modal
            setTimeout(() => {
                const usernameInput = document.getElementById(
                    "teacher-fullname"
                ) as HTMLInputElement;
                if (usernameInput) {
                    usernameInput.value = "";
                    usernameInput.setAttribute("value", "");
                    usernameInput.removeAttribute("value");
                    usernameInput.focus();
                    usernameInput.blur();
                }
            }, 100);
        }
        setShowModal(true);
    };

    // Fermer le modal
    const closeModal = () => {
        setShowModal(false);
        setEditingEnseignant(null);
        setFormData({
            nomComplet: "",
            email: "",
            password: "",
            departement: "",
            est_actif: true,
        });
    };

    // Sauvegarder un enseignant
    const saveEnseignant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError("");
            setSuccessMessage("");

            const url = editingEnseignant
                ? `/api/admin/enseignants/${editingEnseignant.id}`
                : "/api/admin/enseignants";

            const method = editingEnseignant ? "PUT" : "POST";

            const dataToSend = {
                ...formData,
                username: formData.nomComplet, // Le backend stocke le nom complet dans username
            };

            // Ne pas envoyer le mot de passe vide lors de la modification
            if (editingEnseignant && !dataToSend.password) {
                delete dataToSend.password;
            }

            console.log("📤 Données envoyées:", dataToSend);
            console.log("🔗 URL:", url);
            console.log("📋 Méthode:", method);

            const response = await authenticatedFetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSend),
            });

            if (response.ok) {
                console.log("✅ Modification réussie");
                setSuccessMessage(
                    editingEnseignant
                        ? "Enseignant modifié avec succès"
                        : "Enseignant créé avec succès"
                );
                await loadData();
                closeModal();
            } else {
                console.log("❌ Erreur de modification:", response.status);
                const errorData = await response.json();
                console.log("📄 Détails de l'erreur:", errorData);
                setError(errorData.error || "Erreur lors de la sauvegarde");
            }
        } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    // Supprimer un enseignant
    const deleteEnseignant = async (id: number) => {
        const enseignant = enseignants.find((e) => e.id === id);
        const nom = enseignant?.utilisateur?.username || "cet enseignant";

        setConfirmationModal({
            isOpen: true,
            title: "Supprimer l'enseignant",
            message: `Êtes-vous sûr de vouloir supprimer ${nom} ? Cette action est irréversible.`,
            type: "danger",
            confirmText: "Supprimer",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/enseignants/${id}`,
                        {
                            method: "DELETE",
                        }
                    );

                    if (response.ok) {
                        await loadData();
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                        // Notification de succès - setTimeout pour laisser le modal se fermer
                        setTimeout(() => {
                            alert("✅ Enseignant supprimé avec succès !");
                        }, 200);
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

    const toggleEnseignantStatus = async (id: number, newStatus: boolean) => {
        const enseignant = enseignants.find((e) => e.id === id);
        const nom = enseignant?.utilisateur?.username || "cet enseignant";
        const action = newStatus ? "activer" : "désactiver";

        setConfirmationModal({
            isOpen: true,
            title: `${newStatus ? "Activer" : "Désactiver"} l'enseignant`,
            message: `Êtes-vous sûr de vouloir ${action} ${nom} ?`,
            type: newStatus ? "success" : "warning",
            confirmText: newStatus ? "Activer" : "Désactiver",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/enseignants/${id}/status`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ est_actif: newStatus }),
                        }
                    );

                    if (response.ok) {
                        await loadData();
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                        // Notification de succès - setTimeout pour laisser le modal se fermer
                        setTimeout(() => {
                            alert(
                                `✅ Enseignant ${
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

    // Ouvrir le modal de gestion des matières
    const openMatiereModal = (enseignant: Enseignant) => {
        try {
            console.log("🔍 Ouverture modal assignations pour:", enseignant);
            setEditingEnseignant(enseignant);
            setShowAssignationModal(true);
            console.log("✅ Modal assignations ouvert");
        } catch (error) {
            console.error("❌ Erreur ouverture modal:", error);
        }
    };

    // Fermer le modal de gestion des matières
    const closeMatiereModal = () => {
        setShowAssignationModal(false);
        setEditingEnseignant(null);
    };

    // Fonction pour forcer la fermeture complète
    const forceCloseAllModals = () => {
        console.log("🔄 Fermeture forcée de toutes les modals...");
        console.log(
            "📊 État avant fermeture - showAssignationModal:",
            showAssignationModal
        );
        console.log(
            "📊 État avant fermeture - confirmationModal.isOpen:",
            confirmationModal.isOpen
        );

        setShowAssignationModal(false);
        setConfirmationModal({
            isOpen: false,
            title: "",
            message: "",
            type: "info",
            onConfirm: () => {},
            confirmText: "Confirmer",
            isLoading: false,
        });

        console.log("✅ Toutes les modals fermées !");
        console.log(
            "📊 État après fermeture - showAssignationModal devrait être false"
        );
    };

    // Ajouter une nouvelle assignation avec confirmation
    const addNewAssignation = async () => {
        console.log("➕ Tentative d'ajout d'assignation...");
        console.log(
            "📊 État actuel showAssignationModal:",
            showAssignationModal
        );

        const matiereSelect = document.getElementById(
            "new_matiere_id"
        ) as HTMLSelectElement;
        const niveauSelect = document.getElementById(
            "new_niveau_id"
        ) as HTMLSelectElement;
        const parcoursSelectElement = document.getElementById(
            "new_parcours_id"
        ) as HTMLSelectElement;

        const matiere_id = parseInt(matiereSelect.value);
        const niveau_id = niveauSelect.value
            ? parseInt(niveauSelect.value)
            : null;
        const parcours_id = parcoursSelectElement.value
            ? parseInt(parcoursSelectElement.value)
            : null;

        console.log("📋 Données sélectionnées:", {
            matiere_id,
            niveau_id,
            parcours_id,
            enseignant: editingEnseignant?.utilisateur.username,
        });

        if (!matiere_id || !editingEnseignant) {
            console.log(
                "❌ Validation échouée: matière ou enseignant manquant"
            );
            setError("Veuillez sélectionner une matière");
            return;
        }

        console.log(
            "✅ Validation réussie, création de la modal de confirmation..."
        );

        // Trouver les détails pour la confirmation
        console.log("🔍 Recherche des détails...");
        const matiere = matieres.find((m) => m.id === matiere_id);
        console.log("📚 Matière trouvée:", matiere);
        const niveau = niveaux.find((n) => n.id === niveau_id);
        console.log("🎓 Niveau trouvé:", niveau);
        const parcoursTrouve = parcours.find((p) => p.id === parcours_id);
        console.log("🎯 Parcours trouvé:", parcoursTrouve);

        console.log("🔄 Création de la modal de confirmation...");

        // Créer le message de confirmation
        const confirmationMessage = `Êtes-vous sûr de vouloir assigner la matière "${
            matiere?.nom || "Inconnue"
        }"${niveau ? ` pour le niveau ${niveau.nom}` : ""}${
            parcoursTrouve ? ` et le parcours ${parcoursTrouve.nom}` : ""
        } à ${editingEnseignant.utilisateur.username} ?`;

        console.log("📝 Message de confirmation créé:", confirmationMessage);

        // Fermer l'interface de sélection des matières
        console.log("🔄 Fermeture de l'interface de sélection des matières...");
        setShowAssignationModal(false);

        setConfirmationModal({
            isOpen: true,
            title: "Confirmer l'ajout d'assignation",
            message: confirmationMessage,
            type: "info",
            confirmText: "Assigner",
            isLoading: false,
            onConfirm: async () => {
                console.log("🎯 Fonction onConfirm appelée !");
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        "/api/admin/assignations",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                matiere_id,
                                enseignant_id: editingEnseignant.id,
                                niveau_id,
                                parcours_id,
                            }),
                        }
                    );

                    if (response.ok) {
                        // Recharger toutes les données pour mettre à jour l'affichage
                        await loadData();
                        // Réinitialiser les sélecteurs
                        matiereSelect.value = "";
                        niveauSelect.value = "";
                        parcoursSelectElement.value = "";
                        // Fermer directement la modal d'assignation
                        console.log(
                            "🔄 Fermeture directe de la modal d'assignation..."
                        );
                        setShowAssignationModal(false);
                        setEditingEnseignant(null);
                        console.log("✅ Modal d'assignation fermée !");

                        // Fermer la modal de confirmation
                        console.log(
                            "🔄 Fermeture de la modal de confirmation..."
                        );
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                        console.log("✅ Modal de confirmation fermée !");

                        // Afficher un message de succès
                        setError(""); // Clear any previous errors
                        setSuccessMessage(
                            "✅ Assignation ajoutée avec succès !"
                        );
                        console.log("✅ Assignation ajoutée avec succès !");

                        // Effacer le message de succès après 3 secondes
                        setTimeout(() => {
                            setSuccessMessage("");
                        }, 3000);
                    } else {
                        const errorData = await response.json();
                        setError(
                            errorData.error ||
                                "Erreur lors de l'ajout de la matière"
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

        console.log("✅ Modal de confirmation créée avec succès !");
    };

    // Supprimer une assignation avec confirmation
    const deleteAssignation = async (assignationId: number) => {
        console.log(
            "🗑️ Tentative de suppression assignation ID:",
            assignationId
        );
        console.log(
            "📋 Assignations disponibles:",
            editingEnseignant?.assignations
        );

        // Trouver l'assignation pour afficher les détails
        const assignation = editingEnseignant?.assignations?.find(
            (a) => a.id === assignationId
        );
        const matiere = matieres.find((m) => m.id === assignation?.matiere_id);

        console.log("🔍 Assignation trouvée:", assignation);
        console.log("📚 Matière trouvée:", matiere);

        // Fermer l'interface de sélection des matières
        console.log(
            "🔄 Fermeture de l'interface de sélection des matières pour suppression..."
        );
        setShowAssignationModal(false);

        setConfirmationModal({
            isOpen: true,
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer l'assignation de la matière "${
                matiere?.nom || "Inconnue"
            }" ?`,
            type: "danger",
            confirmText: "Supprimer",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/assignations/${assignationId}`,
                        {
                            method: "DELETE",
                        }
                    );

                    if (response.ok) {
                        // Recharger toutes les données pour mettre à jour l'affichage
                        await loadData();
                        // Fermer directement la modal d'assignation
                        console.log(
                            "🔄 Fermeture directe de la modal d'assignation après suppression..."
                        );
                        setShowAssignationModal(false);
                        setEditingEnseignant(null);
                        console.log(
                            "✅ Modal d'assignation fermée après suppression !"
                        );

                        // Fermer la modal de confirmation
                        console.log(
                            "🔄 Fermeture de la modal de confirmation après suppression..."
                        );
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                        console.log(
                            "✅ Modal de confirmation fermée après suppression !"
                        );

                        // Afficher un message de succès
                        setError(""); // Clear any previous errors
                        setSuccessMessage(
                            "✅ Assignation supprimée avec succès !"
                        );
                        console.log("✅ Assignation supprimée avec succès !");

                        // Effacer le message de succès après 3 secondes
                        setTimeout(() => {
                            setSuccessMessage("");
                        }, 3000);
                    } else {
                        const errorData = await response.json();
                        setError(
                            errorData.error ||
                                "Erreur lors de la suppression de la matière"
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
                    <h2 className={styles.cardTitle}>
                        Gestion des Enseignants
                    </h2>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            className={`${styles.btn} ${styles.depublieBtn}`}
                            onClick={() => openModal()}
                        >
                            ➕ Ajouter un Enseignant
                        </button>
                    </div>
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        ❌ {error}
                        <button onClick={() => setError("")}>✕</button>
                    </div>
                )}

                {successMessage && (
                    <div
                        style={{
                            backgroundColor: "#d4edda",
                            color: "#155724",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            margin: "16px 0",
                            border: "1px solid #c3e6cb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        {successMessage}
                        <button
                            onClick={() => setSuccessMessage("")}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#155724",
                                cursor: "pointer",
                                fontSize: "16px",
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nom complet</th>
                                <th>Email</th>
                                <th>Matières</th>
                                <th>Département</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enseignants.map((enseignant) => (
                                <tr key={enseignant.id}>
                                    <td>{enseignant.utilisateur.username}</td>
                                    <td>{enseignant.utilisateur.email}</td>
                                    <td>
                                        {enseignant.assignations &&
                                        enseignant.assignations.length > 0 ? (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "4px",
                                                }}
                                            >
                                                {enseignant.assignations.map(
                                                    (assignation) => (
                                                        <span
                                                            key={assignation.id}
                                                            className={
                                                                styles.codeBadge
                                                            }
                                                            title={`${
                                                                assignation
                                                                    .matiere.nom
                                                            }${
                                                                assignation.niveau
                                                                    ? ` - ${assignation.niveau.code}`
                                                                    : ""
                                                            }${
                                                                assignation.parcours
                                                                    ? ` - ${assignation.parcours.code}`
                                                                    : ""
                                                            }`}
                                                        >
                                                            {
                                                                assignation
                                                                    .matiere
                                                                    .code
                                                            }
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <span className={styles.noNiveau}>
                                                Aucune matière
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {enseignant.departement ? (
                                            <span
                                                className={styles.niveauBadge}
                                            >
                                                {enseignant.departement}
                                            </span>
                                        ) : (
                                            <span className={styles.noNiveau}>
                                                Non défini
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.statusContainer}>
                                            <span
                                                className={`${
                                                    styles.statusDot
                                                } ${
                                                    enseignant.est_actif
                                                        ? styles.actif
                                                        : styles.inactif
                                                }`}
                                            ></span>
                                            <span
                                                className={`${styles.status} ${
                                                    enseignant.est_actif
                                                        ? styles.actif
                                                        : styles.inactif
                                                }`}
                                            >
                                                {enseignant.est_actif
                                                    ? "Actif"
                                                    : "Inactif"}
                                            </span>
                                            <button
                                                className={styles.addBtn}
                                                onClick={() =>
                                                    openMatiereModal(enseignant)
                                                }
                                                title="Matières"
                                                style={{ marginLeft: "8px" }}
                                            >
                                                📚
                                            </button>
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
                                                        enseignant.est_actif
                                                            ? styles.active
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        toggleEnseignantStatus(
                                                            enseignant.id,
                                                            !enseignant.est_actif
                                                        )
                                                    }
                                                    title={
                                                        enseignant.est_actif
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
                                                    openModal(enseignant)
                                                }
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                                                onClick={() =>
                                                    deleteEnseignant(
                                                        enseignant.id
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
                </div>
            </div>

            {/* Modal pour ajouter/modifier */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>
                                {editingEnseignant
                                    ? "Modifier l'Enseignant"
                                    : "Ajouter un Enseignant"}
                            </h3>
                            <button
                                className={styles.modalClose}
                                onClick={closeModal}
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={saveEnseignant}
                            className={styles.modalForm}
                            autoComplete="off"
                        >
                            {/* Champs leurres pour tromper l'auto-complétion */}
                            <div style={{ display: "none" }}>
                                <input
                                    type="text"
                                    name="fake-username"
                                    autoComplete="username"
                                />
                                <input
                                    type="email"
                                    name="fake-email"
                                    autoComplete="email"
                                />
                                <input
                                    type="password"
                                    name="fake-password"
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="teacher-fullname">
                                    Nom complet *
                                </label>
                                <input
                                    type="text"
                                    id="teacher-fullname"
                                    name="teacher-fullname"
                                    value={formData.nomComplet}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            nomComplet: e.target.value,
                                        })
                                    }
                                    placeholder="Nom complet (ex: Jean Dupont)"
                                    required
                                    autoComplete="off"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="email">Email *</label>
                                <input
                                    type="email"
                                    id="email"
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
                                <label htmlFor="password">
                                    Mot de passe{" "}
                                    {editingEnseignant
                                        ? "(laisser vide pour ne pas changer)"
                                        : "*"}
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })
                                    }
                                    placeholder="Mot de passe"
                                    required={!editingEnseignant}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="departement">Département</label>
                                <input
                                    type="text"
                                    id="departement"
                                    value={formData.departement}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            departement: e.target.value,
                                        })
                                    }
                                    placeholder="Ex: Informatique, Mathématiques"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="est_actif">Statut</label>
                                <select
                                    id="est_actif"
                                    value={
                                        formData.est_actif ? "true" : "false"
                                    }
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            est_actif:
                                                e.target.value === "true",
                                        })
                                    }
                                >
                                    <option value="true">Actif</option>
                                    <option value="false">Inactif</option>
                                </select>
                            </div>

                            {/* Section Matières - Déplacée en bas */}
                            <div className={styles.formGroup}>
                                <label
                                    style={{
                                        color: colors.textPrimary,
                                        fontSize: "16px",
                                        fontWeight: "600",
                                        marginBottom: "12px",
                                        display: "block",
                                    }}
                                >
                                    Matières
                                </label>

                                {/* Affichage des matières assignées (seulement en mode modification) */}
                                {editingEnseignant &&
                                editingEnseignant.assignations &&
                                editingEnseignant.assignations.length > 0 ? (
                                    <div
                                        style={{
                                            background:
                                                "rgba(59, 130, 246, 0.05)",
                                            borderRadius: "8px",
                                            padding: "16px",
                                            border: `1px solid ${colors.info}40`,
                                            marginBottom: "12px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: "8px",
                                            }}
                                        >
                                            {editingEnseignant.assignations.map(
                                                (assignation) => (
                                                    <div
                                                        key={assignation.id}
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "6px",
                                                            padding: "6px 12px",
                                                            backgroundColor:
                                                                "rgba(59, 130, 246, 0.1)",
                                                            borderRadius:
                                                                "16px",
                                                            border: "1px solid rgba(59, 130, 246, 0.3)",
                                                            fontSize: "12px",
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                backgroundColor:
                                                                    "#3b82f6",
                                                                color: "white",
                                                                padding:
                                                                    "2px 8px",
                                                                borderRadius:
                                                                    "12px",
                                                                fontSize:
                                                                    "10px",
                                                                fontWeight:
                                                                    "600",
                                                            }}
                                                        >
                                                            {
                                                                assignation
                                                                    .matiere
                                                                    .code
                                                            }
                                                        </span>
                                                        <span
                                                            style={{
                                                                color: colors.textSecondary,
                                                            }}
                                                        >
                                                            {
                                                                assignation
                                                                    .matiere.nom
                                                            }
                                                        </span>
                                                        <span
                                                            style={{
                                                                color: colors.textMuted,
                                                                fontSize:
                                                                    "10px",
                                                            }}
                                                        >
                                                            {assignation.niveau
                                                                ? assignation
                                                                      .niveau
                                                                      .code
                                                                : "Tous"}
                                                            {assignation.parcours
                                                                ? ` • ${assignation.parcours.code}`
                                                                : " • Tous"}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ) : editingEnseignant ? (
                                    <div
                                        style={{
                                            background: colors.bgSecondary,
                                            borderRadius: "8px",
                                            padding: "16px",
                                            border: `1px solid ${colors.borderColor}`,
                                            marginBottom: "12px",
                                            textAlign: "center",
                                            color: colors.textMuted,
                                            fontStyle: "italic",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "24px",
                                                marginBottom: "8px",
                                            }}
                                        >
                                            📚
                                        </div>
                                        Aucune matière assignée
                                    </div>
                                ) : null}

                                {/* Message explicatif */}
                                <p
                                    style={{
                                        margin: "8px 0 0 0",
                                        fontSize: "12px",
                                        color: colors.textMuted,
                                        lineHeight: "1.4",
                                    }}
                                >
                                    <strong>NB:</strong> Utilisez le bouton 📚
                                    "Matières" dans le tableau pour gérer les
                                    matières, niveaux et parcours de cet
                                    enseignant.
                                </p>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.secondary}`}
                                    onClick={closeModal}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className={`${styles.btn} ${styles.primary}`}
                                >
                                    {editingEnseignant ? "Modifier" : "Ajouter"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de gestion des matières - Version simple */}
            <ModalAssignationSimple
                isOpen={showAssignationModal}
                onClose={closeMatiereModal}
                enseignant={editingEnseignant}
                onAssignationAdded={loadData}
            />

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

export default GestionEnseignants;
