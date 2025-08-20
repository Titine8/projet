import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Scatter, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Prediction() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedCols, setSelectedCols] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/statistique/files/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { username: decodedUsername, folder: decodedFolder },
      });
      setFiles(res.data.files || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.value;
    setSelectedFile(file);
    setSelectedCols([]);
    setColumns([]);
    setData([]);

    if (!file) return;

    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/statistique/file-data/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { username: decodedUsername, folder: decodedFolder, file },
      });

      const fileData = res.data.preview || [];
      setData(fileData);

      if (res.data.columns) setColumns(res.data.columns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const menuButtons = [
    {
      id: "statistique",
      label: "Statistique descriptive",
      action: () => navigate(`/analyse/${username}/${folder}`),
    },
    {
      id: "visualisation",
      label: "Visualisation",
      action: () => navigate(`/visualisation/${username}/${folder}`),
    },
    {
      id: "analyse",
      label: "Analyse de donnée",
      action: () => alert("Bientôt disponible 🚀"),
    },
    {
      id: "prediction",
      label: "Prédiction",
      action: () => navigate(`/prediction/${username}/${folder}`),
    },
  ];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>📈 Prédiction sur les données</h1>
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
              backgroundColor: btn.id === "prediction" ? "#1b4d3e" : "#eee",
              color: btn.id === "prediction" ? "white" : "black",
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
          >
            <option value="">-- Sélectionner --</option>
            {files.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Segoe UI, sans-serif",
    padding: "20px",
    backgroundColor: "#f4f6f8",
    minHeight: "100vh",
  },
  header: {
    background: "#1b4d3e",
    color: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  nav: {
    marginTop: "20px",
    display: "flex",
    gap: "10px",
    background: "white",
    padding: "10px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  navButton: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#eee",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  main: { marginTop: "20px" },
  selectorContainer: {
    margin: "20px 0",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontWeight: 600,
    fontSize: "14px",
    color: "#333",
  },
  select: {
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1px solid #ccc",
    backgroundColor: "#fff",
    fontSize: "14px",
    transition: "all 0.2s ease",
  },
  multiSelect: {
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid #ccc",
    fontSize: "14px",
    backgroundColor: "#fff",
  },
};
