import React from "react";
import styles from "./DashboardEtudiant.module.css";

interface QCMOption {
    id: number;
    texte: string;
    est_correcte: boolean;
}

interface QCMQuestion {
    id: number;
    texte: string;
    options: QCMOption[];
}

interface QCMEtudiant {
    id: number;
    titre: string;
    difficulte: string;
    type_exercice: string;
    duree_minutes: number | null;
    date_creation: string;
    questions: QCMQuestion[];
}

interface EvaluationsSectionProps {
    qcms: QCMEtudiant[];
    qcmEnCours: QCMEtudiant | null;
    onCommencerQCM: (qcm: QCMEtudiant) => void;
}

const EvaluationsSection: React.FC<EvaluationsSectionProps> = ({
    qcms,
    qcmEnCours,
    onCommencerQCM,
}) => {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Mes Évaluations</h2>
            </div>

            {/* Section QCM - Masquée pendant un QCM en cours */}
            {!qcmEnCours && (
                <div className={styles.qcmSection}>
                    <h3>QCM Disponibles</h3>
                    {qcms.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>🎉</div>
                            <h4>Félicitations !</h4>
                            <p>
                                Vous avez terminé tous les QCM disponibles !
                                Consultez vos résultats dans l'onglet "Mes
                                Résultats".
                            </p>
                        </div>
                    ) : (
                        <div className={styles.qcmGrid}>
                            {qcms.map((qcm) => (
                                <div key={qcm.id} className={styles.qcmCard}>
                                    <div className={styles.qcmHeader}>
                                        <h4>{qcm.titre}</h4>
                                        <span className={styles.difficulte}>
                                            {qcm.difficulte}
                                        </span>
                                    </div>
                                    <div className={styles.qcmInfo}>
                                        <p>
                                            <strong>Type:</strong>{" "}
                                            {qcm.type_exercice}
                                        </p>
                                        <p>
                                            <strong>Questions:</strong>{" "}
                                            {qcm.questions.length}
                                        </p>
                                        <p>
                                            <strong>Date:</strong>{" "}
                                            {new Date(
                                                qcm.date_creation
                                            ).toLocaleDateString()}
                                        </p>
                                        {qcm.duree_minutes &&
                                            qcm.duree_minutes > 0 && (
                                                <p>
                                                    <strong>Durée:</strong>{" "}
                                                    <span
                                                        className={
                                                            styles.dureeInfo
                                                        }
                                                    >
                                                        ⏱️ {qcm.duree_minutes}{" "}
                                                        minutes
                                                    </span>
                                                </p>
                                            )}
                                    </div>
                                    <div className={styles.qcmActions}>
                                        <button
                                            className={styles.startBtn}
                                            onClick={() => onCommencerQCM(qcm)}
                                        >
                                            Commencer le QCM
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EvaluationsSection;




