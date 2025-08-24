import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Bar, Scatter, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, ArcElement, Title, Tooltip, Legend);

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
      const fetchedFiles = res.data.files || [];
      setFiles(fetchedFiles);
      const defaultFile = fetchedFiles.find(f => f.startsWith("file_"));
      if (defaultFile) {
        setSelectedFile(defaultFile);
        handleFileSelect({ target: { value: defaultFile } });
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

  const charts = [];

  selectedCols.forEach((col) => {
    const colIsNumeric = isNumericColumn(col);

    // 1️⃣ Colonne seule
    if (colIsNumeric) {
      // Histogramme coloré
const counts = {};
data.forEach((row) => {
  const val = parseFloat(row[col]);
  if (!isNaN(val)) {
    const key = Math.round(val);
    counts[key] = (counts[key] || 0) + 1;
  }
});

const labels = Object.keys(counts);
const values = Object.values(counts);

// Palette de couleurs vivante
const palette = ["#eeeeee", "#cccccc", "#aaaaaa", "#888888", "#666666", "#444444", "#222222"];
const backgroundColors = labels.map((_, i) => palette[i % palette.length]);

charts.push(
  <div key={col} style={styles.chartContainer}>
    <h3 style={styles.chartTitle}>{col}</h3>
    <div style={styles.chartWrapper}>
      <Bar
        data={{
          labels,
          datasets: [{ label: col, data: values, backgroundColor: backgroundColors }],
        }}
        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
      />
    </div>
  </div>
);

    } else {
      // Pie chart
      const counts = {};
      data.forEach((row) => {
        const val = row[col] ?? "N/A";
        counts[val] = (counts[val] || 0) + 1;
      });
      charts.push(
        <div key={col} style={styles.chartContainer}>
          <h3 style={styles.chartTitle}>{col}</h3>
          <div style={styles.chartWrapper}>
            <Pie
              data={{
                labels: Object.keys(counts),
                datasets: [{
                  label: col,
                  data: Object.values(counts),
                  backgroundColor: Object.keys(counts).map(
                    () => `rgba(${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)},0.6)`
                  ),
                }],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
      );
    }

    // 2️⃣ Colonne vs autres colonnes
    columns.forEach((otherCol) => {
      if (otherCol === col) return; // ne pas comparer avec soi-même

      const otherIsNumeric = isNumericColumn(otherCol);

      if (colIsNumeric && otherIsNumeric) {
        // Scatter plot
        charts.push(
          <div key={`${col}-${otherCol}`} style={styles.chartContainer}>
            <h3 style={styles.chartTitle}>{col} vs {otherCol}</h3>
            <div style={styles.chartWrapper}>
              <Scatter
                data={{
                  datasets: [{
                    label: `${col} vs ${otherCol}`,
                    data: data.map((row) => ({ x: parseFloat(row[col]), y: parseFloat(row[otherCol]) }))
                              .filter(d => !isNaN(d.x) && !isNaN(d.y)),
                    backgroundColor: "rgba(75,192,192,0.6)",
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          </div>
        );
      } else if (!colIsNumeric && !otherIsNumeric) {
        // Cat vs Cat → Bar chart groupé
        const crossCounts = {};
        data.forEach((row) => {
          const key = row[col] ?? "N/A";
          const val = row[otherCol] ?? "N/A";
          if (!crossCounts[key]) crossCounts[key] = {};
          crossCounts[key][val] = (crossCounts[key][val] || 0) + 1;
        });

        const labels = Object.keys(crossCounts);
        const allOtherVals = [...new Set(data.map(r => r[otherCol] ?? "N/A"))];
        const datasets = allOtherVals.map(val => ({
          label: val,
          data: labels.map(l => crossCounts[l][val] || 0),
          backgroundColor: `rgba(${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},0.6)`
        }));

        charts.push(
          <div key={`${col}-${otherCol}-bar`} style={styles.chartContainer}>
            <h3 style={styles.chartTitle}>{col} vs {otherCol}</h3>
            <div style={styles.chartWrapper}>
              <Bar data={{ labels, datasets }} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        );
      } else {
        // Cat vs Num → Boxplot (nécessite chartjs-boxplot ou plugin)
        const catCol = colIsNumeric ? otherCol : col;
        const numCol = colIsNumeric ? col : otherCol;

        const groups = {};
        data.forEach((row) => {
          const cat = row[catCol] ?? "N/A";
          const num = parseFloat(row[numCol]);
          if (!isNaN(num)) {
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(num);
          }
        });

        const labels = Object.keys(groups);
const palette = ["#1F77B4", "#2CA02C", "#17BECF", "#AEC7E8", "#98DF8A"];
const backgroundColors = labels.map((_, i) => palette[i % palette.length]);

const datasets = [{
  label: numCol,
  data: labels.map(l => ({
    min: Math.min(...groups[l]),
    max: Math.max(...groups[l]),
    q1: quantile(groups[l], 0.25),
    median: quantile(groups[l], 0.5),
    q3: quantile(groups[l], 0.75),
  })),
  backgroundColor: backgroundColors
}];

// Placeholder Bar chart avec couleur par catégorie
charts.push(
  <div key={`${col}-${otherCol}-box`} style={styles.chartContainer}>
    <h3 style={styles.chartTitle}>{catCol} vs {numCol} </h3>
    <div style={styles.chartWrapper}>
      <Bar data={{ labels, datasets: datasets.map(d => ({ label: d.label, data: d.data.map(dd => dd.median), backgroundColor: d.backgroundColor })) }}
           options={{ responsive: true, maintainAspectRatio: false }} />
    </div>
  </div>
);

      }
    });
  });

  return <div style={styles.chartsGrid}>{charts}</div>;
};

// Fonction utilitaire pour calculer les quantiles
function quantile(arr, q) {
  const sorted = [...arr].sort((a,b) => a-b);
  const pos = (sorted.length-1)*q;
  const base = Math.floor(pos);
  const rest = pos-base;
  if (sorted[base+1] !== undefined) return sorted[base]+rest*(sorted[base+1]-sorted[base]);
  else return sorted[base];
}


  const menuButtons = [
    { id: "statistique", label: "Statistique descriptive", action: () => navigate(`/analyse/${username}/${folder}`) },
    { id: "visualisation", label: "Visualisation", action: () => navigate(`/visualisation/${username}/${folder}`) },
    { id: "analyse", label: "Analyse de donnée", action: () => navigate(`/analysetab/${username}/${folder}`) },
    { id: "prediction", label: "Prédiction", action: () => navigate(`/prediction/${username}/${folder}`) },
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
          <select style={styles.select} onChange={handleFileSelect} value={selectedFile} disabled>
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
        
        <div style={{ marginTop: "40px", width: "100%" }}>
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
  main: {
    marginTop: "20px"
  },
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
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
    width: "100%",
  },
  chartContainer: {
    background: "#fff",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    height: "350px",
  },
  chartWrapper: {
    position: "relative",
    flex: 1,
    minHeight: "250px",
  },
  chartTitle: {
    margin: "0 0 10px 0",
    fontSize: "16px",
    textAlign: "center",
    fontWeight: "600",
  }
};