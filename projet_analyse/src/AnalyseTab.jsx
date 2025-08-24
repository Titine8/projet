import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function AnalyseTab() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [correlationMatrix, setCorrelationMatrix] = useState(null);

  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        "http://localhost:8000/api/statistique/files/",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { username: decodedUsername, folder: decodedFolder },
        }
      );

      const fetchedFiles = res.data.files || [];
      setFiles(fetchedFiles);

      const defaultFile = fetchedFiles.find(f => f.startsWith("file_"));
      if (defaultFile) {
        setSelectedFile(defaultFile);
        handleFileSelect({ target: { value: defaultFile } });
        encodeFileInBackground(defaultFile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.value;
    setSelectedFile(file);
    setColumns([]);
    setData([]);
    setCorrelationMatrix(null);

    if (!file) return;

    setLoading(true);
    try {
      const res = await axios.get(
        "http://localhost:8000/api/statistique/file-data/",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { username: decodedUsername, folder: decodedFolder, file },
        }
      );

      setData(res.data.preview || []);
      if (res.data.columns) setColumns(res.data.columns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const encodeFileInBackground = async (file) => {
    try {
      const res = await axios.get(
        "http://localhost:8000/api/analyse/encode/",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { username: decodedUsername, folder: decodedFolder, file },
        }
      );

      const encodedFileName =
        res.data.encoded_file || file.replace("file_", "encodage_");
      generateCorrelationMatrix(encodedFileName);
    } catch (err) {
      console.error("Erreur lors de l'encodage automatique:", err);
    }
  };

  const generateCorrelationMatrix = async (encodedFile) => {
    try {
      const res = await axios.get(
        "http://localhost:8000/api/analyse/correlation/",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            username: decodedUsername,
            folder: decodedFolder,
            file: encodedFile,
          },
        }
      );

      setCorrelationMatrix(res.data.correlation_matrix);
    } catch (err) {
      console.error("Erreur lors de la génération de la matrice de corrélation:", err);
    }
  };

  const menuButtons = [
    { id: "statistique", label: "Statistique descriptive", action: () => navigate(`/analyse/${username}/${folder}`) },
    { id: "visualisation", label: "Visualisation", action: () => navigate(`/visualisation/${username}/${folder}`) },
    { id: "analyse", label: "Analyse de donnée", action: () => navigate(`/analysetab/${username}/${folder}`) },
    { id: "prediction", label: "Prédiction", action: () => navigate(`/prediction/${username}/${folder}`) },
  ];

  // Dégradé bleu → blanc → rouge
  const getCellColor = (val) => {
    const opacity = Math.min(Math.abs(val), 1);
    if (val > 0) return `rgba(33, 150, 243, ${opacity})`; // bleu
    if (val < 0) return `rgba(244, 67, 54, ${opacity})`;   // rouge
    return "#f0f0f0"; // neutre
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>📈 Analyse sur les données</h1>
        <p>
          Utilisateur : <strong>{decodedUsername}</strong> | Dossier :{" "}
          <strong>{decodedFolder}</strong>
        </p>
      </header>

      <nav style={styles.nav}>
        {menuButtons.map((btn) => (
          <button
            key={btn.id}
            style={{
              ...styles.navButton,
              backgroundColor: btn.id === "analyse" ? "#1b4d3e" : "#eee",
              color: btn.id === "analyse" ? "white" : "black",
            }}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        <div style={styles.selectorContainer}>
          <label style={styles.label}>Choisir un fichier :</label>
          <select
            style={styles.select}
            onChange={handleFileSelect}
            value={selectedFile}
            disabled
          >
            <option value="">-- Sélectionner --</option>
            {files.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {correlationMatrix && (
          <div style={{ marginTop: 20, overflow: "auto", maxWidth: "100%", maxHeight: "300px" }}>
            <h3 style={{ marginBottom: 10, fontSize: 16 }}>Matrice de corrélation</h3>
            <div style={{
              display: "inline-block",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
            }}>
              <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "400px" }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, backgroundColor: "#1b4d3e", color: "white" }}></th>
                    {Object.keys(correlationMatrix).map((col) => (
                      <th key={col} style={{ ...styles.th, backgroundColor: "#1b4d3e", color: "white", padding: '4px' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(correlationMatrix).map(([rowKey, row]) => (
                    <tr key={rowKey}>
                      <th style={{ ...styles.th, backgroundColor: "#1b4d3e", color: "white", padding: '4px' }}>{rowKey}</th>
                      {Object.entries(row).map(([colKey, val]) => {
                        const bgColor = getCellColor(val);
                        const textColor = Math.abs(val) > 0.5 ? "white" : "black";
                        return (
                          <td key={colKey} style={{
                            width: 30,
                            height: 30,
                            textAlign: "center",
                            backgroundColor: bgColor,
                            color: textColor,
                            fontWeight: 600,
                            borderRadius: 4,
                            border: "1px solid #e0e0e0",
                            padding: 2
                          }}>
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { fontFamily: "Segoe UI, sans-serif", padding: 20, backgroundColor: "#f4f6f8", minHeight: "100vh" },
  header: { background: "#1b4d3e", color: "white", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  nav: { marginTop: 20, display: "flex", gap: 10, background: "white", padding: 10, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  navButton: { flex: 1, padding: 12, borderRadius: 8, border: "none", background: "#eee", fontWeight: 600, cursor: "pointer", transition: "all 0.3s ease" },
  main: { marginTop: 20 },
  selectorContainer: { margin: "20px 0", display: "flex", flexDirection: "column", gap: 8 },
  label: { fontWeight: 600, fontSize: 14, color: "#333" },
  select: { padding: "8px 12px", borderRadius: 10, border: "1px solid #ccc", backgroundColor: "#fff", fontSize: 13, transition: "all 0.2s ease" },
  th: { padding: 6, border: "1px solid #ddd", textAlign: "center", fontSize: 11, fontWeight: 600 },
  td: { padding: 2, border: "1px solid #ddd", textAlign: "center", fontSize: 11 },
};
