import React, { useEffect, useMemo, useState } from "react";
import styles from "./DashboardEnseignant.module.css";
import { authenticatedFetch } from "../../services/api";

type ProfilEnseignant = {
    nom: string;
    email: string;
    departement?: string;
    est_actif?: boolean;
    assignations?: any[];
};

const ProfilSection: React.FC = () => {
    const [profil, setProfil] = useState<ProfilEnseignant>({
        nom: "",
        email: "",
        departement: "",
        est_actif: true,
        assignations: [],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const matieresListe = useMemo(() => {
        if (!Array.isArray(profil.assignations)) return [] as string[];
        const names = new Set<string>();
        for (const a of profil.assignations) {
            const nom = a?.matiere?.nom || a?.matiere_nom;
            if (nom) names.add(String(nom));
        }
        return Array.from(names);
    }, [profil.assignations]);

    useEffect(() => {
        const loadProfil = async () => {
            try {
                setLoading(true);
                setError("");
                const res = await authenticatedFetch(
                    "/api/admin/enseignant/profil"
                );
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || "Erreur de chargement");
                }
                const data = await res.json();
                setProfil({
                    nom: data.nom || "",
                    email: data.email || "",
                    departement: data.departement || "",
                    est_actif: data.est_actif,
                    assignations: Array.isArray(data.assignations)
                        ? data.assignations
                        : [],
                });
            } catch (e: any) {
                setError(e?.message || "Erreur lors du chargement du profil");
            } finally {
                setLoading(false);
            }
        };
        loadProfil();
    }, []);

    const getInitiales = (nomComplet: string) => {
        if (!nomComplet) return "E";
        const mots = nomComplet.trim().split(/\s+/);
        if (mots.length === 1) return mots[0][0]?.toUpperCase() || "E";
        return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
    };

    return (
        <div className={styles.profilSection}>
            <div className={styles.sectionHeader}>
                <h2>Mon Profil</h2>
            </div>

            {error && <div className={styles.errorMessage}>❌ {error}</div>}
            {loading && (
                <div className={styles.loadingMessage}>Chargement…</div>
            )}

            {!loading && !error && (
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Mon Profil</h2>
                    </div>
                    <div className={styles.profilContent}>
                        <div className={styles.profilInfo}>
                            <div className={styles.profilField}>
                                <label>Nom complet:</label>
                                <span>{profil.nom || "Non renseigné"}</span>
                            </div>
                            <div className={styles.profilField}>
                                <label>Email:</label>
                                <span>{profil.email || "Non renseigné"}</span>
                            </div>
                            <div className={styles.profilField}>
                                <label>Département:</label>
                                <span>
                                    {profil.departement || "Non renseigné"}
                                </span>
                            </div>
                            <div className={styles.profilField}>
                                <label>Matières:</label>
                                <span>
                                    {matieresListe.length
                                        ? matieresListe.join(", ")
                                        : "-"}
                                </span>
                            </div>
                            {/* Champs spécifiques étudiant retirés pour l'enseignant */}
                            <div className={styles.profilField}>
                                <label>Année universitaire:</label>
                                <span>2024-2025</span>
                            </div>
                            <div className={styles.profilField}>
                                <label>Téléphone:</label>
                                <span>Non renseigné</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilSection;
