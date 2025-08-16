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

export default function Visualisation() {
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

  const handleColsSelect = (e) => {
    const value = Array.from(e.target.selectedOptions, (opt) => opt.value);
    if (value.length <= 2) setSelectedCols(value);
  };

  const isNumericColumn = (col) => {
    const vals = data.map((row) => row[col]).filter((v) => v != null && v !== "");
    if (vals.length === 0) return false;
    const numericCount = vals.filter((v) => !isNaN(parseFloat(v))).length;
    return numericCount / vals.length >= 0.8;
  };

  const renderChart = () => {
    if (selectedCols.length === 0 || data.length === 0) return null;

    if (selectedCols.length === 1) {
      const col = selectedCols[0];
      const numeric = isNumericColumn(col);

      if (numeric) {
        const counts = {};
        data.forEach((row) => {
          const val = parseFloat(row[col]);
          if (!isNaN(val)) {
            const key = Math.round(val);
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        return (
          <Bar
            data={{
              labels: Object.keys(counts),
              datasets: [{ label: col, data: Object.values(counts), backgroundColor: "rgba(75,192,192,0.6)" }],
            }}
          />
        );
      } else {
        const counts = {};
        data.forEach((row) => {
          const val = row[col] ?? "N/A";
          counts[val] = (counts[val] || 0) + 1;
        });
        return (
          <Pie
            data={{
              labels: Object.keys(counts),
              datasets: [
                {
                  label: col,
                  data: Object.values(counts),
                  backgroundColor: Object.keys(counts).map(
                    () => `rgba(${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)},${Math.floor(
                      Math.random() * 200
                    )},0.6)`
                  ),
                },
              ],
            }}
          />
        );
      }
    }

    if (selectedCols.length === 2) {
      const [col1, col2] = selectedCols;
      const col1Numeric = isNumericColumn(col1);
      const col2Numeric = isNumericColumn(col2);

      // Scatter plot for numeric vs numeric
      if (col1Numeric && col2Numeric) {
        return (
          <Scatter
            data={{
              datasets: [
                {
                  label: `${col1} vs ${col2}`,
                  data: data.map((row) => ({ x: parseFloat(row[col1]), y: parseFloat(row[col2]) })),
                  backgroundColor: "rgba(75,192,192,0.8)",
                },
              ],
            }}
          />
        );
      }

      // Bar chart for categorical vs categorical
      if (!col1Numeric && !col2Numeric) {
        const col1Labels = [...new Set(data.map((row) => row[col1] ?? "N/A"))];
        const col2Values = [...new Set(data.map((row) => row[col2] ?? "N/A"))];

        const groupedCounts = {};
        data.forEach((row) => {
          const key = `${row[col1] ?? "N/A"}|${row[col2] ?? "N/A"}`;
          groupedCounts[key] = (groupedCounts[key] || 0) + 1;
        });

        const datasets = col2Values.map((c2) => ({
          label: c2,
          data: col1Labels.map((l1) => groupedCounts[`${l1}|${c2}`] || 0),
          backgroundColor: `rgba(${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)},${Math.floor(
            Math.random() * 200
          )},0.6)`,
        }));

        return <Bar data={{ labels: col1Labels, datasets }} options={{ plugins: { title: { display: true, text: `${col1} vs ${col2}` } } }} />;
      }

      // Bar chart for numeric vs categorical
      const numCol = col1Numeric ? col1 : col2;
      const catCol = col1Numeric ? col2 : col1;
      const catGroups = {};
      data.forEach((row) => {
        const cat = row[catCol] ?? "N/A";
        if (!catGroups[cat]) catGroups[cat] = [];
        const val = parseFloat(row[numCol]);
        if (!isNaN(val)) catGroups[cat].push(val);
      });
      const labels = Object.keys(catGroups);
      const dataset = {
        label: `${numCol} vs ${catCol}`,
        data: labels.map((l) => {
          const vals = catGroups[l];
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
          return mean;
        }),
        backgroundColor: "rgba(75,192,192,0.6)",
      };
      return <Bar data={{ labels, datasets: [dataset] }} options={{ plugins: { title: { display: false, text: `${numCol} vs ${catCol}` } } }} />;
    }

    return null;
  };

  const menuButtons = [
    { id: "statistique", label: "Statistique descriptive", action: () => navigate(`/analyse/${username}/${folder}`) },
    { id: "visualisation", label: "Visualisation", action: () => navigate(`/visualisation/${username}/${folder}`) },
    { id: "analyse", label: "Analyse de donnée", action: () => alert("Bientôt disponible 🚀") },
    { id: "prediction", label: "Prédiction", action: () => alert("Bientôt disponible 🚀") },
  ];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>📈 Visualisation des données</h1>
        <p>
          Utilisateur : <strong>{decodedUsername}</strong> | Dossier : <strong>{decodedFolder}</strong>
        </p>
      </header>

      <nav style={styles.nav}>
        {menuButtons.map((btn) => (
          <button
            key={btn.id}
            style={{
              ...styles.navButton,
              backgroundColor: btn.id === "visualisation" ? "#1b4d3e" : "#eee",
              color: btn.id === "visualisation" ? "white" : "black",
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
          <select style={styles.select} onChange={handleFileSelect} value={selectedFile}>
            <option value="">-- Sélectionner --</option>
            {files.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {columns.length > 0 && (
          <div style={styles.selectorContainer}>
            <label style={styles.label}>Choisir une ou deux colonnes :</label>
            <select
              multiple
              onChange={handleColsSelect}
              value={selectedCols}
              size={Math.min(4, columns.length)}
              style={styles.multiSelect}
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: "40px", maxWidth: "800px" }}>
          {loading ? <p>Chargement...</p> : renderChart()}
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
