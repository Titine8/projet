import React from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const [hoveredPrimary, setHoveredPrimary] = React.useState(false);
  const [hoveredSecondary, setHoveredSecondary] = React.useState(false);
  const [hoveredCards, setHoveredCards] = React.useState([false, false, false]);
  const navigate = useNavigate();

  const handleCardHover = (index, isHovered) => {
    const newHoveredCards = [...hoveredCards];
    newHoveredCards[index] = isHovered;
    setHoveredCards(newHoveredCards);
  };

  const styles = {
    page: {
      width: "100vw",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #e6f2f8 0%, #cfe3f2 50%, #00074d 100%)",
      color: "#00074d",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: "40px 20px",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
    },
    backgroundPattern: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 20% 80%, rgba(0, 188, 212, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(0, 7, 77, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(207, 227, 242, 0.2) 0%, transparent 50%)
      `,
      zIndex: 1,
    },
    container: {
      maxWidth: "1200px",
      width: "100%",
      textAlign: "center",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      padding: "60px 40px",
      borderRadius: "24px",
      boxShadow: "0 20px 60px rgba(0, 7, 77, 0.15)",
      position: "relative",
      zIndex: 2,
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
    },
    title: {
      fontSize: "3.5rem",
      fontWeight: "800",
      marginBottom: "20px",
      background: "linear-gradient(135deg, #00074d 0%, #00bcd4 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      lineHeight: "1.1",
      letterSpacing: "-0.5px",
    },
    subtitle: {
      fontSize: "1.4rem",
      color: "#666",
      marginBottom: "50px",
      fontWeight: "400",
      lineHeight: "1.5",
      maxWidth: "600px",
      margin: "0 auto 50px",
    },
    buttonContainer: {
      display: "flex",
      justifyContent: "center",
      gap: "20px",
      marginBottom: "80px",
      flexWrap: "wrap",
    },
    buttonPrimary: {
      backgroundColor: "#00074d",
      border: "none",
      color: "white",
      fontWeight: "700",
      padding: "18px 45px",
      borderRadius: "12px",
      cursor: "pointer",
      fontSize: "1.1rem",
      boxShadow: "0 8px 24px rgba(0, 7, 77, 0.3)",
      transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      position: "relative",
      overflow: "hidden",
    },
    buttonPrimaryHover: {
      backgroundColor: "#00bcd4",
      transform: "translateY(-3px) scale(1.05)",
      boxShadow: "0 12px 32px rgba(0, 188, 212, 0.4)",
    },
    buttonSecondary: {
      backgroundColor: "transparent",
      border: "2px solid #00074d",
      color: "#00074d",
      fontWeight: "700",
      padding: "18px 45px",
      borderRadius: "12px",
      cursor: "pointer",
      fontSize: "1.1rem",
      transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      position: "relative",
      overflow: "hidden",
    },
    buttonSecondaryHover: {
      backgroundColor: "#00074d",
      color: "white",
      transform: "translateY(-3px)",
      boxShadow: "0 8px 24px rgba(0, 7, 77, 0.2)",
    },
    features: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      gap: "30px",
      marginTop: "40px",
    },
    card: {
      backgroundColor: "white",
      padding: "40px 30px",
      borderRadius: "20px",
      boxShadow: "0 8px 32px rgba(0, 7, 77, 0.08)",
      textAlign: "center",
      transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      border: "1px solid #f0f4f8",
      position: "relative",
      overflow: "hidden",
    },
    cardHover: {
      transform: "translateY(-10px) scale(1.02)",
      boxShadow: "0 20px 50px rgba(0, 7, 77, 0.15)",
      borderColor: "#00bcd4",
    },
    cardIcon: {
      fontSize: "3rem",
      marginBottom: "20px",
      display: "block",
    },
    cardTitle: {
      fontSize: "1.5rem",
      fontWeight: "700",
      color: "#00074d",
      marginBottom: "15px",
    },
    cardText: {
      color: "#666",
      fontSize: "1rem",
      lineHeight: "1.6",
      fontWeight: "400",
    },
    cardDecoration: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "4px",
      background: "linear-gradient(90deg, #00074d, #00bcd4)",
      opacity: 0.8,
    },
    badge: {
      position: "absolute",
      top: "20px",
      right: "20px",
      backgroundColor: "#00bcd4",
      color: "white",
      padding: "5px 12px",
      borderRadius: "20px",
      fontSize: "0.8rem",
      fontWeight: "700",
      transform: "rotate(5deg)",
    },
    pulseAnimation: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "100%",
      height: "100%",
      background: "radial-gradient(circle, rgba(0,188,212,0.1) 0%, transparent 70%)",
      animation: "pulse 2s infinite",
    },
  };

  const features = [
    {
      icon: "🧹",
      title: "Nettoyage Automatique",
      description: "Corrigez, normalisez, et préparez vos données en un clic avec notre IA intégrée.",
      badge: "IA"
    },
    {
      icon: "📊",
      title: "Analyse Intelligente",
      description: "Découvrez des insights cachés grâce à des algorithmes d'analyse avancés.",
      badge: "Smart"
    },
    {
      icon: "🔮",
      title: "Prédictions Précises",
      description: "Modèles pré-entraînés prêts à l'emploi pour vos prévisions business.",
      badge: "AI"
    }
  ];

  return (
    <div style={styles.page}>
      <div style={styles.backgroundPattern} />
      
      <div style={styles.container}>
        {/* Badge Nouveau */}
        <div style={{
          position: "absolute",
          top: "-10px",
          right: "30px",
          backgroundColor: "#00bcd4",
          color: "white",
          padding: "8px 20px",
          borderRadius: "20px",
          fontSize: "0.9rem",
          fontWeight: "700",
          transform: "rotate(5deg)",
          boxShadow: "0 4px 12px rgba(0,188,212,0.3)",
          zIndex: 3,
        }}>
          🚀 NOUVEAU
        </div>

        <h1 style={styles.title}>
          DataAnalyzer Pro
        </h1>
        
        <p style={styles.subtitle}>
          Automatisez le travail d'un data scientist. Importez vos données, 
          et laissez notre intelligence artificielle révéler les insights cachés.
        </p>

        <div style={styles.buttonContainer}>
          <button
            style={
              hoveredPrimary
                ? { ...styles.buttonPrimary, ...styles.buttonPrimaryHover }
                : styles.buttonPrimary
            }
            onMouseEnter={() => setHoveredPrimary(true)}
            onMouseLeave={() => setHoveredPrimary(false)}
            onClick={() => navigate("/auth")}
          >
            <span>🚀</span>
            Commencer maintenant
            {hoveredPrimary && <div style={styles.pulseAnimation} />}
          </button>

          <button
            style={
              hoveredSecondary
                ? { ...styles.buttonSecondary, ...styles.buttonSecondaryHover }
                : styles.buttonSecondary
            }
            onMouseEnter={() => setHoveredSecondary(true)}
            onMouseLeave={() => setHoveredSecondary(false)}
            onClick={() => {
              // Scroll vers les features
              document.getElementById('features')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
          >
            <span>📚</span>
            Découvrir les features
          </button>
        </div>

        <div id="features" style={styles.features}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                ...styles.card,
                ...(hoveredCards[index] ? styles.cardHover : {})
              }}
              onMouseEnter={() => handleCardHover(index, true)}
              onMouseLeave={() => handleCardHover(index, false)}
            >
              <div style={styles.cardDecoration} />
              <div style={styles.cardIcon}>{feature.icon}</div>
              <div style={styles.badge}>{feature.badge}</div>
              <h3 style={styles.cardTitle}>{feature.title}</h3>
              <p style={styles.cardText}>{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Section supplémentaire */}
        <div style={{
          marginTop: "60px",
          padding: "40px",
          backgroundColor: "rgba(207, 227, 242, 0.3)",
          borderRadius: "16px",
          border: "1px solid rgba(0, 7, 77, 0.1)",
        }}>
          <h3 style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            color: "#00074d",
            marginBottom: "20px",
          }}>
            💡 Pourquoi choisir DataAnalyzer ?
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            color: "#666",
            fontSize: "1rem",
          }}>
            <div>✅ Aucune compétence technique requise</div>
            <div>⚡ Résultats en temps réel</div>
            <div>🔒 Sécurité des données garantie</div>
            <div>🎯 Insights actionnables</div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}