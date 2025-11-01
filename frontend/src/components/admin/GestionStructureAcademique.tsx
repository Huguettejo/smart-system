import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../services/api";
import styles from "./GestionMentions.module.css";
import ConfirmationModal from "../common/ConfirmationModal";

interface Mention {
    id: number;
    nom: string;
    code: string;
    est_actif: boolean;
    parcours: Parcours[];
}

interface Parcours {
    id: number;
    nom: string;
    code: string;
    description: string;
    mention_id: number | null;
    niveaux?: Niveau[];
    est_actif: boolean;
    date_creation: string;
}

interface Niveau {
    id: number;
    nom: string;
    code: string;
    description: string;
    ordre: number;
    est_actif: boolean;
    date_creation: string;
}

interface GestionStructureAcademiqueProps {
    theme: "dark" | "light";
}

const GestionStructureAcademique: React.FC<GestionStructureAcademiqueProps> = ({
    theme,
}) => {
    // Onglet actif
    const [activeTab, setActiveTab] = useState<
        "mentions" | "parcours" | "niveaux"
    >("mentions");

    // États généraux
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [parcours, setParcours] = useState<Parcours[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    // États pour les formulaires Mentions
    const [showMentionForm, setShowMentionForm] = useState(false);
    const [editingMention, setEditingMention] = useState<Mention | null>(null);
    const [mentionForm, setMentionForm] = useState({
        nom: "",
        code: "",
        est_actif: true,
    });

    // États pour les formulaires Parcours
    const [showParcoursForm, setShowParcoursForm] = useState(false);
    const [editingParcours, setEditingParcours] = useState<Parcours | null>(
        null
    );
    const [parcoursForm, setParcoursForm] = useState({
        nom: "",
        code: "",
        description: "",
        mention_id: 0,
        niveau_ids: [] as number[],
        est_actif: true,
    });

    // États pour les formulaires Niveaux
    const [showNiveauForm, setShowNiveauForm] = useState(false);
    const [editingNiveau, setEditingNiveau] = useState<Niveau | null>(null);
    const [niveauForm, setNiveauForm] = useState({
        nom: "",
        code: "",
        description: "",
        est_actif: true,
    });

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

    // Charger toutes les données
    const loadData = async () => {
        try {
            setLoading(true);
            console.log("🔄 Début du chargement des données...");

            const [mentionsResponse, parcoursResponse, niveauxResponse] =
                await Promise.all([
                    authenticatedFetch("/api/admin/mentions?t=" + Date.now(), {
                        headers: { "Cache-Control": "no-cache" },
                    }),
                    authenticatedFetch("/api/admin/parcours?t=" + Date.now(), {
                        headers: { "Cache-Control": "no-cache" },
                    }),
                    authenticatedFetch("/api/admin/niveaux?t=" + Date.now(), {
                        headers: { "Cache-Control": "no-cache" },
                    }),
                ]);

            if (
                mentionsResponse.ok &&
                parcoursResponse.ok &&
                niveauxResponse.ok
            ) {
                const mentionsData = await mentionsResponse.json();
                const parcoursData = await parcoursResponse.json();
                const niveauxData = await niveauxResponse.json();

                console.log("📊 Données reçues:", {
                    mentions: mentionsData.mentions.length,
                    mentionsInactives: mentionsData.mentions.filter(
                        (m: any) => !m.est_actif
                    ).length,
                    parcours: parcoursData.parcours.length,
                    parcoursInactifs: parcoursData.parcours.filter(
                        (p: any) => !p.est_actif
                    ).length,
                    niveaux: niveauxData.niveaux.length,
                    niveauxInactifs: niveauxData.niveaux.filter(
                        (n: any) => !n.est_actif
                    ).length,
                });

                setMentions(mentionsData.mentions);
                setParcours(parcoursData.parcours);
                setNiveaux(niveauxData.niveaux);
            } else {
                setError("Erreur lors du chargement des données");
            }
        } catch (error) {
            console.error("Erreur:", error);
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // =================================================================
    // GESTION DES MENTIONS
    // =================================================================

    const handleCreateMention = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/admin/mentions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mentionForm),
            });

            if (response.ok) {
                setSuccess("Mention créée avec succès");
                setShowMentionForm(false);
                setMentionForm({ nom: "", code: "", est_actif: true });
                await loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la création");
            }
        } catch (error) {
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMention = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMention) return;

        try {
            setLoading(true);
            const response = await authenticatedFetch(
                `/api/admin/mentions/${editingMention.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mentionForm),
                }
            );

            if (response.ok) {
                setSuccess("Mention mise à jour avec succès");
                setShowMentionForm(false);
                setEditingMention(null);
                setMentionForm({ nom: "", code: "", est_actif: true });
                await loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la mise à jour");
            }
        } catch (error) {
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMention = async (id: number) => {
        const mention = mentions.find((m) => m.id === id);

        setConfirmationModal({
            isOpen: true,
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer la mention "${
                mention?.nom || "Inconnue"
            }" ? Cette action est irréversible.`,
            type: "danger",
            confirmText: "Supprimer",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/mentions/${id}`,
                        { method: "DELETE" }
                    );

                    if (response.ok) {
                        setSuccess("✅ Mention supprimée avec succès");
                        await loadData();
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

    // =================================================================
    // GESTION DES PARCOURS
    // =================================================================

    const handleCreateParcours = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const dataToSend = {
                ...parcoursForm,
                mention_id: parcoursForm.mention_id || null,
            };

            const response = await authenticatedFetch("/api/admin/parcours", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend),
            });

            if (response.ok) {
                setSuccess("Parcours créé avec succès");
                setShowParcoursForm(false);
                setParcoursForm({
                    nom: "",
                    code: "",
                    description: "",
                    mention_id: 0,
                    niveau_ids: [],
                    est_actif: true,
                });
                await loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la création");
            }
        } catch (error) {
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateParcours = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingParcours) return;

        try {
            setLoading(true);
            const dataToSend = {
                ...parcoursForm,
                mention_id: parcoursForm.mention_id || null,
            };

            const response = await authenticatedFetch(
                `/api/admin/parcours/${editingParcours.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend),
                }
            );

            if (response.ok) {
                setSuccess("Parcours mis à jour avec succès");
                setShowParcoursForm(false);
                setEditingParcours(null);
                setParcoursForm({
                    nom: "",
                    code: "",
                    description: "",
                    mention_id: 0,
                    niveau_ids: [],
                    est_actif: true,
                });
                await loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la mise à jour");
            }
        } catch (error) {
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteParcours = async (id: number) => {
        const parcoursItem = parcours.find((p) => p.id === id);

        setConfirmationModal({
            isOpen: true,
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer le parcours "${
                parcoursItem?.nom || "Inconnu"
            }" ? Cette action est irréversible.`,
            type: "danger",
            confirmText: "Supprimer",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/parcours/${id}`,
                        { method: "DELETE" }
                    );

                    if (response.ok) {
                        setSuccess("✅ Parcours supprimé avec succès");
                        await loadData();
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

    // =================================================================
    // GESTION DES NIVEAUX
    // =================================================================

    const handleCreateNiveau = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/admin/niveaux", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(niveauForm),
            });

            if (response.ok) {
                setSuccess("Niveau créé avec succès");
                setShowNiveauForm(false);
                setNiveauForm({
                    nom: "",
                    code: "",
                    description: "",
                    est_actif: true,
                });
                await loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la création");
            }
        } catch (error) {
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateNiveau = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingNiveau) return;

        try {
            setLoading(true);
            const response = await authenticatedFetch(
                `/api/admin/niveaux/${editingNiveau.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(niveauForm),
                }
            );

            if (response.ok) {
                setSuccess("Niveau mis à jour avec succès");
                setShowNiveauForm(false);
                setEditingNiveau(null);
                setNiveauForm({
                    nom: "",
                    code: "",
                    description: "",
                    est_actif: true,
                });
                await loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la mise à jour");
            }
        } catch (error) {
            setError("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteNiveau = async (id: number) => {
        const niveau = niveaux.find((n) => n.id === id);

        setConfirmationModal({
            isOpen: true,
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer le niveau "${
                niveau?.nom || "Inconnu"
            }" ? Cette action est irréversible.`,
            type: "danger",
            confirmText: "Supprimer",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/niveaux/${id}`,
                        { method: "DELETE" }
                    );

                    if (response.ok) {
                        setSuccess("✅ Niveau supprimé avec succès");
                        await loadData();
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

    // =================================================================
    // FONCTIONS DE BASCULEMENT ACTIF/INACTIF
    // =================================================================

    const toggleMentionStatus = async (mention: Mention) => {
        const newStatus = !mention.est_actif;
        const action = newStatus ? "activer" : "désactiver";

        setConfirmationModal({
            isOpen: true,
            title: `${newStatus ? "Activer" : "Désactiver"} la mention`,
            message: `Êtes-vous sûr de vouloir ${action} la mention "${mention.nom}" ?`,
            type: newStatus ? "success" : "warning",
            confirmText: newStatus ? "Activer" : "Désactiver",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/mentions/${mention.id}`,
                        {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                nom: mention.nom,
                                code: mention.code,
                                est_actif: newStatus,
                            }),
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
                                `✅ Mention ${
                                    newStatus ? "activée" : "désactivée"
                                } avec succès !`
                            );
                        }, 200);
                    } else {
                        const errorData = await response.json();
                        setError(
                            errorData.error || "Erreur lors de la mise à jour"
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

    const toggleParcoursStatus = async (parcours: Parcours) => {
        const newStatus = !parcours.est_actif;
        const action = newStatus ? "activer" : "désactiver";

        setConfirmationModal({
            isOpen: true,
            title: `${newStatus ? "Activer" : "Désactiver"} le parcours`,
            message: `Êtes-vous sûr de vouloir ${action} le parcours "${parcours.nom}" ?`,
            type: newStatus ? "success" : "warning",
            confirmText: newStatus ? "Activer" : "Désactiver",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/parcours/${parcours.id}`,
                        {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                nom: parcours.nom,
                                code: parcours.code,
                                description: parcours.description,
                                mention_id: parcours.mention_id || null,
                                niveau_ids: parcours.niveaux
                                    ? parcours.niveaux.map((n) => n.id)
                                    : [],
                                est_actif: newStatus,
                            }),
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
                                `✅ Parcours ${
                                    newStatus ? "activé" : "désactivé"
                                } avec succès !`
                            );
                        }, 200);
                    } else {
                        const errorData = await response.json();
                        setError(
                            errorData.error || "Erreur lors de la mise à jour"
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

    const toggleNiveauStatus = async (niveau: Niveau) => {
        const newStatus = !niveau.est_actif;
        const action = newStatus ? "activer" : "désactiver";

        setConfirmationModal({
            isOpen: true,
            title: `${newStatus ? "Activer" : "Désactiver"} le niveau`,
            message: `Êtes-vous sûr de vouloir ${action} le niveau "${niveau.nom}" ?`,
            type: newStatus ? "success" : "warning",
            confirmText: newStatus ? "Activer" : "Désactiver",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/niveaux/${niveau.id}`,
                        {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                nom: niveau.nom,
                                code: niveau.code,
                                description: niveau.description,
                                est_actif: newStatus,
                            }),
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
                                `✅ Niveau ${
                                    newStatus ? "activé" : "désactivé"
                                } avec succès !`
                            );
                        }, 200);
                    } else {
                        const errorData = await response.json();
                        setError(
                            errorData.error || "Erreur lors de la mise à jour"
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

    // =================================================================
    // FONCTIONS D'ÉDITION
    // =================================================================

    const openEditMention = (mention: Mention) => {
        setEditingMention(mention);
        setMentionForm({
            nom: mention.nom,
            code: mention.code,
            est_actif: mention.est_actif,
        });
        setShowMentionForm(true);
    };

    const openEditParcours = (parcours: Parcours) => {
        setEditingParcours(parcours);
        setParcoursForm({
            nom: parcours.nom,
            code: parcours.code,
            description: parcours.description || "",
            mention_id: parcours.mention_id || 0,
            niveau_ids: parcours.niveaux
                ? parcours.niveaux.map((n) => n.id)
                : [],
            est_actif: parcours.est_actif,
        });
        setShowParcoursForm(true);
    };

    const openEditNiveau = (niveau: Niveau) => {
        setEditingNiveau(niveau);
        setNiveauForm({
            nom: niveau.nom,
            code: niveau.code,
            description: niveau.description,
            est_actif: niveau.est_actif,
        });
        setShowNiveauForm(true);
    };

    // Fermer formulaires
    const closeForms = () => {
        setShowMentionForm(false);
        setShowParcoursForm(false);
        setShowNiveauForm(false);
        setEditingMention(null);
        setEditingParcours(null);
        setEditingNiveau(null);
        setMentionForm({ nom: "", code: "", est_actif: true });
        setParcoursForm({
            nom: "",
            code: "",
            description: "",
            mention_id: 0,
            niveau_ids: [],
            est_actif: true,
        });
        setNiveauForm({ nom: "", code: "", description: "", est_actif: true });
        setError("");
        setSuccess("");
    };

    // =================================================================
    // RENDU DU COMPOSANT
    // =================================================================

    return (
        <div
            className={`${styles.gestionMentions} ${
                theme === "dark" ? styles.dark : ""
            }`}
        >
            {/* En-tête avec onglets */}
            <div className={styles.headerSection}>
                <h2>Structure Académique</h2>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${
                            activeTab === "mentions" ? styles.active : ""
                        }`}
                        onClick={() => setActiveTab("mentions")}
                    >
                        🏆 Mentions
                    </button>
                    <button
                        className={`${styles.tab} ${
                            activeTab === "parcours" ? styles.active : ""
                        }`}
                        onClick={() => setActiveTab("parcours")}
                    >
                        📋 Parcours
                    </button>
                    <button
                        className={`${styles.tab} ${
                            activeTab === "niveaux" ? styles.active : ""
                        }`}
                        onClick={() => setActiveTab("niveaux")}
                    >
                        🎓 Niveaux
                    </button>
                </div>
            </div>

            {/* Messages d'erreur/succès */}
            {error && (
                <div className={`${styles.alert} ${styles.alertError}`}>
                    {error}
                </div>
            )}
            {success && (
                <div className={`${styles.alert} ${styles.alertSuccess}`}>
                    {success}
                </div>
            )}

            {/* Formulaires modaux */}
            {(showMentionForm || showParcoursForm || showNiveauForm) && (
                <div className={styles.modalOverlay} onClick={closeForms}>
                    <div
                        className={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h3>
                                {showMentionForm
                                    ? editingMention
                                        ? "Modifier la Mention"
                                        : "Nouvelle Mention"
                                    : showParcoursForm
                                    ? editingParcours
                                        ? "Modifier le Parcours"
                                        : "Nouveau Parcours"
                                    : editingNiveau
                                    ? "Modifier le Niveau"
                                    : "Nouveau Niveau"}
                            </h3>
                            <button
                                className={styles.closeBtn}
                                onClick={closeForms}
                            >
                                ×
                            </button>
                        </div>

                        {/* Formulaire Mentions */}
                        {showMentionForm && (
                            <form
                                onSubmit={
                                    editingMention
                                        ? handleUpdateMention
                                        : handleCreateMention
                                }
                            >
                                <div className={styles.formGroup}>
                                    <label>Nom de la mention</label>
                                    <input
                                        type="text"
                                        value={mentionForm.nom}
                                        onChange={(e) =>
                                            setMentionForm({
                                                ...mentionForm,
                                                nom: e.target.value,
                                            })
                                        }
                                        required
                                        placeholder="Ex: Informatique"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Code</label>
                                    <input
                                        type="text"
                                        value={mentionForm.code}
                                        onChange={(e) =>
                                            setMentionForm({
                                                ...mentionForm,
                                                code: e.target.value,
                                            })
                                        }
                                        required
                                        placeholder="Ex: INFO"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={mentionForm.est_actif}
                                            onChange={(e) =>
                                                setMentionForm({
                                                    ...mentionForm,
                                                    est_actif: e.target.checked,
                                                })
                                            }
                                        />
                                        Actif
                                    </label>
                                </div>
                                <div className={styles.formActions}>
                                    <button
                                        type="button"
                                        onClick={closeForms}
                                        className={`${styles.btn} ${styles.btnSecondary}`}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "En cours..."
                                            : editingMention
                                            ? "Modifier"
                                            : "Créer"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Formulaire Parcours */}
                        {showParcoursForm && (
                            <form
                                onSubmit={
                                    editingParcours
                                        ? handleUpdateParcours
                                        : handleCreateParcours
                                }
                            >
                                <div className={styles.formGroup}>
                                    <label>Nom du parcours</label>
                                    <input
                                        type="text"
                                        value={parcoursForm.nom}
                                        onChange={(e) =>
                                            setParcoursForm({
                                                ...parcoursForm,
                                                nom: e.target.value,
                                            })
                                        }
                                        required
                                        placeholder="Ex: Informatique Générale"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Code</label>
                                    <input
                                        type="text"
                                        value={parcoursForm.code}
                                        onChange={(e) =>
                                            setParcoursForm({
                                                ...parcoursForm,
                                                code: e.target.value,
                                            })
                                        }
                                        required
                                        placeholder="Ex: IG"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Description</label>
                                    <textarea
                                        value={parcoursForm.description}
                                        onChange={(e) =>
                                            setParcoursForm({
                                                ...parcoursForm,
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Description du parcours (optionnel)"
                                        rows={3}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Mention</label>
                                    <select
                                        value={parcoursForm.mention_id}
                                        onChange={(e) =>
                                            setParcoursForm({
                                                ...parcoursForm,
                                                mention_id: parseInt(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                    >
                                        <option value={0}>
                                            Aucune mention (parcours général)
                                        </option>
                                        {mentions.map((mention) => (
                                            <option
                                                key={mention.id}
                                                value={mention.id}
                                            >
                                                {mention.nom} ({mention.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Niveaux (sélection multiple)</label>
                                    <div className={styles.checkboxGroup}>
                                        {niveaux.map((niveau) => (
                                            <label
                                                key={niveau.id}
                                                className={styles.checkboxLabel}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={parcoursForm.niveau_ids.includes(
                                                        niveau.id
                                                    )}
                                                    onChange={(e) => {
                                                        const newNiveauIds = e
                                                            .target.checked
                                                            ? [
                                                                  ...parcoursForm.niveau_ids,
                                                                  niveau.id,
                                                              ]
                                                            : parcoursForm.niveau_ids.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      niveau.id
                                                              );
                                                        setParcoursForm({
                                                            ...parcoursForm,
                                                            niveau_ids:
                                                                newNiveauIds,
                                                        });
                                                    }}
                                                />
                                                {niveau.nom} ({niveau.code})
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={parcoursForm.est_actif}
                                            onChange={(e) =>
                                                setParcoursForm({
                                                    ...parcoursForm,
                                                    est_actif: e.target.checked,
                                                })
                                            }
                                        />
                                        Actif
                                    </label>
                                </div>
                                <div className={styles.formActions}>
                                    <button
                                        type="button"
                                        onClick={closeForms}
                                        className={`${styles.btn} ${styles.btnSecondary}`}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "En cours..."
                                            : editingParcours
                                            ? "Modifier"
                                            : "Créer"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Formulaire Niveaux */}
                        {showNiveauForm && (
                            <form
                                onSubmit={
                                    editingNiveau
                                        ? handleUpdateNiveau
                                        : handleCreateNiveau
                                }
                            >
                                <div className={styles.formGroup}>
                                    <label>Nom du Niveau</label>
                                    <input
                                        type="text"
                                        value={niveauForm.nom}
                                        onChange={(e) =>
                                            setNiveauForm({
                                                ...niveauForm,
                                                nom: e.target.value,
                                            })
                                        }
                                        placeholder="Ex: Licence 1, Master 2"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Code</label>
                                    <input
                                        type="text"
                                        value={niveauForm.code}
                                        onChange={(e) =>
                                            setNiveauForm({
                                                ...niveauForm,
                                                code: e.target.value.toUpperCase(),
                                            })
                                        }
                                        placeholder="Ex: L1, M2"
                                        required
                                        maxLength={10}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Description</label>
                                    <textarea
                                        value={niveauForm.description}
                                        onChange={(e) =>
                                            setNiveauForm({
                                                ...niveauForm,
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Description du niveau"
                                        rows={3}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={niveauForm.est_actif}
                                            onChange={(e) =>
                                                setNiveauForm({
                                                    ...niveauForm,
                                                    est_actif: e.target.checked,
                                                })
                                            }
                                        />
                                        Actif
                                    </label>
                                </div>
                                <div className={styles.formActions}>
                                    <button
                                        type="button"
                                        onClick={closeForms}
                                        className={`${styles.btn} ${styles.btnSecondary}`}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "En cours..."
                                            : editingNiveau
                                            ? "Modifier"
                                            : "Créer"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Contenu selon l'onglet actif */}
            {loading ? (
                <div className={styles.loading}>Chargement...</div>
            ) : (
                <>
                    {/* ONGLET MENTIONS */}
                    {activeTab === "mentions" && (
                        <div className={styles.mentionsSection}>
                            <div className={styles.sectionHeader}>
                                <h3>Mentions ({mentions.length})</h3>
                                <button
                                    className={`${styles.btn} ${styles.btnSuccess} ${styles.addBtn}`}
                                    onClick={() => {
                                        setShowMentionForm(true);
                                        setEditingMention(null);
                                    }}
                                >
                                    Nouvelle Mention
                                </button>
                            </div>
                            <div className={styles.mentionsGrid}>
                                {mentions.map((mention) => (
                                    <div
                                        key={mention.id}
                                        className={styles.mentionCard}
                                    >
                                        <div className={styles.cardHeader}>
                                            <h4>{mention.nom}</h4>
                                            <span
                                                className={`${styles.status} ${
                                                    mention.est_actif
                                                        ? styles.active
                                                        : styles.inactive
                                                }`}
                                            >
                                                {mention.est_actif
                                                    ? "Actif"
                                                    : "Inactif"}
                                            </span>
                                        </div>
                                        <div className={styles.cardContent}>
                                            <p>
                                                <strong>Code:</strong>{" "}
                                                {mention.code}
                                            </p>
                                            <p>
                                                <strong>Parcours:</strong>{" "}
                                                {mention.parcours?.length || 0}
                                            </p>
                                        </div>
                                        <div className={styles.cardActions}>
                                            <button
                                                className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                                                onClick={() =>
                                                    openEditMention(mention)
                                                }
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                className={`${
                                                    styles.statusToggle
                                                } ${
                                                    mention.est_actif
                                                        ? styles.active
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    toggleMentionStatus(mention)
                                                }
                                                title={
                                                    mention.est_actif
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
                                            <button
                                                className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                                                onClick={() =>
                                                    handleDeleteMention(
                                                        mention.id
                                                    )
                                                }
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ONGLET PARCOURS */}
                    {activeTab === "parcours" && (
                        <div className={styles.parcoursSection}>
                            <div className={styles.sectionHeader}>
                                <h3>Parcours ({parcours.length})</h3>
                                <button
                                    className={`${styles.btn} ${styles.btnSuccess} ${styles.addBtn}`}
                                    onClick={() => {
                                        setShowParcoursForm(true);
                                        setEditingParcours(null);
                                    }}
                                >
                                    Nouveau Parcours
                                </button>
                            </div>
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Nom</th>
                                            <th>Code</th>
                                            <th>Description</th>
                                            <th>Mention</th>
                                            <th>Niveau</th>
                                            <th>Statut</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parcours.map((parcours) => {
                                            const mention = mentions.find(
                                                (m) =>
                                                    m.id === parcours.mention_id
                                            );
                                            return (
                                                <tr key={parcours.id}>
                                                    <td>{parcours.nom}</td>
                                                    <td>{parcours.code}</td>
                                                    <td>
                                                        {parcours.description ? (
                                                            <span
                                                                title={
                                                                    parcours.description
                                                                }
                                                            >
                                                                {parcours
                                                                    .description
                                                                    .length > 50
                                                                    ? `${parcours.description.substring(
                                                                          0,
                                                                          50
                                                                      )}...`
                                                                    : parcours.description}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    color: "#999",
                                                                    fontStyle:
                                                                        "italic",
                                                                }}
                                                            >
                                                                Aucune
                                                                description
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {mention?.nom ||
                                                            "Aucune"}
                                                    </td>
                                                    <td>
                                                        {parcours.niveaux &&
                                                        parcours.niveaux
                                                            .length > 0
                                                            ? parcours.niveaux
                                                                  .sort(
                                                                      (a, b) =>
                                                                          a.id -
                                                                          b.id
                                                                  )
                                                                  .map(
                                                                      (n) =>
                                                                          n.nom
                                                                  )
                                                                  .join(", ")
                                                            : "Aucun"}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`${
                                                                styles.status
                                                            } ${
                                                                parcours.est_actif
                                                                    ? styles.active
                                                                    : styles.inactive
                                                            }`}
                                                        >
                                                            {parcours.est_actif
                                                                ? "Actif"
                                                                : "Inactif"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div
                                                            className={
                                                                styles.actions
                                                            }
                                                        >
                                                            <button
                                                                className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                                                                onClick={() =>
                                                                    openEditParcours(
                                                                        parcours
                                                                    )
                                                                }
                                                            >
                                                                Modifier
                                                            </button>
                                                            <button
                                                                className={`${
                                                                    styles.statusToggle
                                                                } ${
                                                                    parcours.est_actif
                                                                        ? styles.active
                                                                        : ""
                                                                }`}
                                                                onClick={() =>
                                                                    toggleParcoursStatus(
                                                                        parcours
                                                                    )
                                                                }
                                                                title={
                                                                    parcours.est_actif
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
                                                            <button
                                                                className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                                                                onClick={() =>
                                                                    handleDeleteParcours(
                                                                        parcours.id
                                                                    )
                                                                }
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ONGLET NIVEAUX */}
                    {activeTab === "niveaux" && (
                        <div className={styles.niveauxSection}>
                            <div className={styles.sectionHeader}>
                                <h3>Niveaux ({niveaux.length})</h3>
                                <button
                                    className={`${styles.btn} ${styles.btnSuccess} ${styles.addBtn}`}
                                    onClick={() => {
                                        setShowNiveauForm(true);
                                        setEditingNiveau(null);
                                    }}
                                >
                                    Nouveau Niveau
                                </button>
                            </div>
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nom</th>
                                            <th>Code</th>
                                            <th>Description</th>
                                            <th>Statut</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {niveaux.map((niveau) => (
                                            <tr key={niveau.id}>
                                                <td>{niveau.id}</td>
                                                <td>{niveau.nom}</td>
                                                <td>
                                                    <span
                                                        className={
                                                            styles.codeBadge
                                                        }
                                                    >
                                                        {niveau.code}
                                                    </span>
                                                </td>
                                                <td>{niveau.description}</td>
                                                <td>
                                                    <span
                                                        className={`${
                                                            styles.status
                                                        } ${
                                                            niveau.est_actif
                                                                ? styles.actif
                                                                : styles.inactif
                                                        }`}
                                                    >
                                                        {niveau.est_actif
                                                            ? "Actif"
                                                            : "Inactif"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div
                                                        className={
                                                            styles.actions
                                                        }
                                                    >
                                                        <button
                                                            className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                                                            onClick={() =>
                                                                openEditNiveau(
                                                                    niveau
                                                                )
                                                            }
                                                        >
                                                            Modifier
                                                        </button>
                                                        <button
                                                            className={`${
                                                                styles.statusToggle
                                                            } ${
                                                                niveau.est_actif
                                                                    ? styles.active
                                                                    : ""
                                                            }`}
                                                            onClick={() =>
                                                                toggleNiveauStatus(
                                                                    niveau
                                                                )
                                                            }
                                                            title={
                                                                niveau.est_actif
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
                                                        <button
                                                            className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                                                            onClick={() =>
                                                                handleDeleteNiveau(
                                                                    niveau.id
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
                    )}
                </>
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
        </div>
    );
};

export default GestionStructureAcademique;
