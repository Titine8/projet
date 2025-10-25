import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function StatistiqueTab() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);

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
      const res = await axios.get("http://localhost:8000/api/statistique/descriptive/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { username: decodedUsername, folder: decodedFolder, file }
      });
      setStats(prev => ({ ...prev, [file]: res.data.stats }));
    } catch (err) {
      console.error(err);
    }
  };

  const styles = {
    loading: { fontStyle: "italic", color: "#555" },
    card: { background: "white", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    actionButton: { background: "#1b4d3e", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
    table: { width: "100%", marginTop: "15px", borderCollapse: "collapse" },
    statsPanel: { marginTop: "15px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px", maxHeight: "400px", overflowY: "auto" }
  };

  return (
    <div>
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
                        <th>Colonne</th>
                        <th>Type</th>
                        <th>Infos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats[file]).map(([col, data]) => (
                        <tr key={col}>
                          <td>{col}</td>
                          <td>{data.type}</td>
                          <td>
                            {Object.entries(data).map(([k, v]) =>
                              k !== "type" ? (
                                <div key={k}>
                                  <strong>{k}:</strong> {String(v)}
                                </div>
                              ) : null
                            )}
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
    </div>
  );
}
