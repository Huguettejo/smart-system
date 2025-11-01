import React, { useState, useEffect } from "react";
import styles from "./DashboardAdmin.module.css";
import { authenticatedFetch } from "../../services/api";
import ConfirmationModal from "../common/ConfirmationModal";

interface Matiere {
    id: number;
    nom: string;
    code: string;
    description: string;
    credits: number;
    est_actif: boolean;
    date_creation: string;
    assignations_count: number;
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

interface GestionMatieresProps {
    theme: "dark" | "light";
}

const GestionMatieres: React.FC<GestionMatieresProps> = ({ theme }) => {
    const [matieres, setMatieres] = useState<Matiere[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
    const [formData, setFormData] = useState({
        nom: "",
        code: "",
        description: "",
        credits: 3,
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

    // Charger les données
    const loadData = async () => {
        try {
            setLoading(true);

            // Charger les matières
            const matieresResponse = await authenticatedFetch(
                "/api/admin/matieres"
            );

            if (matieresResponse.ok) {
                const matieresData = await matieresResponse.json();
                setMatieres(matieresData.matieres);
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
    const openModal = (matiere?: Matiere) => {
        if (matiere) {
            setEditingMatiere(matiere);
            setFormData({
                nom: matiere.nom,
                code: matiere.code,
                description: matiere.description || "",
                credits: matiere.credits,
                est_actif: matiere.est_actif,
            });
        } else {
            setEditingMatiere(null);
            setFormData({
                nom: "",
                code: "",
                description: "",
                credits: 3,
                est_actif: true,
            });
        }
        setShowModal(true);
    };

    // Fermer le modal
    const closeModal = () => {
        setShowModal(false);
        setEditingMatiere(null);
        setFormData({
            nom: "",
            code: "",
            description: "",
            credits: 3,
            est_actif: true,
        });
    };

    // Sauvegarder une matière
    const saveMatiere = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingMatiere
                ? `/api/admin/matieres/${editingMatiere.id}`
                : "/api/admin/matieres";

            const method = editingMatiere ? "PUT" : "POST";

            const response = await authenticatedFetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await loadData();
                closeModal();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la sauvegarde");
            }
        } catch (error) {
            setError("Erreur de connexion");
        }
    };

    // Supprimer une matière
    const deleteMatiere = async (id: number) => {
        const matiere = matieres.find((m) => m.id === id);

        setConfirmationModal({
            isOpen: true,
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer la matière "${
                matiere?.nom || "Inconnue"
            }" ? Cette action est irréversible.`,
            type: "danger",
            confirmText: "Supprimer",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/matieres/${id}`,
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
                        setError("");
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

    // Toggle statut matière
    const toggleMatiereStatus = async (id: number, newStatus: boolean) => {
        const matiere = matieres.find((m) => m.id === id);
        const action = newStatus ? "activer" : "désactiver";

        setConfirmationModal({
            isOpen: true,
            title: `${newStatus ? "Activer" : "Désactiver"} la matière`,
            message: `Êtes-vous sûr de vouloir ${action} la matière "${
                matiere?.nom || "Inconnue"
            }" ?`,
            type: newStatus ? "success" : "warning",
            confirmText: newStatus ? "Activer" : "Désactiver",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/matieres/${id}/status`,
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
                        setError("");
                        // Notification de succès - setTimeout pour laisser le modal se fermer
                        setTimeout(() => {
                            alert(
                                `✅ Matière ${
                                    newStatus ? "activée" : "désactivée"
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
                    <h2 className={styles.cardTitle}>Gestion des Matières</h2>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            className={`${styles.btn} ${styles.depublieBtn}`}
                            onClick={() => openModal()}
                        >
                            ➕ Ajouter une Matière
                        </button>
                    </div>
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        ❌ {error}
                        <button onClick={() => setError("")}>✕</button>
                    </div>
                )}

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nom</th>
                                <th>Code</th>
                                <th>Crédits</th>
                                <th>Assignations</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matieres.map((matiere) => (
                                <tr key={matiere.id}>
                                    <td>{matiere.id}</td>
                                    <td>
                                        <div>
                                            <strong>{matiere.nom}</strong>
                                            {matiere.description && (
                                                <div
                                                    className={
                                                        styles.description
                                                    }
                                                >
                                                    {matiere.description}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.codeBadge}>
                                            {matiere.code}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.creditsBadge}>
                                            {matiere.credits} crédits
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={styles.enseignantsCount}
                                        >
                                            {matiere.assignations_count}{" "}
                                            assignation(s)
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.statusContainer}>
                                            <span
                                                className={`${
                                                    styles.statusDot
                                                } ${
                                                    matiere.est_actif
                                                        ? styles.actif
                                                        : styles.inactif
                                                }`}
                                            ></span>
                                            <span
                                                className={`${styles.status} ${
                                                    matiere.est_actif
                                                        ? styles.actif
                                                        : styles.inactif
                                                }`}
                                            >
                                                {matiere.est_actif
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
                                                        matiere.est_actif
                                                            ? styles.active
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        toggleMatiereStatus(
                                                            matiere.id,
                                                            !matiere.est_actif
                                                        )
                                                    }
                                                    title={
                                                        matiere.est_actif
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
                                                    openModal(matiere)
                                                }
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                                                onClick={() =>
                                                    deleteMatiere(matiere.id)
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
                                {editingMatiere
                                    ? "Modifier la Matière"
                                    : "Ajouter une Matière"}
                            </h3>
                            <button
                                className={styles.modalClose}
                                onClick={closeModal}
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={saveMatiere}
                            className={styles.modalForm}
                        >
                            <div className={styles.formGroup}>
                                <label htmlFor="nom">Nom de la matière *</label>
                                <input
                                    type="text"
                                    id="nom"
                                    value={formData.nom}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            nom: e.target.value,
                                        })
                                    }
                                    placeholder="Ex: Mathématiques, Informatique"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="code">Code *</label>
                                <input
                                    type="text"
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value,
                                        })
                                    }
                                    placeholder="Ex: MATH, INFO"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Description de la matière"
                                    rows={3}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="credits">Crédits</label>
                                <input
                                    type="number"
                                    id="credits"
                                    min="1"
                                    max="10"
                                    value={formData.credits}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            credits:
                                                parseInt(e.target.value) || 3,
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.est_actif}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                est_actif: e.target.checked,
                                            })
                                        }
                                    />
                                    Matière active
                                </label>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.btnSecondary}
                                    onClick={closeModal}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnPrimary}
                                >
                                    {editingMatiere ? "Modifier" : "Ajouter"}
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

export default GestionMatieres;
