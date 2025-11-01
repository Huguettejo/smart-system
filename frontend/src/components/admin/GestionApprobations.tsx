import React, { useState, useEffect } from "react";
import styles from "./DashboardAdmin.module.css";
import { authenticatedFetch } from "../../services/api";
import ConfirmationModal from "../common/ConfirmationModal";

interface UtilisateurEnAttente {
    id: number;
    utilisateur_id: number;
    matriculeId?: string;
    departement?: string;
    est_actif: boolean;
    niveau_id?: number;
    parcours_id?: number;
    niveau?: {
        id: number;
        nom: string;
        code: string;
    };
    parcours?: {
        id: number;
        nom: string;
        code: string;
    };
    utilisateur: {
        id: number;
        username: string;
        email: string;
        role: string;
        date_creation: string;
    };
}

interface GestionApprobationsProps {
    theme: "dark" | "light";
    onApprovalChange?: () => void;
}

const GestionApprobations: React.FC<GestionApprobationsProps> = ({
    theme,
    onApprovalChange,
}) => {
    const [utilisateursEnAttente, setUtilisateursEnAttente] = useState<
        UtilisateurEnAttente[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    // Charger les utilisateurs en attente
    const loadUtilisateursEnAttente = async () => {
        try {
            setLoading(true);

            // Charger les étudiants inactifs
            const etudiantsResponse = await authenticatedFetch(
                "/api/admin/etudiants"
            );
            const enseignantsResponse = await authenticatedFetch(
                "/api/admin/enseignants"
            );

            if (etudiantsResponse.ok && enseignantsResponse.ok) {
                const etudiantsData = await etudiantsResponse.json();
                const enseignantsData = await enseignantsResponse.json();

                // Filtrer seulement les utilisateurs inactifs
                const etudiantsInactifs = etudiantsData.etudiants.filter(
                    (etudiant: any) => !etudiant.est_actif
                );
                const enseignantsInactifs = enseignantsData.enseignants.filter(
                    (enseignant: any) => !enseignant.est_actif
                );

                // Debug: afficher les données pour diagnostiquer
                console.log(
                    "Total étudiants chargés:",
                    etudiantsData.etudiants.length
                );
                console.log("Étudiants inactifs:", etudiantsInactifs.length);
                console.log(
                    "Total enseignants chargés:",
                    enseignantsData.enseignants.length
                );
                console.log(
                    "Enseignants inactifs:",
                    enseignantsInactifs.length
                );

                // Combiner et trier par ID (ordre de création)
                const tousInactifs = [
                    ...etudiantsInactifs,
                    ...enseignantsInactifs,
                ].sort((a, b) => a.id - b.id);

                setUtilisateursEnAttente(tousInactifs);
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
        loadUtilisateursEnAttente();
    }, []);

    // Approuver un utilisateur
    const approuverUtilisateur = async (
        id: number,
        type: "etudiant" | "enseignant"
    ) => {
        const typeLabel = type === "etudiant" ? "étudiant" : "enseignant";
        const confirmMessage = `Êtes-vous sûr de vouloir approuver cet ${typeLabel} ?`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await authenticatedFetch(
                `/api/admin/${type}s/${id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ est_actif: true }),
                }
            );

            if (response.ok) {
                await loadUtilisateursEnAttente();
                onApprovalChange?.(); // Notifier le parent du changement
                // Notification de succès
                alert(
                    `✅ ${
                        typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)
                    } approuvé avec succès !`
                );
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors de l'approbation");
            }
        } catch (error) {
            setError("Erreur de connexion");
        }
    };

    // Rejeter un utilisateur
    const rejeterUtilisateur = async (
        id: number,
        type: "etudiant" | "enseignant"
    ) => {
        if (
            !window.confirm(
                "Êtes-vous sûr de vouloir rejeter cette demande ? L'utilisateur sera supprimé définitivement."
            )
        ) {
            return;
        }

        try {
            const response = await authenticatedFetch(
                `/api/admin/${type}s/${id}`,
                {
                    method: "DELETE",
                }
            );

            if (response.ok) {
                await loadUtilisateursEnAttente();
                onApprovalChange?.(); // Notifier le parent du changement
                // Notification de succès
                const typeLabel =
                    type === "etudiant" ? "étudiant" : "enseignant";
                alert(
                    `✅ ${
                        typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)
                    } rejeté avec succès !`
                );
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Erreur lors du rejet");
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
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>⏳ Demandes d'Approbation</h2>
                <p
                    style={{
                        color: theme === "dark" ? "#94a3b8" : "#64748b",
                        margin: "8px 0 0 0",
                    }}
                >
                    {utilisateursEnAttente.length} utilisateur(s) en attente
                    d'approbation
                </p>
            </div>

            {error && (
                <div className={styles.errorMessage}>
                    ❌ {error}
                    <button onClick={() => setError("")}>✕</button>
                </div>
            )}

            {utilisateursEnAttente.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                        ✅
                    </div>
                    <h3 style={{ marginBottom: "8px" }}>
                        Aucune demande en attente
                    </h3>
                    <p
                        style={{
                            color: theme === "dark" ? "#94a3b8" : "#64748b",
                        }}
                    >
                        Tous les utilisateurs ont été approuvés.
                    </p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table
                        className={`${styles.table} ${styles.approbationsTable}`}
                    >
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Nom complet</th>
                                <th>Email</th>
                                <th>Détails</th>
                                <th>Date d'inscription</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {utilisateursEnAttente.map((utilisateur) => {
                                const type = utilisateur.matriculeId
                                    ? "etudiant"
                                    : "enseignant";
                                return (
                                    <tr key={`${type}-${utilisateur.id}`}>
                                        <td>
                                            {type === "etudiant"
                                                ? "Étudiant"
                                                : "Enseignant"}
                                        </td>
                                        <td>
                                            {utilisateur.utilisateur.username}
                                        </td>
                                        <td>{utilisateur.utilisateur.email}</td>
                                        <td>
                                            {type === "etudiant" ? (
                                                <div>
                                                    <div>
                                                        <strong>
                                                            Matricule:
                                                        </strong>{" "}
                                                        {
                                                            utilisateur.matriculeId
                                                        }
                                                    </div>
                                                    {utilisateur.niveau && (
                                                        <div>
                                                            <strong>
                                                                Niveau:
                                                            </strong>{" "}
                                                            {
                                                                utilisateur
                                                                    .niveau.code
                                                            }
                                                        </div>
                                                    )}
                                                    {utilisateur.parcours && (
                                                        <div>
                                                            <strong>
                                                                Parcours:
                                                            </strong>{" "}
                                                            {
                                                                utilisateur
                                                                    .parcours
                                                                    .code
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    {utilisateur.departement && (
                                                        <div>
                                                            <strong>
                                                                Département:
                                                            </strong>{" "}
                                                            {
                                                                utilisateur.departement
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {new Date(
                                                utilisateur.utilisateur.date_creation
                                            ).toLocaleDateString("fr-FR")}
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    className={`${styles.btn} ${styles.primary}`}
                                                    onClick={() =>
                                                        approuverUtilisateur(
                                                            utilisateur.id,
                                                            type
                                                        )
                                                    }
                                                    title="Approuver"
                                                >
                                                    ✅ Approuver
                                                </button>
                                                <button
                                                    className={`${styles.btn} ${styles.deleteBtn}`}
                                                    onClick={() =>
                                                        rejeterUtilisateur(
                                                            utilisateur.id,
                                                            type
                                                        )
                                                    }
                                                    title="Rejeter"
                                                >
                                                    ❌ Rejeter
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
        </div>
    );
};

export default GestionApprobations;
