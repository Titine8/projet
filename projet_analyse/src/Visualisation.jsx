import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  ScatterChart, Scatter, Legend
} from "recharts";

export default function Visualisation() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [filters, setFilters] = useState({
    selectedVariable: "",
    numericRange: { min: 0, max: 100 },
    categoryFilter: ""
  });
  const [filteredData, setFilteredData] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const token = localStorage.getItem("accessToken");


  useEffect(() => {
    const fetchInfluence = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/visualisation/influence-columns/?username=${decodedUsername}&folder=${decodedFolder}&file=file_combined.csv`
        );
        if (!response.ok) throw new Error("Erreur lors du chargement des influences");
        const resData = await response.json();
        setData(resData);
        console.log("Données reçues:", resData);

        // Générer des données simulées pour les graphiques
        generateSimulatedData(resData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const generateSimulatedData = (influenceData) => {
      const simulatedData = [];
      const sampleSize = 100;

      // Déterminer le type de la cible
      const targetType = influenceData.cible?.cible?.type_colonne;
      const targetName = influenceData.cible?.vrai_nom;

      console.log("🎯 Type de cible:", targetType, "Nom:", targetName);

      for (let i = 0; i < sampleSize; i++) {
        const point = {};

        // Générer la valeur cible selon son type
        if (influenceData.cible?.cible) {
          const cible = influenceData.cible.cible;

          if (targetType === "num") {
            // Cible numérique
            const mean = cible.moyenne || 30;
            const std = cible.ecart_type || 5;
            point[targetName] = Math.max(0, mean + (Math.random() - 0.5) * 2 * std);
          } else if (targetType === "cat") {
            // Cible catégorielle
            if (cible.frequence && cible.frequence !== "N/A") {
              const categories = Object.keys(cible.frequence);
              point[targetName] = categories[Math.floor(Math.random() * categories.length)];
            } else {
              // Fallback si pas de fréquence
              point[targetName] = ["Catégorie A", "Catégorie B", "Catégorie C"][i % 3];
            }
          } else {
            // Type inconnu, utiliser numérique par défaut
            point[targetName] = Math.random() * 100;
          }
        }

        // Générer les variables d'influence
        influenceData.influences.forEach(inf => {
          const colData = influenceData.colonnes.find(c => c.nom_colonne === inf.column);
          if (colData) {
            switch (colData.type_colonne) {
              case "num":
                const mean = colData.moyenne || 0;
                const std = colData.ecart_type || 1;
                point[inf.column] = Math.max(0, mean + (Math.random() - 0.5) * 2 * std);
                break;
              case "cat":
                if (colData.frequence && colData.frequence !== "N/A") {
                  const categories = Object.keys(colData.frequence);
                  point[inf.column] = categories[Math.floor(Math.random() * categories.length)];
                } else {
                  point[inf.column] = "Catégorie " + (i % 5);
                }
                break;
              default:
                point[inf.column] = null;
            }
          }
        });

        simulatedData.push(point);
      }

      console.log("📊 Données simulées générées:", simulatedData.slice(0, 3));
      setRawData(simulatedData);
      setFilteredData(simulatedData);
    };

    fetchInfluence();
  }, [decodedUsername, decodedFolder]);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...rawData];

    // Filtre par plage numérique
    if (filters.selectedVariable && filters.numericRange) {
      const { min, max } = filters.numericRange;
      filtered = filtered.filter(row => {
        const value = parseFloat(row[filters.selectedVariable]);
        return !isNaN(value) && value >= min && value <= max;
      });
    }

    // Filtre par catégorie
    if (filters.categoryFilter) {
      filtered = filtered.filter(row =>
        row[filters.selectedVariable] === filters.categoryFilter
      );
    }

    setFilteredData(filtered);
  }, [filters, rawData]);

  const handleSendMessage = async () => {
    if (chatMessage.trim() === "") return;

    console.log("Envoi du message :", chatMessage);

    const newMessage = {
      id: Date.now(),
      text: chatMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString()
    };

    console.log("Ajout message utilisateur au state :", newMessage);
    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage("");

    try {
      console.log("Appel axios POST vers /api/chatbot/ avec payload :", { message: chatMessage });
      const res = await axios.post(
        "http://localhost:8000/api/analyse/chatbot/",
        {
          message: chatMessage,
          username: decodedUsername,
          folder: decodedFolder
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log("Réponse du serveur :", res.data);

      const botResponse = {
        id: Date.now() + 1,
        text: res.data.reply,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString()
      };

      console.log("Ajout réponse du bot au state :", botResponse);
      setChatMessages(prev => [...prev, botResponse]);
    } catch (err) {
      console.error("Erreur lors de l'appel axios :", err);
      const botResponse = {
        id: Date.now() + 1,
        text: "Erreur du serveur, veuillez réessayer.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString()
      };
      console.log("Ajout message d'erreur du bot au state :", botResponse);
      setChatMessages(prev => [...prev, botResponse]);
    }
  };

  const menuButtons = [
    { id: "statistique", label: "Statistique descriptive", action: () => navigate(`/analyse/${username}/${folder}`) },
    { id: "visualisation", label: "Visualisation", action: () => navigate(`/visualisation/${username}/${folder}`) },
    { id: "analyse", label: "Analyse de donnée", action: () => navigate(`/analysetab/${username}/${folder}`) },
    { id: "prediction", label: "Prédiction", action: () => navigate(`/prediction/${username}/${folder}`) },
  ];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      selectedVariable: "",
      numericRange: { min: 0, max: 100 },
      categoryFilter: ""
    });
  };

  const getVariableOptions = () => {
    if (!data) return [];
    return [
      data.cible.vrai_nom,
      ...data.influences.map(inf => inf.column)
    ].filter(col => isColumnSupported(col));
  };

  const getVariableType = (variableName) => {
    if (!data) return null;
    if (variableName === data.cible.vrai_nom) {
      return data.cible?.cible?.type_colonne;
    }
    const colData = data.colonnes.find(c => c.nom_colonne === variableName);
    return colData?.type_colonne;
  };

  const getCategories = (variableName) => {
    if (!data || !variableName) return [];
    const colData = data.colonnes.find(c => c.nom_colonne === variableName);
    if (colData?.type_colonne === "cat" && colData.frequence && colData.frequence !== "N/A") {
      return Object.keys(colData.frequence);
    }
    return Array.from(new Set(rawData.map(row => row[variableName]).filter(Boolean))).slice(0, 10);
  };

  const getNumericRange = (variableName) => {
    if (!data || !variableName) return { min: 0, max: 100 };

    const values = rawData
      .map(row => parseFloat(row[variableName]))
      .filter(val => !isNaN(val));

    if (values.length === 0) return { min: 0, max: 100 };

    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  };

  const renderKeyInfo = (col) => {
    if (!col) return "N/A";
    switch (col.type_colonne) {
      case "num":
        return `Moyenne: ${col.moyenne?.toFixed(2) ?? "N/A"}`;
      case "cat":
        if (col.frequence && col.frequence !== "N/A") {
          const maxCat = Object.entries(col.frequence).sort((a, b) => b[1] - a[1])[0];
          return `Modalité principale: ${maxCat[0]} (${maxCat[1]}%)`;
        }
        return "Modalité principale: N/A";
      case "date":
        return `Première: ${col.premiere_date} | Dernière: ${col.derniere_date}`;
      case "time":
        return `Première: ${col.premiere_heure} | Dernière: ${col.derniere_heure}`;
      default:
        return "";
    }
  };

  const isColumnSupported = (colName) => {
    if (!data) return false;

    const colData = data.colonnes.find(c => c.nom_colonne === colName);
    const targetCol = data.cible?.cible;

    if (!colData || !targetCol) {
      console.log("❌ Données manquantes pour:", colName);
      return false;
    }

    const isSupported = (colData.type_colonne === "num" || colData.type_colonne === "cat") &&
      (targetCol.type_colonne === "num" || targetCol.type_colonne === "cat");

    console.log(`✅ ${colName} supporté:`, isSupported, {
      colType: colData.type_colonne,
      targetType: targetCol.type_colonne
    });

    return isSupported;
  };

  const prepareChartData = (colName) => {
    if (!data || filteredData.length === 0) {
      console.log("❌ Données manquantes ou filteredData vide");
      return [];
    }

    const colData = data.colonnes.find(c => c.nom_colonne === colName);
    const targetCol = data.cible?.cible;

    if (!colData || !targetCol) {
      console.log("❌ colData ou targetCol manquant", { colName, colData, targetCol });
      return [];
    }

    const targetName = data.cible.vrai_nom;
    const targetType = targetCol.type_colonne;
    const colType = colData.type_colonne;

    console.log(`📈 Préparation: ${colName} (${colType}) vs ${targetName} (${targetType})`);

    try {
      // CAS 1: Cible numérique
      if (targetType === "num") {
        // Variable numérique -> Scatter plot
        if (colType === "num") {
          const points = filteredData
            .map(row => ({
              x: parseFloat(row[colName]) || 0,
              y: parseFloat(row[targetName]) || 0
            }))
            .filter(point => !isNaN(point.x) && !isNaN(point.y));

          console.log(`📊 Scatter data: ${points.length} points`);
          return points;
        }

        // Variable catégorielle -> Bar chart des moyennes
        if (colType === "cat") {
          const categories = {};

          filteredData.forEach(row => {
            const category = row[colName];
            const value = parseFloat(row[targetName]);

            if (category && !isNaN(value)) {
              if (!categories[category]) {
                categories[category] = { sum: 0, count: 0 };
              }
              categories[category].sum += value;
              categories[category].count += 1;
            }
          });

          const result = Object.entries(categories)
            .map(([category, data]) => ({
              category,
              moyenne: data.count > 0 ? data.sum / data.count : 0
            }))
            .sort((a, b) => b.moyenne - a.moyenne)
            .slice(0, 8);

          console.log(`📊 Bar data:`, result);
          return result;
        }
      }

      // CAS 2: Cible catégorielle  
      else if (targetType === "cat") {
        const targetCategories = Array.from(new Set(
          filteredData.map(row => row[targetName]).filter(Boolean)
        ));

        // Variable numérique -> Distribution par catégorie
        if (colType === "num") {
          // Simple moyenne par catégorie cible pour commencer
          const result = targetCategories.map(targetCat => {
            const values = filteredData
              .filter(row => row[targetName] === targetCat)
              .map(row => parseFloat(row[colName]))
              .filter(val => !isNaN(val));

            const moyenne = values.length > 0
              ? values.reduce((a, b) => a + b, 0) / values.length
              : 0;

            return {
              category: targetCat,
              moyenne: moyenne,
              count: values.length
            };
          });

          console.log(`📊 Cible cat vs var num:`, result);
          return result;
        }

        // Variable catégorielle -> Tableau croisé
        if (colType === "cat") {
          const colCategories = Array.from(new Set(
            filteredData.map(row => row[colName]).filter(Boolean)
          )).slice(0, 8); // Limiter à 8 catégories

          const result = colCategories.map(colCat => {
            const item = { category: colCat };
            let total = 0;

            targetCategories.forEach(targetCat => {
              const count = filteredData.filter(row =>
                row[colName] === colCat && row[targetName] === targetCat
              ).length;
              item[targetCat] = count;
              total += count;
            });

            // Ajouter le total pour les pourcentages
            item.total = total;
            return item;
          });

          console.log(`📊 Cible cat vs var cat:`, result);
          return result;
        }
      }
    } catch (error) {
      console.error("❌ Erreur dans prepareChartData:", error);
    }

    return [];
  };

  const renderChart = (inf, idx) => {
    if (!data || !isColumnSupported(inf.column)) {
      console.log("❌ Colonne non supportée:", inf.column);
      return null;
    }

    const colData = data.colonnes.find(c => c.nom_colonne === inf.column);
    const targetCol = data.cible?.cible;

    if (!colData || !targetCol) return null;

    const chartData = prepareChartData(inf.column);
    const targetName = data.cible.vrai_nom;
    const targetType = targetCol.type_colonne;
    const colType = colData.type_colonne;

    console.log(`🎨 Rendu: ${inf.column} (${colType}) vs ${targetName} (${targetType})`, chartData);

    if (chartData.length === 0) {
      return (
        <div key={idx} style={styles.scatterChart}>
          <h4 style={styles.chartTitle}>{inf.column} vs {targetName}</h4>
          <p style={styles.noData}>Aucune donnée disponible pour le graphique</p>
        </div>
      );
    }

    // CAS 1: Cible numérique
    if (targetType === "num") {
      if (colType === "num") {
        return (
          <div key={idx} style={styles.scatterChart}>
            <h4 style={styles.chartTitle}>{inf.column} vs {targetName}</h4>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                <XAxis dataKey="x" name={inf.column} type="number" />
                <YAxis dataKey="y" name={targetName} type="number" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={chartData} fill="#8bb8d6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      }

      if (colType === "cat") {
        return (
          <div key={idx} style={styles.scatterChart}>
            <h4 style={styles.chartTitle}>{inf.column} vs {targetName}</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip formatter={(value) => value.toFixed(2)} />
                <Bar dataKey="moyenne" fill="#8bb8d6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      }
    }

    // CAS 2: Cible catégorielle
    else if (targetType === "cat") {
      const targetCategories = Array.from(new Set(
        filteredData.map(row => row[targetName]).filter(Boolean)
      ));

      if (colType === "num") {
        // Graphique à barres groupées
        return (
          <div key={idx} style={styles.scatterChart}>
            <h4 style={styles.chartTitle}>Moyenne de {inf.column} par {targetName}</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="moyenne" fill="#8bb8d6" name={`Moyenne ${inf.column}`} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      }

      if (colType === "cat") {
        // Graphique à barres empilées
        return (
          <div key={idx} style={styles.scatterChart}>
            <h4 style={styles.chartTitle}>Distribution de {targetName} par {inf.column}</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                {targetCategories.map((cat, index) => {
                  const colors = ['#8bb8d6', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8'];
                  return (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      fill={colors[index % colors.length]}
                      stackId="a"
                      name={cat}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1>📈 Visualisation des données</h1>
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
              backgroundColor: btn.id === "visualisation" ? "#00074d" : "#cfe3f2",
              color: btn.id === "visualisation" ? "white" : "#00074d"
            }}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      <div style={styles.mainContainer}>
        <main style={styles.content}>
          {loading && <p style={styles.loading}>Chargement des données...</p>}
          {error && <p style={styles.error}>{error}</p>}

          {data && (
            <>
              {/* Section Filtres améliorée */}
              <div style={styles.filterSection}>
                <div style={styles.filterHeader}>
                  <h3 style={styles.filterTitle}>🎛️ Filtres et Interactions</h3>
                  <div style={styles.filterStats}>
                    <span style={styles.dataCount}>
                      📊 Données affichées: {filteredData.length} / {rawData.length}
                    </span>
                    <button onClick={resetFilters} style={styles.resetButton}>
                      🔄 Réinitialiser
                    </button>
                  </div>
                </div>

                <div style={styles.filterGrid}>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Variable à filtrer</label>
                    <select
                      value={filters.selectedVariable}
                      onChange={(e) => handleFilterChange('selectedVariable', e.target.value)}
                      style={styles.select}
                    >
                      <option value="">Sélectionner une variable</option>
                      {getVariableOptions().map(variable => (
                        <option key={variable} value={variable}>{variable}</option>
                      ))}
                    </select>
                  </div>

                  {filters.selectedVariable && (
                    <>
                      {getVariableType(filters.selectedVariable) === "num" && (
                        <div style={styles.filterGroup}>
                          <label style={styles.filterLabel}>
                            Plage de valeurs: {filters.numericRange.min.toFixed(1)} - {filters.numericRange.max.toFixed(1)}
                          </label>
                          <div style={styles.rangeContainer}>
                            <input
                              type="range"
                              min={getNumericRange(filters.selectedVariable).min}
                              max={getNumericRange(filters.selectedVariable).max}
                              value={filters.numericRange.min}
                              onChange={(e) => handleFilterChange('numericRange', {
                                ...filters.numericRange,
                                min: parseFloat(e.target.value)
                              })}
                              style={styles.range}
                            />
                            <input
                              type="range"
                              min={getNumericRange(filters.selectedVariable).min}
                              max={getNumericRange(filters.selectedVariable).max}
                              value={filters.numericRange.max}
                              onChange={(e) => handleFilterChange('numericRange', {
                                ...filters.numericRange,
                                max: parseFloat(e.target.value)
                              })}
                              style={styles.range}
                            />
                          </div>
                        </div>
                      )}

                      {getVariableType(filters.selectedVariable) === "cat" && (
                        <div style={styles.filterGroup}>
                          <label style={styles.filterLabel}>Filtrer par catégorie</label>
                          <select
                            value={filters.categoryFilter}
                            onChange={(e) => handleFilterChange('categoryFilter', e.target.value)}
                            style={styles.select}
                          >
                            <option value="">Toutes les catégories</option>
                            {getCategories(filters.selectedVariable).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div style={styles.kpiContainer}>
                <div style={styles.kpiCard}>
                  <h3 style={styles.kpiTitle}>{data.cible.vrai_nom}</h3>
                  <p style={styles.kpiText}>Type: {data.cible?.cible?.type_colonne || "N/A"}</p>
                  <p style={styles.kpiText}>Influence: 100%</p>
                  <p style={styles.kpiInfo}>{renderKeyInfo(data.cible?.cible)}</p>
                </div>

                {data.influences.map((inf, idx) => {
                  const colData = data.colonnes.find(c => c.nom_colonne === inf.column);
                  return (
                    <div key={idx} style={styles.kpiCard}>
                      <h3 style={styles.kpiTitle}>{inf.column}</h3>
                      <p style={styles.kpiText}>Type: {colData?.type_colonne || "N/A"}</p>
                      <p style={styles.kpiText}>Influence: {inf.influence}%</p>
                      <p style={styles.kpiInfo}>{renderKeyInfo(colData)}</p>
                    </div>
                  );
                })}
              </div>

              {/* Charts de comparaison */}
              <div style={styles.chartsContainer}>
                {data.influences.map((inf, idx) => renderChart(inf, idx))}
              </div>
            </>
          )}
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
                  <p>Bonjour ! Je suis votre assistant pour la visualisation de données.</p>
                  <p>Posez-moi vos questions sur vos graphiques !</p>
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
welcomeMessage: {
    textAlign: "center",
    color: "#666",
    fontSize: "12px", // ← Juste changer cette ligne (était 13px avant)
    lineHeight: "1.4",
    padding: "15px 0"
  },
  messageTime: {
    fontSize: "11px",
    color: "#999",
    marginTop: "4px",
    padding: "0 4px"
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
  error: {
    textAlign: "center",
    padding: 20,
    color: "#d32f2f",
    backgroundColor: "#ffebee",
    borderRadius: 8,
    margin: "20px 0"
  },
  // Styles améliorés pour les filtres
  filterSection: {
    background: "white",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
    border: "1px solid #e0e0e0"
  },
  filterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 15
  },
  filterTitle: {
    margin: 0,
    color: "#00074d",
    fontSize: 20,
    fontWeight: "600"
  },
  filterStats: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    flexWrap: "wrap"
  },
  dataCount: {
    backgroundColor: "#cfe3f2",
    color: "#00074d",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: "600"
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
    alignItems: "end"
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column"
  },
  filterLabel: {
    marginBottom: 8,
    fontWeight: "600",
    color: "#333",
    fontSize: 14
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "2px solid #e0e0e0",
    fontSize: 14,
    backgroundColor: "white",
    transition: "border-color 0.2s ease"
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "2px solid #e0e0e0",
    fontSize: 14,
    backgroundColor: "white",
    transition: "border-color 0.2s ease"
  },
  rangeContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  range: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    background: "#ddd",
    outline: "none",
    cursor: "pointer"
  },
  resetButton: {
    padding: "10px 16px",
    background: "linear-gradient(to right, #00074d, #3399cc)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: 14,
    transition: "all 0.2s ease"
  },
  // Styles pour les KPI Cards
  kpiContainer: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 24
  },
  kpiCard: {
    flex: "1 1 250px",
    background: "linear-gradient(135deg, #3399cc, #00074d)",
    color: "white",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    transition: "transform 0.2s ease"
  },
  kpiTitle: {
    margin: "0 0 12px 0",
    fontSize: 18,
    fontWeight: "600"
  },
  kpiText: {
    margin: "4px 0",
    fontSize: 14,
    opacity: 0.9
  },
  kpiInfo: {
    margin: "8px 0 0 0",
    fontSize: 12,
    opacity: 0.8,
    fontStyle: "italic"
  },
  // Styles pour les graphiques
  chartsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20
  },
  scatterChart: {
    flex: "1 1 45%",
    minWidth: 350,
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)"
  },
  chartTitle: {
    margin: "0 0 16px 0",
    color: "#00074d",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center"
  },
  tooltip: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
    border: "1px solid #e0e0e0"
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    padding: '40px',
    fontStyle: 'italic'
  }
};