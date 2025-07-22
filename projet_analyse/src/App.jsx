import React from "react";

export default function App() {
  const fileInputRef = React.useRef(null); // Pour déclencher le clic programmé sur le champ fichier
  const [csvFilesInfo, setCsvFilesInfo] = React.useState([]);
  const [modalOpen, setModalOpen] = React.useState(false);

  // 🎨 Styles CSS inline
  const styles = {
    page: {
      width: "100vw",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #d4f4dd 0%, #1b4d3e 100%)",
      color: "white",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      paddingTop: "40px",
      paddingBottom: "40px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      boxSizing: "border-box",
    },
    container: {
      maxWidth: "900px",
      width: "100%",
      textAlign: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: "40px",
      borderRadius: "20px",
      boxShadow: "0 0 20px rgba(0,0,0,0.7)",
      position: "relative",
    },
    title: {
      fontSize: "3.5rem",
      fontWeight: "900",
      marginBottom: "20px",
      textShadow: "2px 2px 4px #000000",
    },
    subtitle: {
      fontSize: "1.4rem",
      color: "#c7e9c0",
      marginBottom: "40px",
    },
    buttonPrimary: {
      backgroundColor: "#1b4d3e",
      border: "none",
      color: "white",
      fontWeight: "700",
      padding: "15px 40px",
      marginRight: "20px",
      borderRadius: "30px",
      cursor: "pointer",
      fontSize: "1.1rem",
      boxShadow: "0 5px 10px rgba(0,0,0,0.3)",
      transition: "background-color 0.3s",
    },
    buttonPrimaryHover: {
      backgroundColor: "#14532d",
    },
    buttonSecondary: {
      backgroundColor: "transparent",
      border: "2px solid white",
      color: "white",
      fontWeight: "700",
      padding: "15px 40px",
      borderRadius: "30px",
      cursor: "pointer",
      fontSize: "1.1rem",
      transition: "background-color 0.3s, color 0.3s",
    },
    buttonSecondaryHover: {
      backgroundColor: "white",
      color: "#1b4d3e",
    },
    features: {
      display: "flex",
      justifyContent: "space-around",
      marginTop: "60px",
      flexWrap: "wrap",
      gap: "20px",
    },
    card: {
      backgroundColor: "rgba(0,0,0,0.4)",
      padding: "30px",
      borderRadius: "20px",
      width: "260px",
      boxShadow: "0 0 15px rgba(0,0,0,0.6)",
      textAlign: "left",
    },
    cardTitle: {
      fontSize: "1.8rem",
      fontWeight: "700",
      color: "#a7d7a8",
      marginBottom: "12px",
    },
    cardText: {
      color: "#d4f4dd",
      fontSize: "1rem",
      lineHeight: "1.4",
    },

    // Styles modal
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: "rgba(245, 245, 220, 0.95)", // blanc cassé un peu transparent (beige clair)
      padding: "30px",
      borderRadius: "15px",
      width: "90%",
      maxWidth: "700px",
      color: "#1b4d3e", // texte sombre pour contraste
      maxHeight: "80vh",
      overflowY: "auto",
      boxShadow: "0 0 25px rgba(0,0,0,0.3)",
    },
    modalCloseButton: {
      backgroundColor: "#1b4d3e",
      border: "none",
      color: "white",
      fontWeight: "700",
      padding: "10px 25px",
      borderRadius: "30px",
      cursor: "pointer",
      fontSize: "1rem",
      marginTop: "20px",
    },
    openModalButton: {
      marginTop: "30px",
      backgroundColor: "#14532d",
      border: "none",
      color: "white",
      fontWeight: "700",
      padding: "12px 30px",
      borderRadius: "30px",
      cursor: "pointer",
      fontSize: "1.1rem",
      boxShadow: "0 5px 10px rgba(0,0,0,0.3)",
      transition: "background-color 0.3s",
    },
  };

  // Gestion hover boutons
  const [hoveredPrimary, setHoveredPrimary] = React.useState(false);
  const [hoveredSecondary, setHoveredSecondary] = React.useState(false);

  // Détection des types colonnes (inchangé)
  function detectColumnTypes(rows) {
    const nbRowsToSample = Math.min(rows.length, 20);
    const nbCols = rows[0].length;
    const columnValues = Array.from({ length: nbCols }, () => []);

    for (let i = 0; i < nbRowsToSample; i++) {
      const row = rows[i];
      row.forEach((val, colIndex) => {
        columnValues[colIndex].push(val.trim());
      });
    }

    const types = columnValues.map((values) => {
      let isNumber = true;
      let isBoolean = true;
      let isDate = true;

      for (const val of values) {
        if (val === "") continue;

        const v = val.toLowerCase();

        if (isNumber && isNaN(Number(val))) {
          isNumber = false;
        }

        if (isBoolean && v !== "true" && v !== "false") {
          isBoolean = false;
        }

        if (isDate && isNaN(Date.parse(val))) {
          isDate = false;
        }
      }

      if (isBoolean) return "Booléen";
      if (isNumber) return "Nombre";
      if (isDate) return "Date/Heure";
      return "Texte";
    });

    return types;
  }

  // Lecture des fichiers (inchangé)
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const newInfos = [];

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",");

        const rows = lines.slice(1).map((line) => line.split(","));

        const types = detectColumnTypes(rows);

        newInfos.push({
          nom: file.name,
          colonnes: headers,
          types: types,
        });

        if (newInfos.length === files.length) {
          setCsvFilesInfo(newInfos);
          setModalOpen(true); // Ouvre le modal à l'import
        }
      };

      reader.readAsText(file);
    });
  };

  // Composant Modal simple
  function Modal({ onClose, children }) {
    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div
          style={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
          <button style={styles.modalCloseButton} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Application d'analyse de données avancée</h1>
        <p style={styles.subtitle}>
          Automatisez le travail d’un data scientist. Importez vos données, laissez la magie opérer.
        </p>

        <div>
          <button
            style={
              hoveredPrimary
                ? { ...styles.buttonPrimary, ...styles.buttonPrimaryHover }
                : styles.buttonPrimary
            }
            onMouseEnter={() => setHoveredPrimary(true)}
            onMouseLeave={() => setHoveredPrimary(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            Commencer maintenant
          </button>

          <button
            style={
              hoveredSecondary
                ? { ...styles.buttonSecondary, ...styles.buttonSecondaryHover }
                : styles.buttonSecondary
            }
            onMouseEnter={() => setHoveredSecondary(true)}
            onMouseLeave={() => setHoveredSecondary(false)}
          >
            En savoir plus
          </button>
        </div>

        <input
          type="file"
          accept=".csv"
          multiple
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {csvFilesInfo.length > 0 && (
          <button
            style={styles.openModalButton}
            onClick={() => setModalOpen(true)}
            aria-label="Voir les données importées"
          >
            Voir les données importées
          </button>
        )}

        {modalOpen && (
          <Modal onClose={() => setModalOpen(false)}>
            <h2>📂 Données importées :</h2>
            {csvFilesInfo.map((info, index) => (
              <div key={index} style={{ marginBottom: "25px" }}>
                <h3>📄 {info.nom}</h3>
                <ul>
                  {info.colonnes.map((col, i) => (
                    <li key={i}>
                      <strong>{col}</strong> — {info.types[i]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Modal>
        )}

        <div style={styles.features}>
          <FeatureCard
            title="Nettoyage Automatique"
            description="Corrigez, normalisez, et préparez vos données en un clic."
            styles={styles}
          />
          <FeatureCard
            title="Analyse Intelligente"
            description="Découvrez des insights cachés grâce à l'IA intégrée."
            styles={styles}
          />
          <FeatureCard
            title="Prédictions Précises"
            description="Modèles pré-entraînés prêts à l’emploi pour vos prévisions."
            styles={styles}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, styles }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.cardText}>{description}</p>
    </div>
  );
}
