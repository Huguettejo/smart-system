import React from "react";
import styles from "./ConfirmationModal.module.css";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type: "danger" | "warning" | "success" | "info";
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    theme?: "dark" | "light";
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    isLoading = false,
    theme = "dark",
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case "danger":
                return "🗑️";
            case "warning":
                return "⚠️";
            case "success":
                return "✅";
            case "info":
                return "ℹ️";
            default:
                return "❓";
        }
    };

    const getIconEmoji = () => {
        switch (type) {
            case "danger":
                return "💥";
            case "warning":
                return "⚡";
            case "success":
                return "🎉";
            case "info":
                return "💡";
            default:
                return "❓";
        }
    };

    const getConfirmButtonClass = () => {
        switch (type) {
            case "danger":
                return styles.confirmButtonDanger;
            case "warning":
                return styles.confirmButtonWarning;
            case "success":
                return styles.confirmButtonSuccess;
            case "info":
                return styles.confirmButtonInfo;
            default:
                return styles.confirmButtonDefault;
        }
    };

    return (
        <div
            className={`${styles.modalOverlay} ${
                theme === "dark" ? styles.dark : ""
            }`}
            onClick={onClose}
        >
            <div
                className={`${styles.modalContent} ${
                    theme === "dark" ? styles.dark : ""
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`${styles.modalHeader} ${
                        theme === "dark" ? styles.dark : ""
                    }`}
                >
                    <div
                        className={`${styles.iconContainer} ${
                            theme === "dark" ? styles.dark : ""
                        }`}
                    >
                        <span className={styles.icon}>{getIcon()}</span>
                        <div className={styles.iconGlow}></div>
                    </div>
                    <div>
                        <h3
                            className={`${styles.title} ${
                                theme === "dark" ? styles.dark : ""
                            }`}
                        >
                            {title}
                        </h3>
                        <div
                            className={`${styles.subtitle} ${
                                theme === "dark" ? styles.dark : ""
                            }`}
                        >
                            {getIconEmoji()} Action importante
                        </div>
                    </div>
                </div>

                <div
                    className={`${styles.modalBody} ${
                        theme === "dark" ? styles.dark : ""
                    }`}
                >
                    <p
                        className={`${styles.message} ${
                            theme === "dark" ? styles.dark : ""
                        }`}
                    >
                        {message}
                    </p>
                </div>

                <div
                    className={`${styles.modalFooter} ${
                        theme === "dark" ? styles.dark : ""
                    }`}
                >
                    <button
                        className={`${styles.cancelButton} ${
                            theme === "dark" ? styles.dark : ""
                        }`}
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`${
                            styles.confirmButton
                        } ${getConfirmButtonClass()}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className={styles.spinner}></span>
                                Chargement...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
