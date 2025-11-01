import React from "react";
import styles from "./DashboardEnseignant.module.css";

const StatistiquesSection: React.FC = () => {
    return (
        <div className={styles.statistiquesSection}>
            <div className={styles.sectionHeader}>
                <h2>Statistiques</h2>
            </div>
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <h4>Section Statistiques</h4>
                <p>Cette section sera implémentée avec React Router.</p>
            </div>
        </div>
    );
};

export default StatistiquesSection;




