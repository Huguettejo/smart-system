import jsPDF from "jspdf";
import "jspdf-autotable";
import ENILogo from "../assets/images/ENI.jpg";
import UFLogo from "../assets/images/UF.jpg";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface EtudiantExport {
    matricule: string;
    nom: string;
    prenom: string;
    note?: string; // Changé en string pour afficher "4/20"
}

interface ExportOptions {
    matiere: string;
    niveau: string;
    parcours: string;
    anneeUniversitaire: string;
    enseignant: string;
}

// Fonction pour calculer l'année universitaire automatiquement
export const getCurrentAcademicYear = (): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11 (janvier = 0)

    // Si on est entre septembre et décembre, on est dans l'année universitaire qui a commencé
    // Si on est entre janvier et août, on est dans l'année universitaire qui a commencé l'année précédente
    if (currentMonth >= 8) {
        // Septembre (8) à Décembre (11)
        return `${currentYear}-${currentYear + 1}`;
    } else {
        // Janvier (0) à Août (7)
        return `${currentYear - 1}-${currentYear}`;
    }
};

// Fonction pour obtenir les années universitaires disponibles
export const getAvailableAcademicYears = (): string[] => {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];

    // Générer les 5 dernières années et les 2 prochaines
    for (let i = -5; i <= 2; i++) {
        const year = currentYear + i;
        years.push(`${year}-${year + 1}`);
    }

    return years;
};

export const exportListeEtudiantsPDF = (
    etudiants: EtudiantExport[],
    options: ExportOptions
) => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Couleurs
    const primaryBlue = "#1e40af";
    const lightBlue = "#dbeafe";
    const darkBlue = "#1e3a8a";

    // === EN-TÊTE ===
    // Logo ENI (image réelle)
    try {
        doc.addImage(ENILogo, "JPEG", 15, 15, 20, 15);
    } catch (error) {
        // Fallback si l'image ne charge pas
        doc.setFillColor(primaryBlue);
        doc.circle(25, 22, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("ENI", 22, 26);
    }

    // Logo UF (image réelle)
    try {
        doc.addImage(UFLogo, "JPEG", pageWidth - 35, 15, 20, 15);
    } catch (error) {
        // Fallback si l'image ne charge pas
        doc.setFillColor(darkBlue);
        doc.rect(pageWidth - 30, 15, 20, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text("UF", pageWidth - 25, 22);
        doc.text("ENI", pageWidth - 25, 28);
    }

    // Titre principal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("UNIVERSITE DE FIANARANTSOA", pageWidth / 2, 25, {
        align: "center",
    });

    doc.setFontSize(14);
    doc.text("ECOLE NATIONALE D'INFORMATIQUE", pageWidth / 2, 32, {
        align: "center",
    });

    doc.setFontSize(12);

    // Adapter le titre selon le niveau
    let titreNiveau = "";
    if (options.niveau === "L1") {
        titreNiveau =
            "LISTE DES ETUDIANTS EN PREMIERE ANNEE DE LA FORMATION DE LICENCE PROFESSIONNEL (L1)";
    } else if (options.niveau === "L2") {
        titreNiveau =
            "LISTE DES ETUDIANTS EN DEUXIEME ANNEE DE LA FORMATION DE LICENCE PROFESSIONNEL (L2)";
    } else if (options.niveau === "L3") {
        titreNiveau =
            "LISTE DES ETUDIANTS EN TROISIEME ANNEE DE LA FORMATION DE LICENCE PROFESSIONNEL (L3)";
    } else if (options.niveau === "M1") {
        titreNiveau =
            "LISTE DES ETUDIANTS EN PREMIERE ANNEE DE LA FORMATION DE MASTER PROFESSIONNEL (M1)";
    } else if (options.niveau === "M2") {
        titreNiveau =
            "LISTE DES ETUDIANTS EN DEUXIEME ANNEE DE LA FORMATION DE MASTER PROFESSIONNEL (M2)";
    } else {
        titreNiveau = `LISTE DES ETUDIANTS - NIVEAU ${options.niveau}`;
    }

    doc.text(titreNiveau, pageWidth / 2, 40, { align: "center" });

    // Informations du parcours (centrées)
    doc.setFontSize(11);
    doc.text(`PARCOURS: ${options.parcours}`, pageWidth / 2, 50, {
        align: "center",
    });
    doc.text(
        `Année Universitaire: ${options.anneeUniversitaire}`,
        pageWidth / 2,
        56,
        { align: "center" }
    );

    // Épreuve avec la matière concernée
    doc.setFontSize(10);
    doc.text(`EPREUVE: ${options.matiere}`, pageWidth / 2, 62, {
        align: "center",
    });

    // === PROCESSUS DE CORRECTION ===
    const processLabels = [
        "Correction",
        "Dépouillement",
        "Transcription",
        "Affichage",
        "Saisie",
    ];
    const startX = 20;
    const spacing = 25;

    doc.setFontSize(9);
    for (let i = 0; i < processLabels.length; i++) {
        const x = startX + i * spacing;
        doc.text(processLabels[i], x, 75);
        // Case à cocher
        doc.rect(x, 77, 4, 4);
    }

    // === TABLEAU DES ÉTUDIANTS ===
    const tableStartY = 95;

    // En-tête du tableau
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    // Colonnes simplifiées : N°INS°, NOM ET PRÉNOMS, Emargement, NOTE
    const colWidths = [25, 80, 30, 20]; // N°INS°, NOM ET PRÉNOMS, Emargement, NOTE
    const colHeaders = ["N°INS°", "NOM ET PRÉNOMS", "Emargement", "NOTE"];

    let currentX = 20;

    // Dessiner l'en-tête du tableau
    doc.setFillColor(lightBlue);
    doc.rect(
        20,
        tableStartY,
        colWidths.reduce((a, b) => a + b, 0),
        8,
        "F"
    );

    doc.setTextColor(0, 0, 0);
    for (let i = 0; i < colHeaders.length; i++) {
        doc.text(colHeaders[i], currentX + 2, tableStartY + 5);
        currentX += colWidths[i];
    }

    // Lignes des étudiants
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    let currentY = tableStartY + 8;
    const rowHeight = 8;

    etudiants.forEach((etudiant, index) => {
        // Alterner les couleurs de fond
        if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(
                20,
                currentY,
                colWidths.reduce((a, b) => a + b, 0),
                rowHeight,
                "F"
            );
        }

        currentX = 20;

        // N°INS° (Matricule)
        doc.text(etudiant.matricule, currentX + 2, currentY + 5);
        currentX += colWidths[0];

        // NOM ET PRÉNOMS
        const nomComplet = etudiant.nom
            ? `${etudiant.nom} ${etudiant.prenom}`
            : etudiant.prenom;
        doc.text(nomComplet, currentX + 2, currentY + 5);
        currentX += colWidths[1];

        // Emargement (vide - case à cocher)
        currentX += colWidths[2];

        // NOTE (note si disponible, sinon vide)
        if (etudiant.note !== undefined) {
            doc.text(etudiant.note, currentX + 2, currentY + 5);
        }
        currentX += colWidths[3];

        currentY += rowHeight;

        // Vérifier si on a besoin d'une nouvelle page
        if (currentY > pageHeight - 30) {
            doc.addPage();
            currentY = 20;
        }
    });

    // === INFORMATIONS EN BAS DE PAGE ===
    const bottomY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
        `Généré le ${new Date().toLocaleDateString("fr-FR")}`,
        20,
        bottomY
    );
    doc.text(`Enseignant: ${options.enseignant}`, pageWidth - 60, bottomY);

    // Sauvegarder le PDF
    const fileName = `Liste_Etudiants_${options.matiere}_${options.parcours}_${
        new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);
};

// Fonction utilitaire pour formater les données des étudiants
export const formatEtudiantsForExport = (
    etudiants: any[]
): EtudiantExport[] => {
    return etudiants.map((etudiant) => {
        // Calculer la moyenne des notes si plusieurs notes existent
        let noteFinale: string | undefined = undefined;

        if (etudiant.notes && etudiant.notes.length > 0) {
            // Si une seule note, la prendre directement
            if (etudiant.notes.length === 1) {
                noteFinale = `${etudiant.notes[0].note}/20`;
            } else {
                // Si plusieurs notes, calculer la moyenne
                const sommeNotes = etudiant.notes.reduce(
                    (sum: number, note: any) => sum + note.note,
                    0
                );
                const moyenne =
                    Math.round((sommeNotes / etudiant.notes.length) * 100) /
                    100;
                noteFinale = `${moyenne}/20`;
            }
        }

        // Diviser le nom complet en nom et prénom
        const nomComplet = etudiant.utilisateur?.username || "N/A";
        const partiesNom = nomComplet.split(" ");

        let nom: string;
        let prenom: string;

        if (partiesNom.length === 1) {
            // Si un seul mot, le mettre dans le prénom et laisser le nom vide
            nom = "";
            prenom = partiesNom[0];
        } else {
            // Si plusieurs mots, le premier est le nom, le reste est le prénom
            nom = partiesNom[0];
            prenom = partiesNom.slice(1).join(" ");
        }

        return {
            matricule: etudiant.matriculeId || "N/A",
            nom: nom,
            prenom: prenom,
            note: noteFinale,
        };
    });
};
