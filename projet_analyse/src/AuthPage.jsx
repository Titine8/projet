import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from './config';

export default function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputHovered, setInputHovered] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [linkHovered, setLinkHovered] = useState(false);

  // Nouveaux états pour le focus
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("username", username);
        navigate("/import");
      } else {
        setError("Identifiants incorrects.");
      }
    } catch (err) {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const styles = {
    page: {
      width: "100%",
      minHeight: "100vh",
      backgroundColor: "#e6f2f8",
      color: "#333",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: "40px",
      boxSizing: "border-box",
    },
    container: {
      backgroundColor: "white",
      padding: "50px 40px",
      borderRadius: "20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      width: "100%",
      maxWidth: "450px",
      textAlign: "center",
      border: "1px solid #e1e8ed",
    },
    title: {
      fontSize: "2.2rem",
      fontWeight: "800",
      marginBottom: "40px",
      color: "#00074d",
      letterSpacing: "0.5px",
      background: "linear-gradient(135deg, #00074d 0%, #00bcd4 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    inputContainer: {
      position: "relative",
      width: "100%",
      marginBottom: "20px",
    },
    input: {
      width: "100%",
      padding: "16px 20px 16px 50px",
      borderRadius: "12px",
      border: "2px solid #e1e8ed",
      fontSize: "1rem",
      backgroundColor: "#f8fafc",
      color: "#333",
      transition: "all 0.3s ease",
      boxSizing: "border-box",
      outline: "none",
    },
    inputHover: {
      borderColor: "#00074d",
      backgroundColor: "#fff",
      boxShadow: "0 4px 12px rgba(0,7,77,0.1)",
    },
    inputFocus: {
      borderColor: "#00074d",
      backgroundColor: "#fff",
      boxShadow: "0 4px 12px rgba(0,7,77,0.2)",
    },
    inputIcon: {
      position: "absolute",
      left: "16px",
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "1.2rem",
      color: "#00074d",
    },
    button: {
      backgroundColor: "#00074d",
      color: "white",
      padding: "16px 24px",
      borderRadius: "12px",
      border: "none",
      cursor: "pointer",
      fontWeight: "700",
      marginTop: "10px",
      fontSize: "1.1rem",
      width: "100%",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 16px rgba(0,7,77,0.3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    },
    buttonHover: {
      backgroundColor: "#00bcd4",
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(0,188,212,0.4)",
    },
    buttonDisabled: {
      backgroundColor: "#ccc",
      cursor: "not-allowed",
      transform: "none",
      boxShadow: "none",
    },
    error: {
      marginTop: "15px",
      color: "#d32f2f",
      fontSize: "0.95rem",
      fontWeight: "600",
      padding: "12px",
      backgroundColor: "#ffebee",
      borderRadius: "8px",
      border: "1px solid #ffcdd2",
      textAlign: "center",
    },
    link: {
      color: "#00074d",
      cursor: "pointer",
      textDecoration: "none",
      fontWeight: "600",
      transition: "all 0.3s ease",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
    },
    linkHover: {
      color: "#00bcd4",
      textDecoration: "underline",
    },
    footer: {
      marginTop: "25px",
      color: "#666",
      fontSize: "1rem",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>Connexion</h2>
        
        {/* Champ nom d'utilisateur */}
        <div style={styles.inputContainer}>
          <span style={styles.inputIcon}>👤</span>
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            style={{ 
              ...styles.input, 
              ...(inputHovered || usernameFocused ? styles.inputHover : {}), 
              ...(usernameFocused ? styles.inputFocus : {})
            }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onMouseEnter={() => setInputHovered(true)}
            onMouseLeave={() => setInputHovered(false)}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
        </div>

        {/* Champ mot de passe */}
        <div style={styles.inputContainer}>
          <span style={styles.inputIcon}>🔒</span>
          <input
            type="password"
            placeholder="Mot de passe"
            style={{ 
              ...styles.input, 
              ...(inputHovered || passwordFocused ? styles.inputHover : {}), 
              ...(passwordFocused ? styles.inputFocus : {})
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onMouseEnter={() => setInputHovered(true)}
            onMouseLeave={() => setInputHovered(false)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
        </div>

        {/* Bouton de connexion */}
        <button 
          style={{
            ...styles.button,
            ...(buttonHovered ? styles.buttonHover : {}),
            ...(loading ? styles.buttonDisabled : {})
          }}
          onClick={handleLogin}
          disabled={loading}
          onMouseEnter={() => !loading && setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
        >
          {loading ? (
            <>
              <span>⏳</span>
              Connexion...
            </>
          ) : (
            <>
              <span>🚀</span>
              Se connecter
            </>
          )}
        </button>

        {/* Message d'erreur */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Lien vers inscription */}
        <p style={styles.footer}>
          Pas encore de compte ?{" "}
          <span 
            style={{
              ...styles.link,
              ...(linkHovered ? styles.linkHover : {})
            }}
            onClick={() => !loading && navigate("/register")}
            onMouseEnter={() => setLinkHovered(true)}
            onMouseLeave={() => setLinkHovered(false)}
          >
            <span>📝</span>
            S'inscrire
          </span>
        </p>
      </div>
    </div>
  );
}
