import React, { useEffect, useMemo, useState } from "react";
import styles from "./DashboardEnseignant.module.css";
import { authenticatedFetch } from "../../services/api";

type EtudiantAPI = {
    id: number;
    utilisateur_id: number;
    matriculeId: string;
    est_actif: boolean;
    annee_universitaire: string;
    utilisateur?: { id: number; username: string; email: string } | null;
    niveau?: { id: number; code?: string; libelle?: string } | null;
    parcours?: { id: number; code?: string; libelle?: string } | null;
    mention?: { id: number; code?: string; libelle?: string } | null;
    matiere_enseignee?: { id: number; code: string; nom: string };
    notes?: {
        note: number;
        matiere: string;
        qcm_titre?: string;
        date_correction?: string;
        pourcentage?: number;
    }[];
};

const EtudiantsSection: React.FC = () => {
    const [etudiants, setEtudiants] = useState<EtudiantAPI[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [filters, setFilters] = useState({
        niveau: "",
        parcours: "",
        matiere: "",
    });
    const [niveaux, setNiveaux] = useState<
        { id: number; code?: string; nom?: string }[]
    >([]);
    const [parcoursList, setParcoursList] = useState<
        { id: number; code?: string; nom?: string }[]
    >([]);
    const [matieres, setMatieres] = useState<
        { id: number; code?: string; nom: string }[]
    >([]);

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (filters.niveau) params.set("niveau", filters.niveau);
        if (filters.parcours) params.set("parcours", filters.parcours);
        if (filters.matiere) params.set("matiere", filters.matiere);
        return params.toString() ? `?${params.toString()}` : "";
    }, [filters]);

    const loadEtudiants = async () => {
        try {
            setLoading(true);
            setError("");
            // NOTE: le blueprint enseignant est monté sous /api/admin
            const res = await authenticatedFetch(
                `/api/admin/enseignant/etudiants${queryString}`
            );
            if (!res.ok) {
                throw new Error("Erreur réseau");
            }
            const data = await res.json();
            setEtudiants(Array.isArray(data.etudiants) ? data.etudiants : []);
        } catch (e: any) {
            setError(e?.message || "Erreur lors du chargement des étudiants");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEtudiants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    // Charger options de filtres (niveaux, parcours, matières de l'enseignant)
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const [resNiv, resPar, resMat] = await Promise.all([
                    authenticatedFetch("/api/admin/niveaux"),
                    authenticatedFetch("/api/admin/parcours"),
                    authenticatedFetch("/api/qcm/enseignant/matieres"),
                ]);
                if (resNiv.ok) {
                    const data = await resNiv.json();
                    setNiveaux(Array.isArray(data.niveaux) ? data.niveaux : []);
                }
                if (resPar.ok) {
                    const data = await resPar.json();
                    setParcoursList(
                        Array.isArray(data.parcours) ? data.parcours : []
                    );
                }
                if (resMat.ok) {
                    const data = await resMat.json();
                    const list = Array.isArray(data.matieres)
                        ? data.matieres
                        : Array.isArray(data)
                        ? data
                        : [];
                    setMatieres(list);
                }
            } catch (e) {
                // silencieux, les filtres resteront vides
            }
        };
        loadFilters();
    }, []);

    return (
        <div className={styles.etudiantsSection}>
            <div className={styles.sectionHeader}>
                <h2>Liste des Étudiants</h2>
            </div>

            <div className={styles.filters}>
                <select
                    className={styles.filterSelect}
                    value={filters.niveau}
                    onChange={(e) =>
                        setFilters({ ...filters, niveau: e.target.value })
                    }
                >
                    <option value="">Tous les niveaux</option>
                    {niveaux.map((n) => (
                        <option key={n.id} value={n.code || ""}>
                            {n.code || n.nom || n.id}
                        </option>
                    ))}
                </select>

                <select
                    className={styles.filterSelect}
                    value={filters.parcours}
                    onChange={(e) =>
                        setFilters({ ...filters, parcours: e.target.value })
                    }
                >
                    <option value="">Tous les parcours</option>
                    {parcoursList.map((p) => (
                        <option key={p.id} value={p.code || ""}>
                            {p.code || p.nom || p.id}
                        </option>
                    ))}
                </select>

                <select
                    className={styles.filterSelect}
                    value={filters.matiere}
                    onChange={(e) =>
                        setFilters({ ...filters, matiere: e.target.value })
                    }
                >
                    <option value="">Toutes les matières</option>
                    {matieres.map((m) => (
                        <option key={m.id} value={m.nom}>
                            {m.nom}
                        </option>
                    ))}
                </select>

                <button className={styles.btnPrimary} onClick={loadEtudiants}>
                    Rafraîchir
                </button>
            </div>

            {loading && (
                <div className={styles.loadingMessage}>Chargement…</div>
            )}
            {error && <div className={styles.errorMessage}>❌ {error}</div>}

            {!loading && !error && etudiants.length === 0 && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>👥</div>
                    <h4>Aucun étudiant correspondant</h4>
                    <p>Vérifiez vos assignations et filtres.</p>
                </div>
            )}

            {!loading && !error && etudiants.length > 0 && (
                <div className={styles.tableContainer}>
                    <table className={styles.etudiantsTable}>
                        <thead>
                            <tr>
                                <th>Matricule</th>
                                <th>Nom</th>
                                <th>Email</th>
                                <th>Niveau</th>
                                <th>Parcours</th>
                                <th>Matière</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {etudiants.map((e) => (
                                <tr key={e.id}>
                                    <td>{e.matriculeId}</td>
                                    <td>{e.utilisateur?.username || e.id}</td>
                                    <td>{e.utilisateur?.email || "-"}</td>
                                    <td>{e.niveau?.code || "-"}</td>
                                    <td>{e.parcours?.code || "-"}</td>
                                    <td>{e.matiere_enseignee?.nom || "-"}</td>
                                    <td>
                                        {Array.isArray(e.notes) &&
                                        e.notes.length > 0 ? (
                                            (() => {
                                                const values = e.notes
                                                    .map((n) => Number(n.note))
                                                    .filter(
                                                        (v) => !Number.isNaN(v)
                                                    );
                                                if (values.length === 0) {
                                                    return (
                                                        <span
                                                            className={
                                                                styles.notePending
                                                            }
                                                        >
                                                            -
                                                        </span>
                                                    );
                                                }
                                                const avg =
                                                    values.reduce(
                                                        (a, b) => a + b,
                                                        0
                                                    ) / values.length;
                                                return (
                                                    <span
                                                        className={
                                                            styles.noteDisplay
                                                        }
                                                    >
                                                        {avg.toFixed(2)}
                                                    </span>
                                                );
                                            })()
                                        ) : (
                                            <span
                                                className={styles.notePending}
                                            >
                                                -
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EtudiantsSection;
