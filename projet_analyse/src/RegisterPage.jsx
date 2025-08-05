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
    borderRadius: "15px",
    maxWidth: "400px",
    width: "90%",
    color: "#1b4d3e",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxShadow: "0 0 20px rgba(0,0,0,0.3)",
  };
  const closeBtnStyle = {
    marginTop: "20px",
    backgroundColor: "#1b4d3e",
    color: "white",
    border: "none",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div>{children}</div>
        <button style={closeBtnStyle} onClick={onClose}>Fermer</button>
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
    // errObj = { username: [...], password: [...], ... }
    const lines = [];
    for (const key in errObj) {
      const field = key.charAt(0).toUpperCase() + key.slice(1);
      const messages = errObj[key];
      messages.forEach(msg => lines.push(`${field}: ${msg}`));
    }
    return lines;
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
      background: "linear-gradient(135deg, #d4f4dd 0%, #1b4d3e 100%)",
      color: "white",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: "40px",
      boxSizing: "border-box",
    },
    container: {
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: "40px",
      borderRadius: "20px",
      boxShadow: "0 0 20px rgba(0,0,0,0.7)",
      width: "100%",
      maxWidth: "400px",
      textAlign: "center",
    },
    title: {
      fontSize: "2rem",
      fontWeight: "700",
      marginBottom: "30px",
      textShadow: "2px 2px 4px #000000",
    },
    input: {
      width: "100%",
      padding: "12px",
      margin: "10px 0",
      borderRadius: "8px",
      border: "none",
      fontSize: "1rem",
    },
    button: {
      backgroundColor: "#1b4d3e",
      color: "white",
      padding: "12px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontWeight: "600",
      marginTop: "20px",
      fontSize: "1rem",
      width: "100%",
      opacity: loading ? 0.6 : 1,
    },
    link: {
      color: "#c7e9c0",
      cursor: "pointer",
      textDecoration: "underline",
    },
    errorList: {
      textAlign: "left",
      color: "#e94e4e",
      marginTop: "10px",
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>Créer un compte</h2>
        <input
          type="text"
          placeholder="Nom d'utilisateur"
          style={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
        <input
          type="email"
          placeholder="Email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          style={styles.input}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          disabled={loading}
        />
        <button style={styles.button} onClick={handleRegister} disabled={loading}>
          {loading ? "Chargement..." : "S’inscrire"}
        </button>

        <p style={{ marginTop: "20px" }}>
          J'ai déjà un compte{" "}
          <span style={styles.link} onClick={() => (window.location.href = "/auth")}>
            Se connecter
          </span>
        </p>
      </div>

      <Modal
        show={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        title="Erreur lors de l'inscription"
      >
        <ul style={{ color: "#e94e4e" }}>
          {errorMessages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
