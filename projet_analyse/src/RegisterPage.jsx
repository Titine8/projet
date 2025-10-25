import React, { useState } from "react";

function Modal({ show, onClose, title, children }) {
  if (!show) return null;

  const modalStyle = {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  };
  const contentStyle = {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "12px",
    maxWidth: "500px",
    width: "90%",
    color: "#00074d",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    border: "1px solid #e1e8ed",
  };
  const closeBtnStyle = {
    marginTop: "20px",
    backgroundColor: "#00074d",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.3s ease",
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: "#00074d", marginBottom: "15px", fontSize: "1.3rem" }}>{title}</h3>
        <div>{children}</div>
        <button 
          style={closeBtnStyle} 
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#00bcd4";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#00074d";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);

  const checkUsernameExists = async (username) => {
    try {
      const res = await fetch(`http://localhost:8000/api/accounts/check_username/?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      return data.exists;
    } catch {
      return false;
    }
  };

  const checkEmailExists = async (email) => {
    try {
      const res = await fetch(`http://localhost:8000/api/accounts/check_email/?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      return data.exists;
    } catch {
      return false;
    }
  };

  const formatErrors = (errObj) => {
    const lines = [];
    for (const key in errObj) {
      const field = key.charAt(0).toUpperCase() + key.slice(1);
      errObj[key].forEach(msg => lines.push(`${field}: ${msg}`));
    }
    return lines;
  };

  // Validation mot de passe côté front
  const validatePassword = (pwd) => {
    const rules = [
      { regex: /.{8,}/, message: "au moins 8 caractères" },
      { regex: /[A-Z]/, message: "au moins une majuscule" },
      { regex: /[a-z]/, message: "au moins une minuscule" },
      { regex: /[!@#$%^&*(),.?":{}|<>]/, message: "au moins un caractère spécial" },
    ];
    const failedRules = rules.filter(rule => !rule.regex.test(pwd));
    return failedRules.map(r => r.message);
  };

  const handleRegister = async () => {
    setErrorMessages([]);
    if (!username || !email || !password || !password2) {
      setErrorMessages(["Tous les champs sont obligatoires."]);
      setErrorModalVisible(true);
      return;
    }
    if (password !== password2) {
      setErrorMessages(["Les mots de passe ne correspondent pas."]);
      setErrorModalVisible(true);
      return;
    }

    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      setErrorMessages(["Mot de passe invalide : " + pwdErrors.join(", ")]);
      setErrorModalVisible(true);
      return;
    }

    setLoading(true);

    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      setErrorMessages(["Ce nom d'utilisateur est déjà pris."]);
      setErrorModalVisible(true);
      setLoading(false);
      return;
    }
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      setErrorMessages(["Cet email est déjà utilisé."]);
      setErrorModalVisible(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/accounts/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, password2 }),
      });
      const data = await response.json();

      if (response.ok) {
        alert("Inscription réussie !");
        window.location.href = "/auth";
      } else {
        setErrorMessages(formatErrors(data));
        setErrorModalVisible(true);
      }
    } catch {
      setErrorMessages(["Erreur réseau, veuillez réessayer."]);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      width: "100vw",
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
      marginBottom: "30px",
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
    },
    inputHover: {
      borderColor: "#00074d",
      backgroundColor: "#fff",
      boxShadow: "0 4px 12px rgba(0,7,77,0.1)",
    },
    inputIcon: {
      position: "absolute",
      left: "16px",
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "1.2rem",
      color: "#00074d",
    },
    passwordHint: {
      fontSize: "0.85rem", 
      color: "#666", 
      textAlign: "left", 
      marginTop: "5px", 
      marginBottom: "15px",
      padding: "12px",
      backgroundColor: "#f0f9ff",
      borderRadius: "8px",
      border: "1px solid #cfe3f2",
      lineHeight: "1.4",
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
  };

  const [inputHovered, setInputHovered] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [linkHovered, setLinkHovered] = useState(false);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>Créer un compte</h2>
        
        {/* Champ nom d'utilisateur */}
        <div style={styles.inputContainer}>
          <span style={styles.inputIcon}>👤</span>
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            style={{ 
              ...styles.input, 
              ...(inputHovered ? styles.inputHover : {}) 
            }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            onMouseEnter={() => setInputHovered(true)}
            onMouseLeave={() => setInputHovered(false)}
          />
        </div>

        {/* Champ email */}
        <div style={styles.inputContainer}>
          <span style={styles.inputIcon}>📧</span>
          <input
            type="email"
            placeholder="Email"
            style={{ 
              ...styles.input, 
              ...(inputHovered ? styles.inputHover : {}) 
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            onMouseEnter={() => setInputHovered(true)}
            onMouseLeave={() => setInputHovered(false)}
          />
        </div>

        {/* Indication mot de passe */}
        <div style={styles.passwordHint}>
          <strong>📋 Règles du mot de passe :</strong><br/>
          • Au moins 8 caractères<br/>
          • Une majuscule et une minuscule<br/>
          • Un caractère spécial (!@#$% etc.)
        </div>

        {/* Champ mot de passe */}
        <div style={styles.inputContainer}>
          <span style={styles.inputIcon}>🔒</span>
          <input
            type="password"
            placeholder="Mot de passe"
            style={{ 
              ...styles.input, 
              ...(inputHovered ? styles.inputHover : {}) 
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            onMouseEnter={() => setInputHovered(true)}
            onMouseLeave={() => setInputHovered(false)}
          />
        </div>

        {/* Champ confirmation mot de passe */}
        <div style={styles.inputContainer}>
          <span style={styles.inputIcon}>✅</span>
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            style={{ 
              ...styles.input, 
              ...(inputHovered ? styles.inputHover : {}) 
            }}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            disabled={loading}
            onMouseEnter={() => setInputHovered(true)}
            onMouseLeave={() => setInputHovered(false)}
          />
        </div>

        {/* Bouton d'inscription */}
        <button 
          style={{
            ...styles.button,
            ...(buttonHovered ? styles.buttonHover : {}),
            ...(loading ? styles.buttonDisabled : {})
          }}
          onClick={handleRegister} 
          disabled={loading}
          onMouseEnter={() => !loading && setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
        >
          {loading ? (
            <>
              <span>⏳</span>
              Chargement...
            </>
          ) : (
            <>
              <span>🚀</span>
              S'inscrire
            </>
          )}
        </button>

        {/* Lien vers connexion */}
        <p style={{ marginTop: "25px", color: "#666" }}>
          J'ai déjà un compte{" "}
          <span 
            style={{
              ...styles.link,
              ...(linkHovered ? styles.linkHover : {})
            }}
            onClick={() => !loading && (window.location.href = "/auth")}
            onMouseEnter={() => setLinkHovered(true)}
            onMouseLeave={() => setLinkHovered(false)}
          >
            <span>🔑</span>
            Se connecter
          </span>
        </p>
      </div>

      {/* Modal d'erreur */}
      <Modal
        show={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        title="Erreur lors de l'inscription"
      >
        <ul style={{ 
          color: "#d32f2f", 
          textAlign: "left", 
          paddingLeft: "20px",
          margin: "15px 0" 
        }}>
          {errorMessages.map((msg, i) => (
            <li key={i} style={{ marginBottom: "8px" }}>• {msg}</li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}