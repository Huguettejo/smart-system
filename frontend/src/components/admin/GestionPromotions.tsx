import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../services/api";
import styles from "./GestionPromotions.module.css";

interface EtudiantPreview {
    id: number;
    nom: string;
    matricule: string;
    parcours: string;
    mention?: string;
}

interface PreviewPromotion {
    niveau_actuel: string;
    niveau_nouveau: string;
    nombre_etudiants: number;
    etudiants: EtudiantPreview[];
}

interface Statistiques {
    total_etudiants: number;
    niveaux_concernes: string[];
}

interface PreviewData {
    preview: PreviewPromotion[];
    statistiques: Statistiques;
}

interface GestionPromotionsProps {
    theme?: "dark" | "light";
}

const GestionPromotions: React.FC<GestionPromotionsProps> = ({
    theme = "dark",
}) => {
    const [anneeDepart, setAnneeDepart] = useState("2024-2025");
    const [anneeArrivee, setAnneeArrivee] = useState("2025-2026");
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [redoublants, setRedoublants] = useState<number[]>([]);
    const [etudiantsAttente, setEtudiantsAttente] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Générer les années disponibles
    const getAvailableYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 2; i <= currentYear + 2; i++) {
            years.push(`${i}-${i + 1}`);
        }
        return years;
    };

    const handlePreview = async () => {
        if (!anneeDepart) {
            setError("Veuillez sélectionner une année de départ");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await authenticatedFetch(
                "/api/admin/preview-promotion",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        annee_depart: anneeDepart,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Erreur lors de la prévisualisation"
                );
            }

            const data = await response.json();
            setPreviewData(data);
            setSuccess("Prévisualisation générée avec succès");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la prévisualisation"
            );
        } finally {
            setLoading(false);
        }
    };

    const handlePromotion = async () => {
        if (!anneeDepart || !anneeArrivee) {
            setError("Veuillez sélectionner les années de départ et d'arrivée");
            return;
        }

        if (!previewData) {
            setError("Veuillez d'abord générer une prévisualisation");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await authenticatedFetch(
                "/api/admin/promouvoir-etudiants",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        annee_depart: anneeDepart,
                        annee_arrivee: anneeArrivee,
                        redoublants: redoublants,
                        etudiants_attente: etudiantsAttente,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Erreur lors de la promotion"
                );
            }

            const data = await response.json();
            setSuccess(
                `Promotion effectuée avec succès ! ${data.statistiques.promus} étudiants promus, ${data.statistiques.redoublants} redoublants, ${data.statistiques.en_attente} en attente`
            );

            // Réinitialiser les sélections
            setRedoublants([]);
            setEtudiantsAttente([]);
            setPreviewData(null);

            // Déclencher le rechargement des données étudiants
            const event = new CustomEvent("reloadEtudiants");
            window.dispatchEvent(event);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la promotion"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAnnulerPromotion = async () => {
        if (!anneeDepart || !anneeArrivee) {
            setError("Veuillez sélectionner les années de départ et d'arrivée");
            return;
        }

        if (
            !window.confirm(
                `Êtes-vous sûr de vouloir annuler la promotion de ${anneeDepart} vers ${anneeArrivee} ?`
            )
        ) {
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await authenticatedFetch(
                "/api/admin/annuler-promotion",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        annee_depart: anneeArrivee, // Inverser les années
                        annee_arrivee: anneeDepart,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Erreur lors de l'annulation"
                );
            }

            const data = await response.json();
            setSuccess(
                `Annulation effectuée avec succès ! ${data.statistiques.promus} étudiants remis à leur niveau précédent`
            );

            // Réinitialiser les sélections
            setRedoublants([]);
            setEtudiantsAttente([]);
            setPreviewData(null);

            // Déclencher le rechargement des données étudiants
            const event = new CustomEvent("reloadEtudiants");
            window.dispatchEvent(event);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l'annulation"
            );
        } finally {
            setLoading(false);
        }
    };

    const toggleRedoublant = (etudiantId: number) => {
        setRedoublants((prev) =>
            prev.includes(etudiantId)
                ? prev.filter((id) => id !== etudiantId)
                : [...prev, etudiantId]
        );
    };

    const toggleEtudiantAttente = (etudiantId: number) => {
        setEtudiantsAttente((prev) =>
            prev.includes(etudiantId)
                ? prev.filter((id) => id !== etudiantId)
                : [...prev, etudiantId]
        );
    };

    const isEtudiantRedoublant = (etudiantId: number) =>
        redoublants.includes(etudiantId);
    const isEtudiantEnAttente = (etudiantId: number) =>
        etudiantsAttente.includes(etudiantId);

    return (
        <div
            className={`${styles.container} ${
                theme === "dark" ? styles.dark : styles.light
            }`}
        >
            <h2>🎓 Gestion des Promotions d'Étudiants</h2>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && <div className={styles.successMessage}>{success}</div>}

            <div className={styles.formSection}>
                <div className={styles.formGroup}>
                    <label>Année de départ :</label>
                    <select
                        value={anneeDepart}
                        onChange={(e) => setAnneeDepart(e.target.value)}
                        className={styles.select}
                    >
                        {getAvailableYears().map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label>Année d'arrivée :</label>
                    <select
                        value={anneeArrivee}
                        onChange={(e) => setAnneeArrivee(e.target.value)}
                        className={styles.select}
                    >
                        {getAvailableYears().map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handlePreview}
                    disabled={loading}
                    className={styles.previewBtn}
                >
                    {loading
                        ? "🔄 Génération..."
                        : "Prévisualiser les Promotions"}
                </button>
            </div>

            {previewData && (
                <div className={styles.previewSection}>
                    <h3>📋 Prévisualisation des Promotions</h3>

                    <div className={styles.promotionsList}>
                        {previewData.preview.map((promotion, index) => (
                            <div key={index} className={styles.promotionCard}>
                                <div className={styles.promotionHeader}>
                                    <h4>
                                        {promotion.niveau_actuel} →{" "}
                                        {promotion.niveau_nouveau}
                                    </h4>
                                    <span className={styles.etudiantCount}>
                                        {promotion.nombre_etudiants} étudiant(s)
                                    </span>
                                </div>

                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Matricule</th>
                                                <th>Nom</th>
                                                <th>Mention</th>
                                                <th>Niveau</th>
                                                <th>Parcours</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {promotion.etudiants.map(
                                                (etudiant) => (
                                                    <tr key={etudiant.id}>
                                                        <td
                                                            title={
                                                                etudiant.matricule
                                                            }
                                                        >
                                                            {etudiant.matricule}
                                                        </td>
                                                        <td
                                                            title={etudiant.nom}
                                                        >
                                                            {etudiant.nom}
                                                        </td>
                                                        <td
                                                            title={
                                                                etudiant.mention ||
                                                                "N/A"
                                                            }
                                                        >
                                                            {etudiant.mention ||
                                                                "N/A"}
                                                        </td>
                                                        <td
                                                            title={
                                                                promotion.niveau_actuel
                                                            }
                                                        >
                                                            {
                                                                promotion.niveau_actuel
                                                            }
                                                        </td>
                                                        <td
                                                            title={
                                                                etudiant.parcours
                                                            }
                                                        >
                                                            {etudiant.parcours}
                                                        </td>
                                                        <td>
                                                            <div
                                                                className={
                                                                    styles.actionsContainer
                                                                }
                                                            >
                                                                <label
                                                                    className={
                                                                        styles.checkboxLabel
                                                                    }
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isEtudiantRedoublant(
                                                                            etudiant.id
                                                                        )}
                                                                        onChange={() =>
                                                                            toggleRedoublant(
                                                                                etudiant.id
                                                                            )
                                                                        }
                                                                    />
                                                                    <span
                                                                        className={
                                                                            styles.checkboxText
                                                                        }
                                                                    >
                                                                        Redoublant
                                                                    </span>
                                                                </label>
                                                                <label
                                                                    className={
                                                                        styles.checkboxLabel
                                                                    }
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isEtudiantEnAttente(
                                                                            etudiant.id
                                                                        )}
                                                                        onChange={() =>
                                                                            toggleEtudiantAttente(
                                                                                etudiant.id
                                                                            )
                                                                        }
                                                                    />
                                                                    <span
                                                                        className={
                                                                            styles.checkboxText
                                                                        }
                                                                    >
                                                                        En
                                                                        attente
                                                                    </span>
                                                                </label>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.promotionActions}>
                        <button
                            onClick={() => handlePromotion()}
                            disabled={loading}
                            className={styles.promoteBtn}
                        >
                            {loading
                                ? "🔄 Promotion en cours..."
                                : "🚀 Promouvoir les Étudiants"}
                        </button>
                        <button
                            onClick={() => handleAnnulerPromotion()}
                            disabled={loading}
                            className={styles.cancelBtn}
                        >
                            {loading
                                ? "🔄 Annulation en cours..."
                                : "↩️ Annuler la Promotion"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionPromotions;




