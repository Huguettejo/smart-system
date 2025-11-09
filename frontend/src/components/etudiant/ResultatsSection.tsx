import React from "react";
import styles from "./DashboardEtudiant.module.css";

interface ResultatEtudiant {
    id: number;
    note: number;
    pourcentage: number;
    feedback: string;
    date_correction: string;
    nombre_correctes: number;
    nombre_incorrectes: number;
    temps_total: number;
    qcm_id: number;
    qcm_titre: string;
    evaluation_id: number | null;
}

interface ResultatsSectionProps {
    resultats: ResultatEtudiant[];
}

const ResultatsSection: React.FC<ResultatsSectionProps> = ({ resultats }) => {
    return (
        <div className={styles.resultatsSection}>
            <div className={styles.sectionHeader}>
                <h2>Mes Résultats</h2>
            </div>

            {resultats.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    <h4>Aucun résultat disponible</h4>
                    <p>
                        Vous n'avez pas encore passé de QCM. Allez dans l'onglet
                        "Mes Évaluations" pour commencer.
                    </p>
                </div>
            ) : (
                <div className={styles.resultatsList}>
                    {resultats.map((resultat) => (
                        <div key={resultat.id} className={styles.resultatCard}>
                            <div className={styles.resultatInfo}>
                                <h4 className={styles.resultatTitle}>
                                    {resultat.qcm_titre}
                                </h4>
                                <p className={styles.resultatDate}>
                                    {new Date(
                                        resultat.date_correction
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                            <div className={styles.resultatStats}>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>
                                        {resultat.note}/20
                                    </span>
                                    <span className={styles.statLabel}>
                                        Note
                                    </span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>
                                        {resultat.pourcentage}%
                                    </span>
                                    <span className={styles.statLabel}>
                                        Score
                                    </span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>
                                        {resultat.nombre_correctes}/
                                        {resultat.nombre_correctes +
                                            resultat.nombre_incorrectes}
                                    </span>
                                    <span className={styles.statLabel}>
                                        Correctes
                                    </span>
                                </div>
                            </div>
                            <div className={styles.feedbackPreview}>
                                <p>{resultat.feedback}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResultatsSection;




