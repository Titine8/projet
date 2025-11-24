import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { useMemo } from "react";
import InfluenceChart from "./InfluenceChart";
import { API_BASE_URL } from './config';


// Ajouter cette constante pour les couleurs du camembert
const COLORS = ['#00074d', '#00bcd4', '#ff6b6b', '#51cf66', '#ffd43b', '#9775fa', '#63e6be', '#ffa94d'];

export default function AnalyseTab() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);
  const navigate = useNavigate();

  const [influences, setInfluences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  const token = localStorage.getItem("accessToken");

  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    fetchInfluences();
  }, []);

  useEffect(() => {
    fetchAvailableColumns();
  }, []);

  useEffect(() => {
  if (selectedColumns.length > 0) {
    detectVariableTypes(); // ← AJOUTE CETTE LIGNE
    fetchChartData();
  } else {
    setChartData([]);
  }
}, [selectedColumns]);

  const fetchInfluences = async () => {
  setLoading(true);
  try {
    const res = await axios.get(`${API_BASE_URL}/api/analyse/influence/`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { username: decodedUsername, folder: decodedFolder, file: "file_combined.csv" },
    });


    const sorted = (res.data.influences || []).sort(
      (a, b) => (b.influence || 0) - (a.influence || 0)
    );

    setInfluences(sorted);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};
  const fetchAvailableColumns = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/analyse/columns/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          username: decodedUsername,
          folder: decodedFolder,
          file: "file_combined.csv"
        },
      });
  
      setAvailableColumns(res.data.columns || []);
    } catch (err) {
      console.error("Erreur chargement colonnes:", err);
    }
  };

    const fetchChartData = async () => {
  setChartLoading(true);
  try {
   
    const payload = {
      username: decodedUsername,
      folder: decodedFolder,
      columns: selectedColumns,
      file: "file_combined.csv"
    };

    // Si cat + cat, ajouter un paramètre pour le comptage
    if (selectedColumns.length === 2 && 
        selectedColumns.every(col => 
          availableColumns.find(c => c.name === col)?.type.includes('object') ||
          availableColumns.find(c => c.name === col)?.type.includes('category') ||
          availableColumns.find(c => c.name === col)?.type.includes('string')
        )) {
      payload.aggregation = "count"; // ← AJOUTE CETTE LIGNE
    }

    const res = await axios.post(`${API_BASE_URL}/api/analyse/chart-data/`, 
      payload, 
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

  
    setChartData(res.data.chart_data || []);
  } catch (err) {
    console.error("❌ Erreur chargement données graphique:", err);
    setChartData([]);
  } finally {
    setChartLoading(false);
  }
};

      const handleColumnSelect = (columnName) => {
    if (selectedColumns.includes(columnName)) {
      setSelectedColumns(selectedColumns.filter(col => col !== columnName));
    } else if (selectedColumns.length < 2) {
      setSelectedColumns([...selectedColumns, columnName]);
    }
  };
  const handleSendMessage = async () => {
    if (chatMessage.trim() === "") return;


    const newMessage = {
      id: Date.now(),
      text: chatMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage("");

    try {
     
      const res = await axios.post(
        `${API_BASE_URL}/api/analyse/chatbot/`,
        {
          message: chatMessage,
          username: decodedUsername,
          folder: decodedFolder
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );


      const botResponse = {
        id: Date.now() + 1,
        text: res.data.reply,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString()
      };

      setChatMessages(prev => [...prev, botResponse]);
    } catch (err) {
      console.error("Erreur lors de l'appel axios :", err);
      const botResponse = {
        id: Date.now() + 1,
        text: "Erreur du serveur, veuillez réessayer.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString()
      };
     
      setChatMessages(prev => [...prev, botResponse]);
    }
  };



  const menuButtons = [
    { id: "statistique", label: "Statistique descriptive", action: () => navigate(`/analyse/${username}/${folder}`) },
    { id: "visualisation", label: "Visualisation", action: () => navigate(`/visualisation/${username}/${folder}`) },
    { id: "analyse", label: "Analyse de donnée", action: () => navigate(`/analysetab/${username}/${folder}`) },
    { id: "prediction", label: "Prédiction", action: () => navigate(`/prediction/${username}/${folder}`) },
  ];


  // (tout en haut, avec les autres imports)

  const topInfluences = useMemo(() => influences.slice(0, 10), [influences]);
  // Fonction pour agréger les données pour le graphique
  
// Fonction de détection des types
const detectVariableTypes = () => {
  if (selectedColumns.length === 0) return;
  
  const types = selectedColumns.map(col => {
    const colInfo = availableColumns.find(c => c.name === col);
    if (!colInfo) return 'inconnu';
    
    if (colInfo.type.includes('object') || colInfo.type.includes('category') || colInfo.type.includes('string')) {
      return 'catégoriel';
    } else if (colInfo.type.includes('number') || colInfo.type.includes('int') || colInfo.type.includes('float')) {
      return 'numérique';
    }
    return 'inconnu';
  });
  
  console.log("🎯 DÉTECTION TYPES - Combinaison:", types.join(" + "));
};
  
// Fonction pour afficher camembert (1 catégoriel)
const renderPieChart = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={aggregateChartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#00074d"
          label
        >
          {aggregateChartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Fonction pour afficher histogramme (1 numérique)
const renderBarChart = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={aggregateChartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
        />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#00074d" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Fonction pour afficher tableau de contingence (cat + cat)
const renderContingencyTable = () => {
  return (
    <div style={styles.contingencyTable}>
      <table style={styles.contingencyTableInner}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>{selectedColumns[0]}</th>
            <th style={styles.tableHeader}>{selectedColumns[1]}</th>
            <th style={styles.tableHeader}>Effectif</th>
          </tr>
        </thead>
        <tbody>
          {aggregateChartData.map((item, index) => {
            // Découper le name "val1 - val2" en deux parties
            const parts = item.name.split(' - ');
            return (
              <tr key={index}>
                <td style={styles.tableCell}>{parts[0] || ''}</td>
                <td style={styles.tableCell}>{parts[1] || ''}</td>
                <td style={styles.tableCell}>{item.value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Fonction pour afficher scatter plot (num + num)
// Fonction pour afficher scatter plot (num + num)
// Fonction pour afficher histogramme groupé (num + num)
// Fonction pour afficher histogramme groupé (num + num)
const renderScatterPlot = () => {
  const groupedData = groupNumericData(aggregateChartData, selectedColumns[0], selectedColumns[1]);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={groupedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#00074d" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Fonction pour grouper les données num + cat
const groupNumCatData = (data, numCol, catCol) => {
  if (!data.length) return [];
  
  const aggregation = {};
  
  data.forEach(item => {
    const category = item[catCol];
    const value = parseFloat(item[numCol]);
    
    if (!isNaN(value) && category) {
      if (!aggregation[category]) {
        aggregation[category] = { sum: 0, count: 0 };
      }
      aggregation[category].sum += value;
      aggregation[category].count++;
    }
  });
  
  return Object.entries(aggregation)
    .map(([name, data]) => ({
      name,
      value: data.count > 0 ? data.sum / data.count : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
};
// Fonction pour afficher diagramme en barres (num + cat)
const renderNumCatChart = () => {
  const groupedData = groupNumCatData(aggregateChartData, selectedColumns[0], selectedColumns[1]);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={groupedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
        />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#00074d" />
      </BarChart>
    </ResponsiveContainer>
  );
};
// Fonction pour grouper les données numériques
const groupNumericData = (data, xCol, yCol) => {
  if (!data.length) return [];
  
  const xValues = data.map(item => parseFloat(item[xCol])).filter(val => !isNaN(val));
  if (xValues.length === 0) return [];
  
  const min = Math.min(...xValues);
  const max = Math.max(...xValues);
  const intervalSize = (max - min) / 10;
  
  const intervals = {};
  
  for (let i = 0; i < 10; i++) {
    const start = min + (i * intervalSize);
    const end = min + ((i + 1) * intervalSize);
    const label = `${start.toFixed(1)}-${end.toFixed(1)}`;
    intervals[label] = { sum: 0, count: 0 };
  }
  
  data.forEach(item => {
    const xValue = parseFloat(item[xCol]);
    const yValue = parseFloat(item[yCol]);
    
    if (!isNaN(xValue) && !isNaN(yValue)) {
      const intervalIndex = Math.floor((xValue - min) / intervalSize);
      const start = min + (intervalIndex * intervalSize);
      const end = min + ((intervalIndex + 1) * intervalSize);
      const label = `${start.toFixed(1)}-${end.toFixed(1)}`;
      
      if (intervals[label]) {
        intervals[label].sum += yValue;
        intervals[label].count++;
      }
    }
  });
  
  return Object.entries(intervals).map(([name, data]) => ({
    name,
    value: data.count > 0 ? data.sum / data.count : 0
  }));
};

// Fonction pour afficher diagramme en barres (cat + num)
const renderCatNumChart = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={aggregateChartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
        />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#00074d" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const aggregateChartData = useMemo(() => {
  if (!chartData || chartData.length === 0) {
    console.log("📊 DEBUG - Aucune chartData");
    return [];
  }
  
  console.log("📊 DEBUG - chartData:", chartData);
  console.log("📊 DEBUG - selectedColumns:", selectedColumns);
  return chartData;
}, [chartData, selectedColumns]);

  // Fonction pour grouper les données numériques en intervalles
  

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1>📊 Analyse des influences</h1>
          <p>Utilisateur : <strong>{decodedUsername}</strong> | Dossier : <strong>{decodedFolder}</strong></p>
        </div>
        <div style={styles.headerRight}>
          <button
            style={styles.headerButton}
            onClick={() => (window.location.href = "http://localhost:5173/auth")}
          >
            Déconnexion
          </button>
          <button
            style={styles.headerButton}
            onClick={() => (window.location.href = "http://localhost:5173/import")}
          >
            Retour à mes analyses
          </button>
        </div>
      </header>

      <nav style={styles.nav}>
        {menuButtons.map(btn => (
          <button
            key={btn.id}
            style={{
              ...styles.navButton,
              backgroundColor: btn.id === "analyse" ? "#00074d" : "#cfe3f2",
              color: btn.id === "analyse" ? "white" : "#00074d"
            }}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      <div style={styles.mainContainer}>
        <main style={styles.content}>
          {loading && <p style={styles.loading}>Chargement des influences...</p>}

          {!loading && topInfluences.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {/* Ligne du haut : Graphique des influences + Sélecteur */}
              <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
                <div style={{ flex: 1, height: 350 }}>
                  <InfluenceChart data={topInfluences} />
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 15 }}>
                  <div style={styles.selectorContainer}>
                    <h3 style={styles.selectorTitle}>📈 Sélection des variables</h3>
                    <p style={styles.selectorSubtitle}>Choisissez 1 à 2 variables pour le graphique</p>

                    <div style={styles.selectedColumns}>
                      {selectedColumns.map((col, index) => (
                        <span key={col} style={styles.selectedTag}>
                          {col}
                          <button
                            onClick={() => handleColumnSelect(col)}
                            style={styles.removeButton}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div style={styles.columnsGrid}>
                      {availableColumns.map(col => (
                        <button
                          key={col.name}
                          onClick={() => handleColumnSelect(col.name)}
                          style={{
                            ...styles.columnButton,
                            backgroundColor: selectedColumns.includes(col.name) ? '#00074d' : '#f8f9fa',
                            color: selectedColumns.includes(col.name) ? 'white' : '#333'
                          }}
                        >
                          {col.name}
                          <span style={styles.columnType}>
                            {col.type.includes('object') ? '📊' : '🔢'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ligne du bas : Graphique dynamique EN DESSOUS */}
                  {/* Ligne du bas : Graphique dynamique EN DESSOUS */}
    {selectedColumns.length > 0 && (
      <div style={styles.chartSection}>
        <h3 style={styles.chartTitle}>
          Graphique: {selectedColumns.join(" → ")}
        </h3>
                <div style={styles.chartContainer}>
          {chartLoading ? (
            <div style={styles.loading}>Chargement des données...</div>
                   ) : chartData && chartData.length > 0 ? (
         <div style={styles.chartWrapper}>
  {selectedColumns.length === 1 && 
   (availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('object') ||
    availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('category') ||
    availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('string')) ? 
    renderPieChart()
  : selectedColumns.length === 1 && 
    (availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('number') ||
     availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('int') ||
     availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('float')) ?
    renderBarChart()
  : selectedColumns.length === 2 && 
    selectedColumns.every(col => 
      availableColumns.find(c => c.name === col)?.type.includes('object') ||
      availableColumns.find(c => c.name === col)?.type.includes('category') ||
      availableColumns.find(c => c.name === col)?.type.includes('string')
    ) ?
    renderContingencyTable()
  : selectedColumns.length === 2 && 
    selectedColumns.every(col => 
      availableColumns.find(c => c.name === col)?.type.includes('number') ||
      availableColumns.find(c => c.name === col)?.type.includes('int') ||
      availableColumns.find(c => c.name === col)?.type.includes('float')
    ) ?
    renderScatterPlot()
  : selectedColumns.length === 2 && 
    ((availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('object') ||
      availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('category') ||
      availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('string')) &&
     (availableColumns.find(col => col.name === selectedColumns[1])?.type.includes('number') ||
      availableColumns.find(col => col.name === selectedColumns[1])?.type.includes('int') ||
      availableColumns.find(col => col.name === selectedColumns[1])?.type.includes('float'))) ?
    renderCatNumChart()
  : selectedColumns.length === 2 && 
    ((availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('number') ||
      availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('int') ||
      availableColumns.find(col => col.name === selectedColumns[0])?.type.includes('float')) &&
     (availableColumns.find(col => col.name === selectedColumns[1])?.type.includes('object') ||
      availableColumns.find(col => col.name === selectedColumns[1])?.type.includes('category') ||
      availableColumns.find(col => col.name === selectedColumns[1])?.type.includes('string'))) ?
    renderNumCatChart()
  : (
    <div style={styles.noData}>Type de graphique en développement</div>
  )}
</div>
          ) : (
            <div style={styles.noData}>Aucune donnée à afficher</div>
          )}
        </div>
      </div>
    )}
            </div>
          )}

          {!loading && influences.length === 0 && <p style={styles.noData}>Aucune donnée d'influence trouvée.</p>}
        </main>

        {/* Chatbot Panel - Affiché en permanence */}
        <aside style={styles.chatbotPanel}>
          <div style={styles.chatbotHeader}>
            <h3 style={styles.chatbotTitle}>🤖 Assistant IA</h3>
          </div>

          <div style={styles.chatbotContent}>
            <div style={styles.chatMessages}>
              {chatMessages.length === 0 ? (
                <div style={styles.welcomeMessage}>
                  <p>Bonjour ! Je suis votre assistant pour l'analyse des influences.</p>
                  <p>Posez-moi vos questions sur vos données !</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      ...styles.message,
                      ...(msg.sender === "user" ? styles.userMessage : styles.botMessage)
                    }}
                  >
                    <div style={{
                      ...styles.messageText,
                      ...(msg.sender === "user" ? styles.userMessageText : styles.botMessageText)
                    }}>
                      {msg.text}
                    </div>
                    <div style={styles.messageTime}>{msg.timestamp}</div>
                  </div>
                ))
              )}
            </div>

            <div style={styles.chatInputContainer}>
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Tapez votre message..."
                style={styles.chatInput}
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                style={styles.sendButton}
              >
                ➤
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Segoe UI, sans-serif",
    padding: 20,
    backgroundColor: "#e6f2f8",
    minHeight: "100vh",
    position: "relative"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(to right, #00074d, #00bcd4)",
    color: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    position: "relative",
    zIndex: 100
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  headerRight: {
    display: "flex",
    gap: 10
  },
  headerButton: {
    padding: "12px 12px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#00074d",
    fontWeight: "600",
    transition: "all 0.2s ease"
  },
  nav: {
    marginTop: 20,
    display: "flex",
    gap: 10,
    background: "white",
    padding: 8,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    position: "relative",
    zIndex: 100
  },
  navButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease"
  },
  mainContainer: {
    display: "flex",
    gap: "20px",
    marginTop: "20px",
    alignItems: "flex-start",
    position: "relative"
  },
  content: {
    flex: 1,
    minHeight: "400px"
  },
  chatbotPanel: {
    width: "320px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    overflow: "hidden",
    position: "sticky",
    top: "20px",
    alignSelf: "flex-start"
  },
  chatbotHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 15px",
    backgroundColor: "#00074d",
    color: "white"
  },
  chatbotTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "600"
  },
  chatbotContent: {
    display: "flex",
    flexDirection: "column",
    height: "350px"
  },
  chatMessages: {
    flex: 1,
    padding: "12px",
    overflowY: "auto",
    backgroundColor: "#f8f9fa",
    display: "flex",
    flexDirection: "column",
    gap: "8px" // Espacement entre les messages
  },

  message: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "8px",
    maxWidth: "85%", // Limite la largeur max
    wordWrap: "break-word"
  },

  userMessage: {
    alignSelf: "flex-end",
    alignItems: "flex-end"
  },

  botMessage: {
    alignSelf: "flex-start",
    alignItems: "flex-start"
  },

  messageText: {
    padding: "10px 14px",
    borderRadius: "18px",
    fontSize: "14px",
    lineHeight: "1.4",
    wordWrap: "break-word",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap", // Respecte les sauts de ligne
    maxWidth: "100%",
    boxSizing: "border-box"
  },

  userMessageText: {
    backgroundColor: "#00074d",
    color: "white",
    borderBottomRightRadius: "4px" // Petit détail style Messenger
  },

  botMessageText: {
    backgroundColor: "#e9ecef",
    color: "#333",
    borderBottomLeftRadius: "4px"
  },

  messageTime: {
    fontSize: "11px",
    color: "#999",
    marginTop: "4px",
    padding: "0 4px"
  },
  welcomeMessage: {
    textAlign: "center",
    color: "#666",
    fontSize: "12px", // ← Juste changer cette ligne (était 13px avant)
    lineHeight: "1.4",
    padding: "15px 0"
  },
  chatInputContainer: {
    display: "flex",
    padding: "12px",
    borderTop: "1px solid #e0e0e0",
    backgroundColor: "white",
    alignItems: "flex-end" // Ajoutez cette ligne
  },
  chatInput: {
    flex: 1,
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "20px",
    outline: "none",
    fontSize: "13px",
    fontFamily: "inherit", // Important pour la cohérence
    resize: "none", // Empêche le redimensionnement manuel
    minHeight: "40px", // Hauteur minimale
    maxHeight: "120px", // Hauteur maximale (3-4 lignes)
    overflowY: "auto", // Scroll si besoin
    lineHeight: "1.4"
  },
  sendButton: {
    marginLeft: "8px",
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "#00074d",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px"
  },
  loading: {
    textAlign: "center",
    padding: 40,
    fontSize: 16,
    color: "#00074d"
  },
  noData: {
    textAlign: "center",
    padding: 40,
    fontSize: 16,
    color: "#666",
    fontStyle: "italic"
  },
  selectorContainer: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  selectorTitle: {
    margin: "0 0 8px 0",
    color: "#00074d",
    fontSize: "18px"
  },
  selectorSubtitle: {
    margin: "0 0 15px 0",
    color: "#666",
    fontSize: "14px"
  },
  selectedColumns: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "15px"
  },
  selectedTag: {
    background: "#00074d",
    color: "white",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  removeButton: {
    background: "none",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
    padding: 0,
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  columnsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "8px",
    maxHeight: "200px",
    overflowY: "auto"
  },
  columnButton: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    transition: "all 0.2s ease"
  },
  columnType: {
    fontSize: "10px",
    opacity: 0.7
  },
  chartSection: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  chartTitle: {
    margin: "0 0 20px 0",
    color: "#00074d",
    fontSize: "18px",
    textAlign: "center"
  },
  chartContainer: {
    height: "300px",
    width: "100%"
  },
  chartWrapper: {
    width: "100%",
    height: "300px",
    display: "flex",
    flexDirection: "column"
  },

    contingencyTable: {
    maxHeight: "300px",
    overflow: "auto",
    border: "1px solid #ddd",
    borderRadius: "8px"
  },
  contingencyTableInner: {
    width: "100%",
    borderCollapse: "collapse"
  },
  tableHeader: {
    backgroundColor: "#00074d",
    color: "white",
    padding: "10px",
    textAlign: "center",
    position: "sticky",
    top: 0,
    border: "1px solid #ddd"
  },
  tableCell: {
    padding: "8px",
    border: "1px solid #ddd",
    textAlign: "center"
  },
};