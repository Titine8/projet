import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/accounts/login/", {
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
        localStorage.setItem("username", username);  // Stockage username
        navigate("/import");
      } else {
        setError("Identifiants incorrects.");
      }
    } catch (err) {
      setError("Erreur réseau.");
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
    },
    error: {
      marginTop: "10px",
      color: "red",
      fontSize: "0.9rem",
    },
    link: {
      marginTop: "20px",
      color: "#c7e9c0",
      cursor: "pointer",
      textDecoration: "underline",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>Connexion</h2>
        <input
          type="text"
          placeholder="Nom d'utilisateur"
          style={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={styles.button} onClick={handleLogin}>
          Se connecter
        </button>

        {error && <div style={styles.error}>{error}</div>}

        <p style={{ marginTop: "20px" }}>
          Pas encore de compte ?{" "}
          <span onClick={() => navigate("/register")} style={styles.link}>
            S’inscrire
          </span>
        </p>
      </div>
    </div>
  );
}
