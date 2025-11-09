import React from "react";
import styles from "./DashboardEtudiant.module.css";

interface ProfilEtudiant {
    nom: string;
    matricule: string;
    niveau: string;
    parcours: string;
    mention?: string;
    annee_universitaire?: string;
    email: string;
    telephone: string;
    notes: { matiere: string; note: number }[];
}

interface ProfilSectionProps {
    profilData: ProfilEtudiant;
}

const ProfilSection: React.FC<ProfilSectionProps> = ({ profilData }) => {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Mon Profil</h2>
            </div>
            <div className={styles.profilContent}>
                <div className={styles.profilInfo}>
                    <div className={styles.profilField}>
                        <label>Nom complet:</label>
                        <span>{profilData.nom || "Non renseigné"}</span>
                    </div>
                    <div className={styles.profilField}>
                        <label>Matricule:</label>
                        <span>{profilData.matricule || "Non renseigné"}</span>
                    </div>
                    <div className={styles.profilField}>
                        <label>Email:</label>
                        <span>{profilData.email || "Non renseigné"}</span>
                    </div>
                    <div className={styles.profilField}>
                        <label>Mention:</label>
                        <span>{profilData.mention || "Non renseignée"}</span>
                    </div>
                    <div className={styles.profilField}>
                        <label>Parcours:</label>
                        <span>{profilData.parcours || "Non renseigné"}</span>
                    </div>
                    <div className={styles.profilField}>
                        <label>Niveau:</label>
                        <span>{profilData.niveau || "Non renseigné"}</span>
                    </div>
                    <div className={styles.profilField}>
                        <label>Année universitaire:</label>
                        <span>
                            {profilData.annee_universitaire || "Non renseignée"}
                        </span>
                    </div>
                    <div className={styles.profilField}>
                        <label>Téléphone:</label>
                        <span>{profilData.telephone || "Non renseigné"}</span>
                    </div>
                </div>

                {profilData.notes && profilData.notes.length > 0 && (
                    <div style={{ marginTop: "32px" }}>
                        <h3
                            style={{
                                color: "var(--white)",
                                fontSize: "20px",
                                fontWeight: 700,
                                marginBottom: "16px",
                            }}
                        >
                            Mes Notes par Matière
                        </h3>
                        <div className={styles.profilInfo}>
                            {profilData.notes.map((noteItem, index) => (
                                <div key={index} className={styles.profilField}>
                                    <label>{noteItem.matiere}:</label>
                                    <span
                                        style={{
                                            color:
                                                noteItem.note >= 10
                                                    ? "#22c55e"
                                                    : "#ef4444",
                                            fontWeight: 700,
                                            fontSize: "18px",
                                        }}
                                    >
                                        {noteItem.note}/20
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilSection;
