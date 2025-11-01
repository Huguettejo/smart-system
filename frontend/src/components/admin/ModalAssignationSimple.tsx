import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../services/api";

interface ModalAssignationSimpleProps {
    isOpen: boolean;
    onClose: () => void;
    enseignant: any;
    onAssignationAdded?: () => void;
}

const ModalAssignationSimple: React.FC<ModalAssignationSimpleProps> = ({
    isOpen,
    onClose,
    enseignant,
    onAssignationAdded,
}) => {
    const [matieres, setMatieres] = useState<any[]>([]);
    const [niveaux, setNiveaux] = useState<any[]>([]);
    const [parcours, setParcours] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAssignation, setNewAssignation] = useState({
        matiere_id: "",
        niveau_id: "",
        parcours_id: "",
    });

    // Charger les données au montage
    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Charger les matières
            const matieresResponse = await authenticatedFetch("/api/matieres");
            if (matieresResponse.ok) {
                const data = await matieresResponse.json();
                setMatieres(data.matieres || []);
            }

            // Charger les niveaux (tous, actifs ET inactifs)
            const niveauxResponse = await authenticatedFetch(
                "/api/admin/niveaux"
            );
            if (niveauxResponse.ok) {
                const data = await niveauxResponse.json();
                setNiveaux(data.niveaux || []);
            }

            // Charger les parcours (tous, actifs ET inactifs)
            const parcoursResponse = await authenticatedFetch(
                "/api/admin/parcours"
            );
            if (parcoursResponse.ok) {
                const data = await parcoursResponse.json();
                setParcours(data.parcours || []);
            }
        } catch (error) {
            console.error("Erreur chargement données:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAssignation = async () => {
        if (
            !newAssignation.matiere_id ||
            !newAssignation.niveau_id ||
            !newAssignation.parcours_id
        ) {
            alert(
                "Veuillez sélectionner une matière, un niveau et un parcours"
            );
            return;
        }

        try {
            setLoading(true);

            const response = await authenticatedFetch(
                "/api/admin/assignations",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        enseignant_id: enseignant.id,
                        matiere_id: parseInt(newAssignation.matiere_id),
                        niveau_id: parseInt(newAssignation.niveau_id),
                        parcours_id: parseInt(newAssignation.parcours_id),
                    }),
                }
            );

            if (response.ok) {
                alert("✅ Assignation ajoutée avec succès !");
                setShowAddForm(false);
                setNewAssignation({
                    matiere_id: "",
                    niveau_id: "",
                    parcours_id: "",
                });
                if (onAssignationAdded) {
                    onAssignationAdded();
                }
            } else {
                const error = await response.json();
                alert(`❌ Erreur: ${error.error || "Erreur lors de l'ajout"}`);
            }
        } catch (error) {
            console.error("Erreur:", error);
            alert("❌ Erreur lors de l'ajout de l'assignation");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !enseignant) return null;

    return (
        <div className="modalOverlay">
            <div className="modalContent">
                <div className="modalHeader">
                    <h3>
                        Assignations -{" "}
                        {enseignant.utilisateur?.email || "Enseignant"}
                    </h3>
                    <button className="modalClose" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 20,
                        }}
                    >
                        <h3 style={{ margin: 0 }}>Assignations actuelles :</h3>
                        <button
                            className="btnSuccess"
                            onClick={() => setShowAddForm(!showAddForm)}
                        >
                            ➕ Ajouter une assignation
                        </button>
                    </div>

                    {showAddForm && (
                        <div
                            className="formGroup"
                            style={{
                                background: "transparent",
                                border: "none",
                            }}
                        >
                            <h4 style={{ margin: "0 0 15px 0" }}>
                                Nouvelle assignation :
                            </h4>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr 1fr",
                                    gap: 15,
                                    marginBottom: 15,
                                }}
                            >
                                <div>
                                    <label>Matière :</label>
                                    <select
                                        value={newAssignation.matiere_id}
                                        onChange={(e) =>
                                            setNewAssignation((prev) => ({
                                                ...prev,
                                                matiere_id: e.target.value,
                                            }))
                                        }
                                        className="filterSelect"
                                    >
                                        <option value="">
                                            Sélectionner une matière
                                        </option>
                                        {matieres.map((matiere) => (
                                            <option
                                                key={matiere.id}
                                                value={matiere.id}
                                            >
                                                {matiere.nom} ({matiere.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label>Niveau :</label>
                                    <select
                                        value={newAssignation.niveau_id}
                                        onChange={(e) =>
                                            setNewAssignation((prev) => ({
                                                ...prev,
                                                niveau_id: e.target.value,
                                            }))
                                        }
                                        className="filterSelect"
                                    >
                                        <option value="">
                                            Sélectionner un niveau
                                        </option>
                                        {niveaux.map((niveau) => (
                                            <option
                                                key={niveau.id}
                                                value={niveau.id}
                                            >
                                                {niveau.nom} ({niveau.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label>Parcours :</label>
                                    <select
                                        value={newAssignation.parcours_id}
                                        onChange={(e) =>
                                            setNewAssignation((prev) => ({
                                                ...prev,
                                                parcours_id: e.target.value,
                                            }))
                                        }
                                        className="filterSelect"
                                    >
                                        <option value="">
                                            Sélectionner un parcours
                                        </option>
                                        {parcours.map((parcours) => (
                                            <option
                                                key={parcours.id}
                                                value={parcours.id}
                                            >
                                                {parcours.nom} ({parcours.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="modalActions">
                                <button
                                    onClick={handleAddAssignation}
                                    disabled={loading}
                                    className="btnPrimary"
                                >
                                    {loading
                                        ? "⏳ Ajout en cours..."
                                        : "✅ Ajouter"}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewAssignation({
                                            matiere_id: "",
                                            niveau_id: "",
                                            parcours_id: "",
                                        });
                                    }}
                                    className="btnSecondary"
                                >
                                    ❌ Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    {enseignant.assignations &&
                    enseignant.assignations.length > 0 ? (
                        <ul style={{ listStyle: "none", padding: 0 }}>
                            {enseignant.assignations.map(
                                (assignation: any, index: number) => (
                                    <li
                                        key={index}
                                        style={{
                                            marginBottom: 10,
                                            padding: 10,
                                            background: "rgba(51,65,85,0.3)",
                                            borderRadius: 8,
                                            border: "1px solid rgba(96,165,250,0.2)",
                                            color: "#f1f5f9",
                                        }}
                                    >
                                        <strong>
                                            {assignation.matiere?.nom}
                                        </strong>
                                        {assignation.niveau &&
                                            ` - ${assignation.niveau.nom}`}
                                        {assignation.parcours &&
                                            ` - ${assignation.parcours.nom}`}
                                    </li>
                                )
                            )}
                        </ul>
                    ) : (
                        <p style={{ color: "#94a3b8", fontStyle: "italic" }}>
                            Aucune assignation trouvée.
                        </p>
                    )}
                </div>
                <div
                    className="modalActions"
                    style={{ justifyContent: "center" }}
                >
                    <button onClick={onClose} className="btnSecondary">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalAssignationSimple;
