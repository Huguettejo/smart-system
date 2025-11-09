import React, { useState, useEffect } from "react";
import styles from "./DashboardAdmin.module.css";
import { authenticatedFetch } from "../../services/api";
import ConfirmationModal from "../common/ConfirmationModal";

interface Admin {
    id: number;
    username: string;
    email: string;
    departement: string;
    est_actif: boolean;
    created_at: string;
}

interface GestionAdminsProps {
    theme: "dark" | "light";
}

const GestionAdmins: React.FC<GestionAdminsProps> = ({ theme }) => {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

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
        password: "",
        departement: "",
    });

    // Charger les administrateurs
    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await authenticatedFetch("/api/admin/admins");

            if (response.ok) {
                const data = await response.json();
                setAdmins(data.admins || []);
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors du chargement");
            }
        } catch (error) {
            setError("Erreur de connexion au serveur");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Ouvrir le modal d'ajout
    const openAddModal = () => {
        setFormData({
            username: "",
            email: "",
            password: "",
            departement: "",
        });
        setShowAddModal(true);
    };

    // Ouvrir le modal de modification
    const openEditModal = (admin: Admin) => {
        setSelectedAdmin(admin);
        setFormData({
            username: admin.username,
            email: admin.email,
            password: "",
            departement: admin.departement || "",
        });
        setShowEditModal(true);
    };

    // Ajouter un administrateur
    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await authenticatedFetch("/api/admin/admins", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSuccessMessage("✅ Administrateur ajouté avec succès");
                setShowAddModal(false);
                await loadData();
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de l'ajout");
            }
        } catch (error) {
            setError("Erreur de connexion");
        }
    };

    // Modifier un administrateur
    const handleEditAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAdmin) return;

        try {
            const response = await authenticatedFetch(
                `/api/admin/admins/${selectedAdmin.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                }
            );

            if (response.ok) {
                setSuccessMessage("✅ Administrateur modifié avec succès");
                setShowEditModal(false);
                await loadData();
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la modification");
            }
        } catch (error) {
            setError("Erreur de connexion");
        }
    };

    // Supprimer un administrateur
    const handleDeleteAdmin = (admin: Admin) => {
        setConfirmationModal({
            isOpen: true,
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer l'administrateur "${admin.username}" ? Cette action est irréversible.`,
            type: "danger",
            confirmText: "Supprimer",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/admins/${admin.id}`,
                        {
                            method: "DELETE",
                        }
                    );

                    if (response.ok) {
                        setSuccessMessage(
                            "✅ Administrateur supprimé avec succès"
                        );
                        await loadData();
                        setConfirmationModal((prev) => ({
                            ...prev,
                            isOpen: false,
                            isLoading: false,
                        }));
                        setTimeout(() => setSuccessMessage(""), 3000);
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

    // Activer/Désactiver un administrateur
    const toggleAdminStatus = async (id: number, newStatus: boolean) => {
        const admin = admins.find((a) => a.id === id);
        const action = newStatus ? "activer" : "désactiver";
        const nom = admin?.username || "Inconnu";

        setConfirmationModal({
            isOpen: true,
            title: `${newStatus ? "Activer" : "Désactiver"} l'administrateur`,
            message: `Êtes-vous sûr de vouloir ${action} ${nom} ?`,
            type: newStatus ? "success" : "warning",
            confirmText: newStatus ? "Activer" : "Désactiver",
            isLoading: false,
            onConfirm: async () => {
                setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

                try {
                    const response = await authenticatedFetch(
                        `/api/admin/admins/${id}/status`,
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
                                `✅ Administrateur ${
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
                        Gestion des Administrateurs
                    </h2>
                    <button className={styles.addButton} onClick={openAddModal}>
                        <span style={{ marginRight: "8px" }}>➕</span>
                        Ajouter un administrateur
                    </button>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                {successMessage && (
                    <div className={styles.successMessage}>
                        {successMessage}
                    </div>
                )}

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nom d'utilisateur</th>
                                <th>Email</th>
                                <th>Département</th>
                                <th>Statut</th>
                                <th>Date de création</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{ textAlign: "center" }}
                                    >
                                        Aucun administrateur trouvé
                                    </td>
                                </tr>
                            ) : (
                                admins.map((admin) => (
                                    <tr key={admin.id}>
                                        <td>{admin.username}</td>
                                        <td>{admin.email}</td>
                                        <td>{admin.departement || "-"}</td>
                                        <td>
                                            <span
                                                className={
                                                    admin.est_actif
                                                        ? styles.statusActive
                                                        : styles.statusInactive
                                                }
                                            >
                                                {admin.est_actif
                                                    ? "Actif"
                                                    : "Inactif"}
                                            </span>
                                        </td>
                                        <td>
                                            {new Date(
                                                admin.created_at
                                            ).toLocaleDateString("fr-FR")}
                                        </td>
                                        <td>
                                            <div
                                                className={styles.actionButtons}
                                            >
                                                <button
                                                    className={
                                                        styles.editButton
                                                    }
                                                    onClick={() =>
                                                        openEditModal(admin)
                                                    }
                                                    title="Modifier"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className={
                                                        admin.est_actif
                                                            ? styles.deactivateButton
                                                            : styles.activateButton
                                                    }
                                                    onClick={() =>
                                                        toggleAdminStatus(
                                                            admin.id,
                                                            !admin.est_actif
                                                        )
                                                    }
                                                    title={
                                                        admin.est_actif
                                                            ? "Désactiver"
                                                            : "Activer"
                                                    }
                                                >
                                                    {admin.est_actif
                                                        ? "🔴"
                                                        : "🟢"}
                                                </button>
                                                <button
                                                    className={
                                                        styles.deleteButton
                                                    }
                                                    onClick={() =>
                                                        handleDeleteAdmin(admin)
                                                    }
                                                    title="Supprimer"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal d'ajout */}
            {showAddModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Ajouter un administrateur</h3>
                            <button
                                className={styles.closeButton}
                                onClick={() => setShowAddModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleAddAdmin}>
                            <div className={styles.formGroup}>
                                <label htmlFor="add-username">
                                    Nom d'utilisateur *
                                </label>
                                <input
                                    type="text"
                                    id="add-username"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="add-email">Email *</label>
                                <input
                                    type="email"
                                    id="add-email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="add-password">
                                    Mot de passe *
                                </label>
                                <input
                                    type="password"
                                    id="add-password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="add-departement">
                                    Département
                                </label>
                                <input
                                    type="text"
                                    id="add-departement"
                                    value={formData.departement}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            departement: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                >
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de modification */}
            {showEditModal && selectedAdmin && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Modifier l'administrateur</h3>
                            <button
                                className={styles.closeButton}
                                onClick={() => setShowEditModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleEditAdmin}>
                            <div className={styles.formGroup}>
                                <label htmlFor="edit-username">
                                    Nom d'utilisateur *
                                </label>
                                <input
                                    type="text"
                                    id="edit-username"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="edit-email">Email *</label>
                                <input
                                    type="email"
                                    id="edit-email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="edit-password">
                                    Nouveau mot de passe (optionnel)
                                </label>
                                <input
                                    type="password"
                                    id="edit-password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })
                                    }
                                    placeholder="Laissez vide pour ne pas changer"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="edit-departement">
                                    Département
                                </label>
                                <input
                                    type="text"
                                    id="edit-departement"
                                    value={formData.departement}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            departement: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
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

export default GestionAdmins;
