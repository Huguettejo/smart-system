import React from "react";
import styles from "./DashboardEnseignant.module.css";

interface QCM {
    id: string;
    matiere: string | { code: string; nom: string };
    sujet: string;
    niveau: string;
    parcours: string;
    nombreEtudiants: number;
    statut: "actif" | "terminé" | "planifié";
    est_publie: boolean;
    dateExamen?: string;
    duree?: string;
    ciblage_text?: string;
    est_cible?: boolean;
    est_corrige?: boolean;
}

interface QCMSectionProps {
    qcms: QCM[];
    onCreerQCM: () => void;
    onModifierQCM: (qcm: QCM) => void;
    onSupprimerQCM: (qcm: QCM) => void;
    onPublierQCM: (qcm: QCM) => void;
    onDepublierQCM: (qcm: QCM) => void;
    onVoirResultats: (qcm: QCM) => void;
    onCorrigerQCM: (qcm: QCM) => void;
}

const QCMSection: React.FC<QCMSectionProps> = ({
    qcms,
    onCreerQCM,
    onModifierQCM,
    onSupprimerQCM,
    onPublierQCM,
    onDepublierQCM,
    onVoirResultats,
    onCorrigerQCM,
}) => {
    return (
        <>
            {/* Cartes de statistiques */}
            <div className={styles.cardsGrid}>
                <div className={styles.cardSmall}>
                    <div className={styles.cardIcon}>📝</div>
                    <div className={styles.cardValue}>
                        {qcms.filter((qcm) => qcm.est_publie).length}
                    </div>
                    <div className={styles.cardLabel}>QCM Publiés</div>
                </div>
                <div className={styles.cardSmall}>
                    <div className={styles.cardIcon}>⏳</div>
                    <div className={styles.cardValue}>
                        {qcms.filter((qcm) => !qcm.est_publie).length}
                    </div>
                    <div className={styles.cardLabel}>QCM Brouillons</div>
                </div>
                <div className={styles.cardSmall}>
                    <div className={styles.cardIcon}>👥</div>
                    <div className={styles.cardValue}>
                        {qcms.reduce(
                            (acc, qcm) => acc + qcm.nombreEtudiants,
                            0
                        )}
                    </div>
                    <div className={styles.cardLabel}>Étudiants Total</div>
                </div>
                <div className={styles.cardSmall}>
                    <div className={styles.cardIcon}>✅</div>
                    <div className={styles.cardValue}>
                        {qcms.filter((qcm) => qcm.est_corrige).length}
                    </div>
                    <div className={styles.cardLabel}>QCM Corrigés</div>
                </div>
            </div>

            {/* Section QCM */}
            <div className={styles.qcmSection}>
                <div className={styles.sectionHeader}>
                    <h2>Mes QCM</h2>
                    <button className={styles.btnPrimary} onClick={onCreerQCM}>
                        + Créer un QCM
                    </button>
                </div>

                {qcms.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📝</div>
                        <h4>Aucun QCM créé</h4>
                        <p>
                            Commencez par créer votre premier QCM pour vos
                            étudiants.
                        </p>
                        <button
                            className={styles.btnPrimary}
                            onClick={onCreerQCM}
                        >
                            Créer un QCM
                        </button>
                    </div>
                ) : (
                    <div className={styles.qcmGrid}>
                        {qcms.map((qcm) => (
                            <div key={qcm.id} className={styles.qcmCard}>
                                <div className={styles.qcmHeader}>
                                    <h4>{qcm.sujet}</h4>
                                    <span
                                        className={`${styles.statusBadge} ${
                                            qcm.est_publie
                                                ? styles.published
                                                : styles.draft
                                        }`}
                                    >
                                        {qcm.est_publie
                                            ? "Publié"
                                            : "Brouillon"}
                                    </span>
                                </div>
                                <div className={styles.qcmInfo}>
                                    <p>
                                        <strong>Matière:</strong>{" "}
                                        {typeof qcm.matiere === "string"
                                            ? qcm.matiere
                                            : qcm.matiere.nom}
                                    </p>
                                    <p>
                                        <strong>Niveau:</strong> {qcm.niveau}
                                    </p>
                                    <p>
                                        <strong>Parcours:</strong>{" "}
                                        {qcm.parcours}
                                    </p>
                                    <p>
                                        <strong>Étudiants:</strong>{" "}
                                        {qcm.nombreEtudiants}
                                    </p>
                                    {qcm.dateExamen && (
                                        <p>
                                            <strong>Date:</strong>{" "}
                                            {new Date(
                                                qcm.dateExamen
                                            ).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <div className={styles.qcmActions}>
                                    <button
                                        className={styles.btnSecondary}
                                        onClick={() => onModifierQCM(qcm)}
                                    >
                                        Modifier
                                    </button>
                                    {qcm.est_publie ? (
                                        <button
                                            className={styles.btnWarning}
                                            onClick={() => onDepublierQCM(qcm)}
                                        >
                                            Dépublier
                                        </button>
                                    ) : (
                                        <button
                                            className={styles.btnSuccess}
                                            onClick={() => onPublierQCM(qcm)}
                                        >
                                            Publier
                                        </button>
                                    )}
                                    {qcm.est_publie && (
                                        <>
                                            <button
                                                className={styles.btnInfo}
                                                onClick={() =>
                                                    onVoirResultats(qcm)
                                                }
                                            >
                                                Résultats
                                            </button>
                                            {!qcm.est_corrige && (
                                                <button
                                                    className={
                                                        styles.btnPrimary
                                                    }
                                                    onClick={() =>
                                                        onCorrigerQCM(qcm)
                                                    }
                                                >
                                                    Corriger
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <button
                                        className={styles.btnDanger}
                                        onClick={() => onSupprimerQCM(qcm)}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default QCMSection;




