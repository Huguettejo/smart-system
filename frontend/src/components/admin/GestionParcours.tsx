import React, { useState, useEffect } from "react";
import styles from "./DashboardAdmin.module.css";
import { authenticatedFetch } from "../../services/api";

interface Parcours {
    id: number;
    nom: string;
    code: string;
    description: string;
    niveau_id: number | null;
    niveau?: {
        id: number;
        nom: string;
        code: string;
    };
    est_actif: boolean;
    date_creation: string;
}

interface Niveau {
    id: number;
    nom: string;
    code: string;
}

interface GestionParcoursProps {
    theme: "dark" | "light";
}

const GestionParcours: React.FC<GestionParcoursProps> = ({ theme }) => {
    const [parcours, setParcours] = useState<Parcours[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingParcours, setEditingParcours] = useState<Parcours | null>(
        null
    );
    const [formData, setFormData] = useState({
        nom: "",
        code: "",
        description: "",
        est_actif: true,
    });

    // Charger les parcours et niveaux
    const loadData = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem("access_token");

            // Charger les parcours
            const parcoursResponse = await authenticatedFetch(
                "/api/admin/parcours"
            );

            // Charger les niveaux (tous, actifs ET inactifs)
            const niveauxResponse = await authenticatedFetch(
                "/api/admin/niveaux"
            );

            if (parcoursResponse.ok && niveauxResponse.ok) {
                const parcoursData = await parcoursResponse.json();
                const niveauxData = await niveauxResponse.json();
                setParcours(parcoursData.parcours);
                setNiveaux(niveauxData.niveaux);
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
    const openModal = (parcours?: Parcours) => {
        if (parcours) {
            setEditingParcours(parcours);
            setFormData({
                nom: parcours.nom,
                code: parcours.code,
                description: parcours.description,
                est_actif: parcours.est_actif,
            });
        } else {
            setEditingParcours(null);
            setFormData({
                nom: "",
                code: "",
                description: "",
                est_actif: true,
            });
        }
        setShowModal(true);
    };

    // Fermer le modal
    const closeModal = () => {
        setShowModal(false);
        setEditingParcours(null);
        setFormData({
            nom: "",
            code: "",
            description: "",
            est_actif: true,
        });
    };

    // Sauvegarder un parcours
    const saveParcours = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem("access_token");
            const url = editingParcours
                ? `/api/admin/parcours/${editingParcours.id}`
                : "/api/admin/parcours";

            const method = editingParcours ? "PUT" : "POST";

            const dataToSend = {
                ...formData,
            };

            const response = await authenticatedFetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSend),
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

    // Supprimer un parcours
    const deleteParcours = async (id: number) => {
        if (
            !window.confirm("Êtes-vous sûr de vouloir supprimer ce parcours ?")
        ) {
            return;
        }

        try {
            const response = await authenticatedFetch(
                `/api/admin/parcours/${id}`,
                {
                    method: "DELETE",
                }
            );

            if (response.ok) {
                await loadData();
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de la suppression");
            }
        } catch (error) {
            setError("Erreur de connexion");
        }
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
                    <h2 className={styles.cardTitle}>Gestion des Parcours</h2>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            className={`${styles.btn} ${styles.depublieBtn}`}
                            onClick={() => openModal()}
                        >
                            ➕ Ajouter un Parcours
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
                                <th>Description</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parcours.map((parcoursItem) => (
                                <tr key={parcoursItem.id}>
                                    <td>{parcoursItem.id}</td>
                                    <td>{parcoursItem.nom}</td>
                                    <td>
                                        <span className={styles.codeBadge}>
                                            {parcoursItem.code}
                                        </span>
                                    </td>
                                    <td>{parcoursItem.description}</td>
                                    <td>
                                        <span
                                            className={`${styles.status} ${
                                                parcoursItem.est_actif
                                                    ? styles.actif
                                                    : styles.inactif
                                            }`}
                                        >
                                            {parcoursItem.est_actif
                                                ? "Actif"
                                                : "Inactif"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <button
                                                className={styles.editBtn}
                                                onClick={() =>
                                                    openModal(parcoursItem)
                                                }
                                                title="Modifier"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() =>
                                                    deleteParcours(
                                                        parcoursItem.id
                                                    )
                                                }
                                                title="Supprimer"
                                            >
                                                🗑️
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
                                {editingParcours
                                    ? "Modifier le Parcours"
                                    : "Ajouter un Parcours"}
                            </h3>
                            <button
                                className={styles.modalClose}
                                onClick={closeModal}
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={saveParcours}
                            className={styles.modalForm}
                        >
                            <div className={styles.formGroup}>
                                <label htmlFor="nom">Nom du Parcours *</label>
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
                                    placeholder="Ex: Informatique Générale, Génie Logiciel"
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
                                            code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="Ex: IG, GB, SR"
                                    required
                                    maxLength={10}
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
                                    placeholder="Description du parcours"
                                    rows={3}
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
                                    <span>Parcours actif</span>
                                </label>
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
                                    {editingParcours ? "Modifier" : "Ajouter"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default GestionParcours;
