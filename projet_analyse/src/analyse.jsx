import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Analyse() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [openFile, setOpenFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fileInfo, setFileInfo] = useState(null);

 const fetchFileInfo = async (fileName) => {
  try {
    const token = localStorage.getItem("accessToken"); // Ajoutez cette ligne
    const res = await axios.get(
      `http://localhost:8000/api/statistique/${encodeURIComponent(decodedUsername)}/${encodeURIComponent(decodedFolder)}/${encodeURIComponent(fileName)}/info/`, // Correction du chemin
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setFileInfo(res.data);
  } catch (err) {
    console.error("Erreur lors de la récupération des infos du fichier:", err);
  }
};


  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    fetchFile();
  }, []);

  const fetchFile = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/statistique/files/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { username: decodedUsername, folder: decodedFolder }
      });

      // Trouver le fichier unique qui commence par "file_"
      const targetFile = (res.data.files || []).find(f => f.startsWith("file_"));
      setFile(targetFile || null);

      if (targetFile) {
        fetchStats(targetFile);
        fetchFileInfo(targetFile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (fileName) => {
    if (stats[fileName]) return;
    try {
      const res = await axios.get(
        `http://localhost:8000/api/statistique/${encodeURIComponent(decodedUsername)}/${encodeURIComponent(decodedFolder)}/${encodeURIComponent(fileName)}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Résultat backend pour", fileName, ":", res.data);
      setStats(prev => ({ ...prev, [fileName]: res.data.stats }));
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
          <p style={styles.loading}>Chargement du fichier...</p>
        ) : file ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3>{file}</h3>

              <input
                type="text"
                placeholder="🔍 Rechercher une colonne"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  marginLeft: "10px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "13px"
                }}
              />

            </div>
            <div style={styles.statsPanel}>
              {stats[file] ? (
                <>
                  {/* Nombre de lignes, colonnes et valeurs manquantes */}
                  {fileInfo && (
                    <p style={{
                      fontWeight: "600",
                      marginBottom: "10px",
                      color: "#333",
                      fontFamily: "Segoe UI, sans-serif"
                    }}>
                      📄 {fileInfo.nb_lignes} ligne{fileInfo.nb_lignes > 1 ? "s" : ""} |
                      {fileInfo.nb_colonnes} colonne{fileInfo.nb_colonnes > 1 ? "s" : ""} |
                      ⚠️ {fileInfo.valeurs_manquantes} valeur{fileInfo.valeurs_manquantes > 1 ? "s" : ""} manquante{fileInfo.valeurs_manquantes > 1 ? "s" : ""}
                    </p>
                  )}

                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "15px",
                    fontFamily: "Segoe UI, sans-serif",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    borderRadius: "10px",
                    overflow: "hidden"
                  }}>
                    <thead>
                      <tr>
                        <th style={{
                          backgroundColor: "#1b4d3e",
                          color: "white",
                          padding: "10px",
                          textAlign: "left",
                          fontWeight: "600",
                          fontSize: "13px"
                        }}>Nom de la colonne</th>
                        <th style={{
                          backgroundColor: "#1b4d3e",
                          color: "white",
                          padding: "10px",
                          textAlign: "left",
                          fontWeight: "600",
                          fontSize: "13px"
                        }}>Type</th>
                        <th style={thStyles}>Nb valeurs</th>
                        <th style={thStyles}>Nb valeurs manquantes</th>
                        <th style={thStyles}>Nb valeurs uniques</th>
                        <th style={thStyles}>Mode / Valeur fréquente</th>
                        <th style={thStyles}>Moyenne</th>
                        <th style={thStyles}>Médiane</th>
                        <th style={thStyles}>Min</th>
                        <th style={thStyles}>Max</th>
                        <th style={thStyles}>Écart-type</th>
                        <th style={thStyles}>Variance</th>
                        <th style={thStyles}>Q1</th>
                        <th style={thStyles}>Q3</th>
                        <th style={thStyles}>IQR</th>
                        <th style={thStyles}>Skewness</th>
                        <th style={thStyles}>Kurtosis</th>
                        <th style={thStyles}>% Top catégorie</th>
                        <th style={thStyles}>Outliers détectés</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(stats[file]) &&
                        stats[file]
                          .filter(data => data["Nom de la colonne"].toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((data, index) => (

                            <tr
                              key={index}
                              style={{
                                backgroundColor: index % 2 === 0 ? "white" : "#f9f9f9",
                                transition: "background-color 0.2s ease"
                              }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f5f7f6")}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? "white" : "#f9f9f9")}
                            >
                              <td style={tdStyles}>{data["Nom de la colonne"]}</td>
                              <td style={tdStyles}>{data["Type"]}</td>
                              <td style={tdStyles}>{data["Nb valeurs"]}</td>
                              <td style={tdStyles}>{data["Nb valeurs manquantes"]}</td>
                              <td style={tdStyles}>{data["Nb valeurs uniques"]}</td>
                              <td style={tdStyles}>{data["Mode / Valeur fréquente"] ?? "-"}</td>
                              <td style={tdStyles}>{formatNumber(data["Moyenne"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Médiane"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Min"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Max"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Écart-type"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Variance"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Q1"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Q3"])}</td>
                              <td style={tdStyles}>{formatNumber(data["IQR"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Skewness"])}</td>
                              <td style={tdStyles}>{formatNumber(data["Kurtosis"])}</td>
                              <td style={tdStyles}>{formatNumber(data["% Top catégorie"])}</td>
                              <td style={tdStyles}>
                                {Array.isArray(data["Outliers détectés"])
                                  ? data["Outliers détectés"].length
                                  : data["Outliers détectés"] ?? "-"}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p>Chargement des statistiques...</p>
              )}
            </div>



          </div>
        ) : (
          <p>Aucun fichier trouvé</p>
        )}
      </main>
    </div>
  );
}

const tdStyles = {
  padding: "10px",
  borderBottom: "1px solid #e0e0e0",
  fontSize: "13px",
  color: "#333"
};

const thStyles = {
  backgroundColor: "#1b4d3e",
  color: "white",
  padding: "10px",
  textAlign: "left",
  fontWeight: "600",
  fontSize: "13px"
};

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
