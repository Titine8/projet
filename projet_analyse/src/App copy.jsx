import React from "react";

export default function App() {
  const [hoveredPrimary, setHoveredPrimary] = React.useState(false);
  const [hoveredSecondary, setHoveredSecondary] = React.useState(false);

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
  };

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
            onClick={() => {}} // bouton inactif
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
            onClick={() => {}} // bouton inactif
          >
            En savoir plus
          </button>
        </div>

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
