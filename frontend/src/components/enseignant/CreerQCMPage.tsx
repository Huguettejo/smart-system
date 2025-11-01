import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../../services/api";
import styles from "./DashboardEnseignant.module.css";

interface Matiere {
    id: number;
    nom: string;
    code: string;
}

interface Niveau {
    id: number;
    nom: string;
}

interface Parcours {
    id: number;
    nom: string;
}

const CreerQCMPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [matieres, setMatieres] = useState<Matiere[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);
    const [parcours, setParcours] = useState<Parcours[]>([]);
    const [formData, setFormData] = useState({
        sujet: "",
        contexte: "",
        matiere_id: 1,
        niveau_id: 1,
        parcours_id: 1,
        nombre_questions: 3,
    });

    // Charger les données au montage du composant
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoadingData(true);

            // Charger les matières assignées à l'enseignant
            const matieresResponse = await authenticatedFetch(
                "/api/matieres/enseignant"
            );
            if (matieresResponse.ok) {
                const matieresData = await matieresResponse.json();
                setMatieres(matieresData);
                if (matieresData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        matiere_id: matieresData[0].id,
                    }));
                }
            }

            // Charger les niveaux
            const niveauxResponse = await authenticatedFetch("/api/niveaux");
            if (niveauxResponse.ok) {
                const niveauxData = await niveauxResponse.json();
                setNiveaux(niveauxData);
                if (niveauxData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        niveau_id: niveauxData[0].id,
                    }));
                }
            }

            // Charger les parcours
            const parcoursResponse = await authenticatedFetch("/api/parcours");
            if (parcoursResponse.ok) {
                const parcoursData = await parcoursResponse.json();
                setParcours(parcoursData);
                if (parcoursData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        parcours_id: parcoursData[0].id,
                    }));
                }
            }
        } catch (error) {
            console.error("Erreur chargement données:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authenticatedFetch("/api/qcm/generate-ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const result = await response.json();
                alert(
                    `QCM créé avec succès ! ${
                        result.questions?.length || 0
                    } questions générées.`
                );
                navigate("/enseignant/dashboard");
            } else {
                const error = await response.json();
                alert(`Erreur: ${error.error || "Erreur lors de la création"}`);
            }
        } catch (error) {
            console.error("Erreur:", error);
            alert("Erreur lors de la création du QCM");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                name.includes("_id") || name === "nombre_questions"
                    ? parseInt(value)
                    : value,
        }));
    };

    if (loadingData) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner}></div>
                    <p>Chargement des données...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <button
                    className={styles.btnSecondary}
                    onClick={() => navigate("/enseignant/dashboard")}
                >
                    ← Retour au Dashboard
                </button>
                <div className={styles.headerContent}>
                    <h1>🤖 Créer un QCM avec IA</h1>
                    <p>
                        Générez automatiquement des questions à choix multiple
                        avec l'intelligence artificielle
                    </p>
                </div>
            </div>

            <div className={styles.formWrapper}>
                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    <div className={styles.formGroup}>
                        <label htmlFor="sujet">Sujet du QCM *</label>
                        <input
                            type="text"
                            id="sujet"
                            name="sujet"
                            value={formData.sujet}
                            onChange={handleChange}
                            placeholder="Ex: Python variables, Réseaux TCP/IP, Mathématiques algèbre"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="contexte">Contexte (optionnel)</label>
                        <textarea
                            id="contexte"
                            name="contexte"
                            value={formData.contexte}
                            onChange={handleChange}
                            placeholder="Décrivez le contexte ou les notions à couvrir..."
                            rows={3}
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="matiere_id">
                                📚 Matière assignée
                            </label>
                            <select
                                id="matiere_id"
                                name="matiere_id"
                                value={formData.matiere_id}
                                onChange={handleChange}
                                required
                            >
                                {matieres.length === 0 ? (
                                    <option value="">
                                        Aucune matière assignée
                                    </option>
                                ) : (
                                    matieres.map((matiere) => (
                                        <option
                                            key={matiere.id}
                                            value={matiere.id}
                                        >
                                            {matiere.nom} ({matiere.code})
                                        </option>
                                    ))
                                )}
                            </select>
                            {matieres.length === 0 && (
                                <small className={styles.warning}>
                                    ⚠️ Aucune matière assignée. Contactez
                                    l'administrateur.
                                </small>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="niveau_id">🎯 Niveau</label>
                            <select
                                id="niveau_id"
                                name="niveau_id"
                                value={formData.niveau_id}
                                onChange={handleChange}
                                required
                            >
                                {niveaux.map((niveau) => (
                                    <option key={niveau.id} value={niveau.id}>
                                        {niveau.nom}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="parcours_id">🎓 Parcours</label>
                            <select
                                id="parcours_id"
                                name="parcours_id"
                                value={formData.parcours_id}
                                onChange={handleChange}
                                required
                            >
                                {parcours.map((parcoursItem) => (
                                    <option
                                        key={parcoursItem.id}
                                        value={parcoursItem.id}
                                    >
                                        {parcoursItem.nom}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="nombre_questions">
                                📝 Nombre de questions
                            </label>
                            <select
                                id="nombre_questions"
                                name="nombre_questions"
                                value={formData.nombre_questions}
                                onChange={handleChange}
                            >
                                <option value={2}>2 questions (rapide)</option>
                                <option value={3}>
                                    3 questions (standard)
                                </option>
                                <option value={5}>5 questions (complet)</option>
                                <option value={10}>
                                    10 questions (exhaustif)
                                </option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => navigate("/enseignant/dashboard")}
                            disabled={loading}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={loading || matieres.length === 0}
                        >
                            {loading ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Génération en cours...
                                </>
                            ) : (
                                <>🤖 Générer QCM avec IA</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingContent}>
                        <div className={styles.spinner}></div>
                        <h3>🤖 L'IA génère vos questions...</h3>
                        <p>
                            L'intelligence artificielle Hugging Face travaille
                            pour vous
                        </p>
                        <div className={styles.loadingSteps}>
                            <div className={styles.step}>
                                1. Analyse du sujet...
                            </div>
                            <div className={styles.step}>
                                2. Génération des questions...
                            </div>
                            <div className={styles.step}>
                                3. Traduction en français...
                            </div>
                        </div>
                        <p className={styles.loadingNote}>
                            <small>
                                ⏱️ Cela peut prendre 1-2 minutes pour le premier
                                chargement du modèle
                            </small>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreerQCMPage;
