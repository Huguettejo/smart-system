import React, { useState } from "react";

const TestModal: React.FC = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <div style={{ padding: "20px" }}>
            <h2>Test Modal</h2>
            <button
                onClick={() => setShowModal(true)}
                style={{ padding: "10px 20px", margin: "10px" }}
            >
                Ouvrir Modal Test
            </button>

            {showModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            maxWidth: "500px",
                            width: "90%",
                        }}
                    >
                        <h3>Modal Test</h3>
                        <p>Ceci est un test de modal simple.</p>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ padding: "10px 20px" }}
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestModal;


