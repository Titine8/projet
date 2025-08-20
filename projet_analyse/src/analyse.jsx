import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Analyse() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [openFile, setOpenFile] = useState(null);

  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/statistique/files/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { username: decodedUsername, folder: decodedFolder }
      });
      setFiles(res.data.files || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (file) => {
    if (stats[file]) return;
    try {
      const res = await axios.get(
        `http://localhost:8000/api/statistique/${encodeURIComponent(decodedUsername)}/${encodeURIComponent(decodedFolder)}/${encodeURIComponent(file)}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Résultat backend pour", file, ":", res.data);
      setStats(prev => ({ ...prev, [file]: res.data.stats }));
    } catch (err) {
      console.error(err);
    }
  };

  const menuButtons = [
       { id: "statistique", label: "Statistique descriptive", action: () => navigate(`/analyse/${username}/${folder}`) },
    { id: "visualisation", label: "Visualisation", action: () => navigate(`/visualisation/${username}/${folder}`) },
    { id: "analyse", label: "Analyse de donnée", action: () => alert("Bientôt disponible 🚀") },
    { id: "prediction", label: "Prédiction", action: () => navigate(`/prediction/${username}/${folder}`) },
  ];

  const formatNumber = (value) => {
    return value != null && !isNaN(value) ? Number(value).toFixed(2) : value ?? "-";
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>📊 Statistique descriptive sur les données</h1>
        <p>
          Utilisateur : <strong>{decodedUsername}</strong> | Dossier :{" "}
          <strong>{decodedFolder}</strong>
        </p>
      </header>

      {/* Barre de navigation avec boutons */}
      <nav style={styles.nav}>
        {menuButtons.map(btn => (
          <button
            key={btn.id}
            style={{
              ...styles.navButton,
              backgroundColor: btn.id === "statistique" ? "#1b4d3e" : "#eee",
              color: btn.id === "statistique" ? "white" : "black"
            }}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {loading ? (
          <p style={styles.loading}>Chargement des fichiers...</p>
        ) : (
          files.map(file => (
            <div key={file} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3>{file}</h3>
                <button
                  style={styles.actionButton}
                  onClick={() => {
                    if (openFile === file) {
                      setOpenFile(null);
                    } else {
                      fetchStats(file);
                      setOpenFile(file);
                    }
                  }}
                >
                  {openFile === file ? "❌ Fermer" : "📊 Voir les stats"}
                </button>
              </div>
              {openFile === file && (
                <div style={styles.statsPanel}>
                  {stats[file] ? (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>Nom de la colonne</th>
                          <th>Type</th>
                          <th>Nb valeurs</th>
                          <th>Nb valeurs manquantes</th>
                          <th>Nb valeurs uniques</th>
                          <th>Mode / Valeur fréquente</th>
                          <th>Moyenne</th>
                          <th>Médiane</th>
                          <th>Min</th>
                          <th>Max</th>
                          <th>Écart-type</th>
                          <th>Variance</th>
                          <th>Q1</th>
                          <th>Q3</th>
                          <th>IQR</th>
                          <th>Skewness</th>
                          <th>Kurtosis</th>
                          <th>% Top catégorie</th>
                          <th>Outliers détectés</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(stats[file]) &&
                          stats[file].map((data, index) => (
                            <tr key={index}>
                              <td>{data["Nom de la colonne"]}</td>
                              <td>{data["Type"]}</td>
                              <td>{data["Nb valeurs"]}</td>
                              <td>{data["Nb valeurs manquantes"]}</td>
                              <td>{data["Nb valeurs uniques"]}</td>
                              <td>{data["Mode / Valeur fréquente"] ?? "-"}</td>
                              <td>{formatNumber(data["Moyenne"])}</td>
                              <td>{formatNumber(data["Médiane"])}</td>
                              <td>{formatNumber(data["Min"])}</td>
                              <td>{formatNumber(data["Max"])}</td>
                              <td>{formatNumber(data["Écart-type"])}</td>
                              <td>{formatNumber(data["Variance"])}</td>
                              <td>{formatNumber(data["Q1"])}</td>
                              <td>{formatNumber(data["Q3"])}</td>
                              <td>{formatNumber(data["IQR"])}</td>
                              <td>{formatNumber(data["Skewness"])}</td>
                              <td>{formatNumber(data["Kurtosis"])}</td>
                              <td>{formatNumber(data["% Top catégorie"])}</td>
                              <td>
                                {Array.isArray(data["Outliers détectés"])
                                  ? data["Outliers détectés"].length
                                  : data["Outliers détectés"] ?? "-"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>Chargement des statistiques...</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Segoe UI, sans-serif",
    padding: "20px",
    backgroundColor: "#f4f6f8",
    minHeight: "100vh"
  },
  header: {
    background: "#1b4d3e",
    color: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
  },
  nav: {
    marginTop: "20px",
    display: "flex",
    gap: "10px",
    background: "white",
    padding: "10px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  navButton: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#eee",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease"
  },
  main: { marginTop: "20px" },
  loading: { fontStyle: "italic", color: "#555" },
  card: {
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "transform 0.2s",
    cursor: "default"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  actionButton: {
    background: "#1b4d3e",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },
  table: {
    width: "100%",
    marginTop: "15px",
    borderCollapse: "separate",
    borderSpacing: "0 8px"
  },
  statsPanel: {
    marginTop: "15px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)",
    maxHeight: "400px",
    overflowY: "auto",
    transition: "max-height 0.3s ease"
  }
};
