import React, { useState, useEffect } from "react";
import styles from "./AuthPage.module.css";
import studentImage from "../../assets/images/etudiant.jpg";
import { useAuth } from "../../contexts/AuthContext";

interface User {
    nomComplet: string;
    email: string;
    motDePasse: string;
    confirmerMotDePasse?: string;
    matricule?: string;
    niveau?: string;
    parcours_id?: number;
    mention_id?: number;
    niveau_id?: number;
}

interface Mention {
    id: number;
    nom: string;
    code: string;
    est_actif: boolean;
    parcours: Parcours[];
}

interface Niveau {
    id: number;
    nom: string;
    code: string;
    est_actif: boolean;
}

interface Parcours {
    id: number;
    nom: string;
    code: string;
    mention_id: number;
    est_actif: boolean;
    niveaux: Niveau[];
}

interface AuthPageProps {
    onLogin: (type: "enseignant" | "etudiant" | "admin") => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    const { login: authLogin } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [userType, setUserType] = useState<"enseignant" | "etudiant">(
        "enseignant"
    );
    const [formData, setFormData] = useState<User>({
        nomComplet: "",
        email: "",
        motDePasse: "",
        confirmerMotDePasse: "",
        matricule: "",
        niveau: "",
        parcours_id: undefined,
        mention_id: undefined,
        niveau_id: undefined,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [parcours, setParcours] = useState<Parcours[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);

    // URL de base de votre API Flask
    const API_BASE_URL = "http://localhost:5000"; // Ajustez selon votre configuration

    // Charger les mentions et parcours au chargement du composant
    useEffect(() => {
        const loadMentionsAndParcours = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/mentions`);
                if (response.ok) {
                    const data = await response.json();
                    setMentions(data.mentions);
                    setParcours(data.parcours);
                    setNiveaux(data.niveaux);
                }
            } catch (error) {
                console.error("Erreur lors du chargement des mentions:", error);
            }
        };

        loadMentionsAndParcours();
    }, []);

    // Fonction pour obtenir les niveaux disponibles pour un parcours
    const getAvailableNiveaux = (parcoursId: string) => {
        if (!parcoursId) return [];
        const selectedParcours = parcours.find(
            (p) => p.id.toString() === parcoursId
        );
        return selectedParcours && selectedParcours.niveaux
            ? selectedParcours.niveaux
            : [];
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => {
            const newData = {
                ...prev,
                [name]:
                    name === "mention_id" ||
                    name === "niveau_id" ||
                    name === "parcours_id"
                        ? value
                            ? parseInt(value)
                            : undefined
                        : value,
            };

            // Si la mention change, réinitialiser le parcours et le niveau
            if (name === "mention_id") {
                newData.parcours_id = undefined;
                newData.niveau_id = undefined;
            }

            // Si le parcours change, réinitialiser le niveau
            if (name === "parcours_id") {
                newData.niveau_id = undefined;
            }

            return newData;
        });

        // Effacer l'erreur quand l'utilisateur commence à taper (avec un petit délai)
        if (error) {
            setTimeout(() => setError(""), 100);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Ne pas effacer l'erreur ici, on le fera après validation

        try {
            if (isLogin) {
                // Connexion
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        motDePasse: formData.motDePasse,
                    }),
                });

                const result = await response.json();

                if (response.ok) {
                    // Effacer les erreurs si la connexion réussit
                    setError("");

                    // Utiliser le AuthContext pour gérer la connexion
                    authLogin(result.access_token, result.user);

                    // Notifier le composant parent (pour compatibilité)
                    onLogin(result.user.role);
                } else {
                    setError(result.error || "Erreur de connexion");
                    // Faire défiler vers le message d'erreur
                    setTimeout(() => {
                        const errorElement =
                            document.getElementById("error-message");
                        if (errorElement) {
                            errorElement.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                        } else {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                    }, 100);
                }
            } else {
                // Inscription
                // Validation côté frontend
                if (formData.motDePasse !== formData.confirmerMotDePasse) {
                    setError("Les mots de passe ne correspondent pas");
                    setLoading(false);
                    // Faire défiler vers le message d'erreur
                    setTimeout(() => {
                        const errorElement =
                            document.getElementById("error-message");
                        if (errorElement) {
                            errorElement.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                        } else {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                    }, 100);
                    return;
                }

                if (userType === "etudiant" && !formData.matricule) {
                    setError("Le matricule est requis pour les étudiants");
                    setLoading(false);
                    // Faire défiler vers le message d'erreur
                    setTimeout(() => {
                        const errorElement =
                            document.getElementById("error-message");
                        if (errorElement) {
                            errorElement.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                        } else {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                    }, 100);
                    return;
                }

                // Effacer les erreurs si la validation passe
                setError("");

                const registerData: any = {
                    nomComplet: formData.nomComplet,
                    email: formData.email,
                    motDePasse: formData.motDePasse,
                    confirmerMotDePasse: formData.confirmerMotDePasse,
                    userType: userType,
                };

                // Ajouter les champs spécifiques selon le type d'utilisateur
                if (userType === "etudiant") {
                    registerData.matricule = formData.matricule;
                    registerData.niveau_id = formData.niveau_id;
                    registerData.parcours_id = formData.parcours_id;
                    registerData.mention_id = formData.mention_id;
                }

                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(registerData),
                });

                const result = await response.json();

                if (response.ok) {
                    // Inscription réussie, passer en mode connexion
                    setIsLogin(true);
                    resetForm();
                    setError("");
                    alert(
                        "Inscription en attente de validation ! Votre compte sera activé après approbation par un administrateur."
                    );
                } else {
                    setError(result.error || "Erreur lors de l'inscription");
                    // Faire défiler vers le message d'erreur
                    setTimeout(() => {
                        const errorElement =
                            document.getElementById("error-message");
                        if (errorElement) {
                            errorElement.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                        } else {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                    }, 100);
                }
            }
        } catch (error) {
            console.error("Erreur d'authentification:", error);
            setError("Erreur de connexion au serveur");
            // Faire défiler vers le message d'erreur
            setTimeout(() => {
                const errorElement = document.getElementById("error-message");
                if (errorElement) {
                    errorElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
            }, 100);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            nomComplet: "",
            email: "",
            motDePasse: "",
            confirmerMotDePasse: "",
            matricule: "",
            niveau: "",
            parcours_id: undefined,
            mention_id: undefined,
            niveau_id: undefined,
        });
        setError("");
    };

    const handleSwitchMode = () => {
        setIsLogin(!isLogin);
        resetForm();
    };

    const handleUserTypeChange = (type: "enseignant" | "etudiant") => {
        setUserType(type);
        resetForm();
    };

    return (
        <div
            className={styles.container}
            style={
                {
                    "--student-bg-image": `url(${studentImage})`,
                } as React.CSSProperties
            }
        >
            {/* Section de gauche - Bienvenue */}
            <div className={styles.welcomeSection}>
                <div className={styles.logo}>
                    <div className={styles.logoBar}></div>
                    <div className={styles.logoBar}></div>
                </div>

                <div className={styles.welcomeContent}>
                    <h1 className={styles.welcomeTitle}>
                        Système Intelligent Pédagogique
                    </h1>
                </div>
            </div>

            {/* Section de droite - Formulaire */}
            <div className={styles.formSection}>
                <div className={styles.formCard}>
                    <h2 className={styles.formTitle}>
                        {isLogin ? "Se connecter" : "S'inscrire"}
                    </h2>

                    {/* Afficher les erreurs */}
                    {error && (
                        <div id="error-message" className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    {!isLogin && (
                        <div className={styles.userTypeSelector}>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${
                                    userType === "enseignant"
                                        ? styles.active
                                        : ""
                                }`}
                                onClick={() =>
                                    handleUserTypeChange("enseignant")
                                }
                            >
                                Enseignant
                            </button>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${
                                    userType === "etudiant" ? styles.active : ""
                                }`}
                                onClick={() => handleUserTypeChange("etudiant")}
                            >
                                Étudiant
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {!isLogin && (
                            <div className={styles.formGroup}>
                                <label htmlFor="nomComplet">Nom complet</label>
                                <input
                                    type="text"
                                    id="nomComplet"
                                    name="nomComplet"
                                    value={formData.nomComplet}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Votre nom complet"
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label htmlFor="email">E-mail</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                placeholder="votre@email.com"
                            />
                        </div>

                        {!isLogin && userType === "etudiant" && (
                            <div className={styles.formGroup}>
                                <label htmlFor="matricule">Matricule</label>
                                <input
                                    type="text"
                                    id="matricule"
                                    name="matricule"
                                    value={formData.matricule}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Votre matricule"
                                />
                            </div>
                        )}

                        {!isLogin && userType === "etudiant" && (
                            <div className={styles.formGroup}>
                                <label htmlFor="mention_id">Mention</label>
                                <select
                                    id="mention_id"
                                    name="mention_id"
                                    value={formData.mention_id || ""}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">
                                        Sélectionnez votre mention
                                    </option>
                                    {mentions.map((mention) => (
                                        <option
                                            key={mention.id}
                                            value={mention.id}
                                        >
                                            {mention.nom} ({mention.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {!isLogin &&
                            userType === "etudiant" &&
                            formData.mention_id && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="parcours_id">
                                        Parcours
                                    </label>
                                    <select
                                        id="parcours_id"
                                        name="parcours_id"
                                        value={formData.parcours_id || ""}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">
                                            Sélectionnez votre parcours
                                        </option>
                                        {parcours
                                            .filter(
                                                (parcours) =>
                                                    parcours.mention_id ===
                                                    formData.mention_id
                                            )
                                            .map((parcours) => (
                                                <option
                                                    key={parcours.id}
                                                    value={parcours.id}
                                                >
                                                    {parcours.nom}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                        {!isLogin &&
                            userType === "etudiant" &&
                            formData.parcours_id && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="niveau_id">Niveau</label>
                                    <select
                                        id="niveau_id"
                                        name="niveau_id"
                                        value={formData.niveau_id || ""}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">
                                            Sélectionnez votre niveau
                                        </option>
                                        {getAvailableNiveaux(
                                            formData.parcours_id?.toString() ||
                                                ""
                                        ).map((niveau) => (
                                            <option
                                                key={niveau.id}
                                                value={niveau.id}
                                            >
                                                {niveau.nom} ({niveau.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                        <div className={styles.formGroup}>
                            <label htmlFor="motDePasse">Mot de passe</label>
                            <input
                                type="password"
                                id="motDePasse"
                                name="motDePasse"
                                value={formData.motDePasse}
                                onChange={handleInputChange}
                                required
                                placeholder="Votre mot de passe"
                            />
                        </div>

                        {!isLogin && (
                            <div className={styles.formGroup}>
                                <label htmlFor="confirmerMotDePasse">
                                    Confirmer le mot de passe
                                </label>
                                <input
                                    type="password"
                                    id="confirmerMotDePasse"
                                    name="confirmerMotDePasse"
                                    value={formData.confirmerMotDePasse}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Confirmez votre mot de passe"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading
                                ? "Chargement..."
                                : isLogin
                                ? "Se connecter"
                                : "S'inscrire"}
                        </button>
                    </form>

                    <div className={styles.switchMode}>
                        <p>
                            {isLogin
                                ? "Pas encore de compte ?"
                                : "Déjà un compte ?"}
                            <button
                                type="button"
                                onClick={handleSwitchMode}
                                className={styles.switchBtn}
                            >
                                {isLogin ? "S'inscrire" : "Se connecter"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
