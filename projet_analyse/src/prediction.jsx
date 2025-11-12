import React, { useEffect, useState , useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';


export default function Prediction() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);
  const navigate = useNavigate();

  const [targetName, setTargetName] = useState("");
  const [targetType, setTargetType] = useState("");
  const [predictionType, setPredictionType] = useState("");
  const [models, setModels] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [useModelResponse, setUseModelResponse] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [predictionResult, setPredictionResult] = useState(null);
  const [showError, setShowError] = useState(false);
  const token = localStorage.getItem("accessToken");
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [featureImportance, setFeatureImportance] = useState(null);
  const [isBotTyping, setIsBotTyping] = useState(false); // ← NOUVEAU STATE

  // 🔹 AJOUTEZ CES 2 LIGNES :
  const chatMessagesEndRef = useRef(null);

  // 🔹 AJOUTEZ CE useEffect :
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isBotTyping]);

  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "-";
    return Number(val).toFixed(2);
  };


  // 1. Récupération de la cible
  useEffect(() => {
    const fetchTargetName = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8000/api/prediction/get_target_name/",
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { username: decodedUsername, folder: decodedFolder },
          }
        );
        setTargetName(res.data.target);
        setTargetType(res.data.type);
      } catch (err) {
        console.error("Erreur lors de la récupération de la cible :", err);
      }
    };
    fetchTargetName();
  }, [decodedUsername, decodedFolder, token]);

  // 2. Rechercher modèles
  const handleSearchModel = async () => {
    if (!predictionType) return;

    const url =
      predictionType === "Prévision temporelle"
        ? "http://localhost:8000/api/prediction/search_model_prevision/"
        : "http://localhost:8000/api/prediction/search_model/";

    try {
      const res = await axios.post(
        url,
        {
          username: decodedUsername,
          folder: decodedFolder,
          target: targetName,
          prediction_type: predictionType,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setModels(res.data.models || []);
      setRecommended(res.data.recommended?.name || null);
      setSelectedModel("");
      setUseModelResponse(null);
      setPredictionResult(null);
      setShowError(false);
    } catch (err) {
      console.error("Erreur lors de la recherche de modèle :", err);
    }
  };

  // 3. Utiliser un modèle (et recevoir les colonnes + score)
  // 3. Utiliser un modèle (et recevoir les colonnes + score)
  const handleUseModel = async () => {
    if (!selectedModel) return;

    const url =
      predictionType === "Prévision temporelle"
        ? "http://localhost:8000/api/prediction/use_model_prevision/"
        : "http://localhost:8000/api/prediction/use_model/";

    try {
      const res = await axios.post(
        url,
        {
          username: decodedUsername,
          folder: decodedFolder,
          model_name: selectedModel,
          prediction_type: predictionType,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUseModelResponse(res.data);
      setFeatureImportance(res.data.feature_importance || null);
      // Initialiser inputValues selon la structure enrichie
      const initialInputs = {};
      for (const col in res.data.selected_columns) {
        initialInputs[col] = ""; // vide par défaut
      }
      setInputValues(initialInputs);
      setPredictionResult(null);
      setShowError(false);
    } catch (err) {
      console.error("Erreur lors de l'utilisation du modèle :", err);
    }
  };


  // 4. Gestion de saisie AVEC VALIDATION
  const handleInputChange = (col, value) => {
    if (!useModelResponse) return;

    const colInfo = useModelResponse.selected_columns[col];

    if (colInfo && colInfo.type === "numerical") {
      // Pour les champs numériques, valider immédiatement
      if (value === "" || value === null || value === undefined) {
        setInputValues(prev => ({ ...prev, [col]: "" }));
      } else {
        let numValue = Number(value);
        // Limiter aux bornes min/max
        if (numValue < colInfo.min) numValue = colInfo.min;
        if (numValue > colInfo.max) numValue = colInfo.max;
        setInputValues(prev => ({ ...prev, [col]: numValue }));
      }
    } else {
      // Pour les champs catégoriels, accepter directement
      setInputValues(prev => ({ ...prev, [col]: value }));
    }

    setShowError(false);
  };

  // Vérifier si tous les champs sont remplis (non vides)
  const isPredictDisabled = () => {
    if (!useModelResponse) return true;
    const cols = useModelResponse.selected_columns;
    return Object.keys(cols).some((col) => {
      const val = inputValues[col];
      return val === "" || val === null || val === undefined;
    });
  };

  // 5. Prédiction
  const handlePredict = async () => {
    if (isPredictDisabled()) {
      setShowError(true);
      return;
    }

    setShowError(false);

    try {
      const res = await axios.post(
        "http://localhost:8000/api/prediction/predict/",
        {
          username: decodedUsername,
          folder: decodedFolder,
          model_name: selectedModel,
          input_values: inputValues,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 🔹 Afficher la prédiction reçue
      setPredictionResult(res.data.prediction);
      setFeatureImportance(res.data.feature_importance || null);
    } catch (err) {
      console.error("Erreur lors de la prédiction :", err);
    }
  };

  // Chatbot functions
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

    // 🔹 Début du typing
    setIsBotTyping(true);

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
    } finally {
      // 🔹 Arrêt du typing (dans tous les cas)
      setIsBotTyping(false);
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
      action: () => navigate(`/analysetab/${username}/${folder}`),
    },
    {
      id: "prediction",
      label: "Prédiction",
      action: () => navigate(`/prediction/${username}/${folder}`),
    },
  ];

  const options =
    targetType === "num"
      ? ["Régression", "Clustering", "Prévision temporelle"]
      : targetType === "cat"
        ? ["Classification", "Clustering"]
        : [];

  // Prévision temporelle : préparation des données pour le graphique
  let chartData = [];
  if (useModelResponse && predictionType === "Prévision temporelle" && useModelResponse.dates && useModelResponse.predicted) {
    const maxPoints = 40; // nombre de points à afficher
    const step = Math.ceil(useModelResponse.dates.length / maxPoints);

    chartData = useModelResponse.dates
      .map((d, i) => ({
        date: d,
        observed: useModelResponse.observed[i],
        predicted: useModelResponse.predicted[i],
      }))
      .filter((_, i) => i % step === 0);
  }


  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1>📈 Prédiction sur les données</h1>
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
        {menuButtons.map((btn) => (
          <button
            key={btn.id}
            style={{
              ...styles.navButton,
              backgroundColor: btn.id === "prediction" ? "#00074d" : "#cfe3f2",
              color: btn.id === "prediction" ? "white" : "#00074d"
            }}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      <div style={styles.mainContainer}>
        <main style={styles.content}>
          {targetName && (
            <div style={styles.targetSection}>
              <div style={styles.targetInfo}>
                <p style={styles.targetText}>
                  Colonne cible : <strong style={styles.highlight}>{targetName}</strong> |
                  Type : <strong style={styles.highlight}>{targetType}</strong>
                </p>
              </div>
              <div style={styles.predictionControls}>
                <label style={styles.label}>
                  Choisir le type de prédiction :
                  <select
                    value={predictionType}
                    onChange={(e) => setPredictionType(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">-- Sélectionner --</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  style={styles.searchButton}
                  onClick={handleSearchModel}
                  disabled={!predictionType}
                >
                  Chercher le modèle idéal
                </button>
              </div>
            </div>
          )}

          {models.length > 0 && (
            <div style={styles.modelsSection}>
              <h3 style={styles.sectionTitle}>Modèles entraînés :</h3>
              <div style={styles.modelsList}>
                {models.map((m) => (
                  <div
                    key={m.name}
                    style={{
                      ...styles.modelCard,
                      borderColor: selectedModel === m.name ? "#00074d" : "#ddd",
                      backgroundColor: selectedModel === m.name ? "#e6f2ff" : "white",
                    }}
                    onClick={() => setSelectedModel(m.name)}
                  >
                    <div style={styles.modelHeader}>
                      <strong style={styles.modelName}>{m.name}</strong>
                      {recommended === m.name && (
                        <span style={styles.recommendedBadge}>⭐ Meilleur</span>
                      )}
                    </div>
                    <div style={styles.modelMetrics}>
                      {Object.entries(m.metrics).map(([key, value]) => (
                        <div key={key} style={styles.metric}>
                          <strong>{key}:</strong>{" "}
                          {Array.isArray(value) ? JSON.stringify(value) : value}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedModel && !useModelResponse && (
                <button onClick={handleUseModel} style={styles.actionButton}>
                  Utiliser ce modèle
                </button>
              )}
            </div>
          )}
          {useModelResponse && predictionType === "Prévision temporelle" && chartData.length > 0 && (
            <div style={{ marginTop: 20, height: 400 }}>
              <h4 style={{ color: "#00074d" }}>📈 Prévision temporelle</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="observed" stroke="#8884d8" name="Observé" />
                  <Line type="monotone" dataKey="predicted" stroke="#82ca9d" name="Prévu" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}


          {useModelResponse && predictionType !== "Clustering" && useModelResponse.selected_columns && (
            <div style={styles.modelUsageSection}>
              <div style={styles.successMessage}>
                <p>✅ Modèle <strong>{useModelResponse.model_name}</strong> évalué avec succès sur les données de test.</p>
                <p>📊 Score : <strong>{useModelResponse.score.toFixed(4)}</strong></p>
              </div>

              <h4 style={styles.inputTitle}>📝 Saisir les valeurs pour prédiction :</h4>
              <div style={styles.inputsGrid}>
                {Object.entries(useModelResponse.selected_columns || {}).map(([col, info]) => (


                  <div key={col} style={styles.inputGroup}>
                    <label style={styles.inputLabel}>{col} :</label>
                    {info.type === "numerical" ? (
                      <input
                        type="number"
                        value={inputValues[col] ?? ""}
                        min={info.min}
                        max={info.max}
                        step="any"
                        onChange={(e) => {
                          let val = e.target.value;
                          // Si vide, garder vide
                          if (val === "") {
                            handleInputChange(col, "");
                            return;
                          }
                          // Convertir en number et valider
                          let numVal = Number(val);
                          if (numVal < info.min) numVal = info.min;
                          if (numVal > info.max) numVal = info.max;
                          handleInputChange(col, numVal);
                        }}
                        onBlur={(e) => {
                          // Au blur, s'assurer que la valeur est dans les bornes
                          if (e.target.value !== "") {
                            let numVal = Number(e.target.value);
                            if (numVal < info.min || numVal > info.max) {
                              let clampedVal = Math.max(info.min, Math.min(info.max, numVal));
                              handleInputChange(col, clampedVal);
                            }
                          }
                        }}
                        style={styles.textInput}
                        placeholder={`Entre ${formatValue(info.min)} et ${formatValue(info.max)}`}
                      />
                    ) : info.type === "categorical" ? (
                      <select
                        value={inputValues[col] ?? ""}
                        onChange={(e) => handleInputChange(col, e.target.value)}
                        style={styles.textInput}
                      >
                        <option value="">-- Sélectionner une option --</option>
                        {info.categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : null}
                    {info && (
                      <div style={styles.columnInfo}>
                        <small style={styles.columnStats}>
                          {console.log("Colonne:", col, "Info:", info)}
                          Type: {info.type} {info.type === "numerical" ? `| Min: ${formatValue(info.min)} | Max: ${formatValue(info.max)}` : ""}
                        </small>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showError && (
                <div style={styles.errorMessage}>
                  ⚠️ Veuillez remplir tous les champs avant de prédire.
                </div>
              )}

              <button
                onClick={handlePredict}
                style={styles.predictButton}
                disabled={isPredictDisabled()}
              >
                Prédire
              </button>

              {predictionResult !== null && (
                <div style={styles.resultSection}>
                  <h4 style={styles.resultTitle}>🎯 Résultat de la prédiction</h4>
                  <p style={styles.resultExplanation}>
                    Valeur prédite pour <strong style={styles.highlight}>{targetName}</strong> :
                  </p>
                  <div style={styles.resultValue}>
                    {typeof predictionResult === 'number'
                      ? predictionResult.toFixed(4)
                      : String(predictionResult)}
                  </div>
                </div>
              )}

              {featureImportance && (
                <div style={styles.featureImportanceSection}>
                  <h4 style={styles.featureImportanceTitle}>📊 Importance des Variables</h4>
                  <div style={styles.importanceList}>
                    {Object.entries(featureImportance).map(([feature, importance], index) => (
                      <div key={feature} style={styles.importanceItem}>
                        <div style={styles.importanceHeader}>
                          <span style={styles.importanceRank}>#{index + 1}</span>
                          <span style={styles.importanceName}>{feature}</span>
                          <span style={styles.importanceValue}>
                            {typeof importance === 'number' ? importance.toFixed(4) : importance}
                          </span>
                        </div>
                        <div style={styles.importanceBarContainer}>
                          <div
                            style={{
                              ...styles.importanceBar,
                              width: `${Math.min(100, (importance / Object.values(featureImportance)[0]) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {useModelResponse && predictionType === "Clustering" && useModelResponse.metrics && useModelResponse.cluster_summary && (
            <div style={styles.clusteringSection}>
              <h3 style={styles.sectionTitle}>📊 Résumé du clustering</h3>

              <div style={styles.clusteringMetrics}>
                <div style={styles.metricItem}>
                  <strong>Silhouette:</strong> {useModelResponse.metrics?.silhouette?.toFixed(4) || "N/A"}
                </div>
                <div style={styles.metricItem}>
                  <strong>Calinski-Harabasz:</strong> {useModelResponse.metrics?.calinski_harabasz?.toFixed(4) || "N/A"}
                </div>
                <div style={styles.metricItem}>
                  <strong>Davies-Bouldin:</strong> {useModelResponse.metrics?.davies_bouldin?.toFixed(4) || "N/A"}
                </div>
              </div>

              <h4 style={styles.clustersTitle}>🗂️ Détails par cluster :</h4>
              <div style={styles.clustersGrid}>
                {Object.entries(useModelResponse.cluster_summary || {}).map(([clusterId, stats]) => (
                  <div
                    key={clusterId}
                    style={{
                      ...styles.clusterCard,
                      borderColor: selectedCluster === clusterId ? "#00074d" : "#ddd",
                      backgroundColor: selectedCluster === clusterId ? "#e6f2ff" : "#fff",
                    }}
                    onClick={() => setSelectedCluster(clusterId)}
                  >
                    <h5 style={styles.clusterHeader}>Cluster {clusterId}</h5>
                    <table style={styles.clusterTable}>
                      <thead>
                        <tr>
                          <th style={styles.tableHeader}>Variable</th>
                          <th style={styles.tableHeader}>Count</th>
                          <th style={styles.tableHeader}>Mean</th>
                          <th style={styles.tableHeader}>Min</th>
                          <th style={styles.tableHeader}>Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(stats)
                          .filter(key => key.endsWith("_count"))
                          .map(key => {
                            const varName = key.replace("_count", "");
                            return (
                              <tr key={varName}>
                                <td style={styles.tableCell}>{varName}</td>
                                <td style={styles.tableCell}>{stats[`${varName}_count`]}</td>
                                <td style={styles.tableCell}>{formatValue(stats[`${varName}_mean`])}</td>
                                <td style={styles.tableCell}>{formatValue(stats[`${varName}_min`])}</td>
                                <td style={styles.tableCell}>{formatValue(stats[`${varName}_max`])}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {/* 🔹 Affichage des vraies données du cluster sélectionné */}
              {selectedCluster && useModelResponse.cluster_data[selectedCluster] && (
                <div style={styles.clusterDataSection}>
                  <h4 style={styles.dataTitle}>Données réelles du cluster {selectedCluster} :</h4>
                  <div style={styles.dataTableContainer}>
                    <table style={styles.dataTable}>
                      <thead>
                        <tr>
                          {Object.keys(useModelResponse.cluster_data[selectedCluster][0]).map((col) => (
                            <th key={col} style={styles.dataHeader}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {useModelResponse.cluster_data[selectedCluster].map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).map((val, i) => (
                              <td key={i} style={styles.dataCell}>
                                {typeof val === "number" ? formatValue(val) : val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Chatbot Panel */}
        {/* Chatbot Panel */}
        <aside style={styles.chatbotPanel}>
          <div style={styles.chatbotHeader}>
            <h3 style={styles.chatbotTitle}>🤖 Assistant IA</h3>
          </div>

          <div style={styles.chatbotContent}>
            <div style={styles.chatMessages}>
              {chatMessages.length === 0 ? (
                <div style={styles.welcomeMessage}>
                  <p>Bonjour ! Je suis votre assistant pour les prédictions.</p>
                  <p>Posez-moi vos questions sur vos modèles !</p>
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

              {/* ⭐⭐⭐ INDICATEUR DE TYPING ⭐⭐⭐ */}
              {isBotTyping && (
                <div style={{ ...styles.message, ...styles.botMessage }}>
                  <div style={{ ...styles.messageText, ...styles.botMessageText }}>
                    <div style={styles.typingIndicator}>
                      <span style={{ ...styles.typingDot, ...styles.typingDot1 }}>•</span>
                      <span style={{ ...styles.typingDot, ...styles.typingDot2 }}>•</span>
                      <span style={{ ...styles.typingDot, ...styles.typingDot3 }}>•</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 🔹 AJOUTEZ CETTE LIGNE À LA FIN DES MESSAGES */}
              <div ref={chatMessagesEndRef} />
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
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    minHeight: "600px"
  },
  targetSection: {
    marginBottom: "30px",
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef"
  },
  targetInfo: {
    marginBottom: "15px"
  },
  targetText: {
    fontSize: "16px",
    color: "#333",
    margin: 0
  },
  highlight: {
    color: "#00074d"
  },
  predictionControls: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap"
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333"
  },
  select: {
    marginLeft: "8px",
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px"
  },
  searchButton: {
    padding: "10px 20px",
    backgroundColor: "#00074d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  modelsSection: {
    marginTop: "20px"
  },
  sectionTitle: {
    color: "#00074d",
    marginBottom: "15px",
    fontSize: "18px"
  },
  modelsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  modelCard: {
    padding: "15px",
    border: "2px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  modelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px"
  },
  modelName: {
    fontSize: "16px",
    color: "#00074d"
  },
  recommendedBadge: {
    backgroundColor: "#ffd700",
    color: "#000",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600"
  },
  modelMetrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "8px"
  },
  metric: {
    fontSize: "14px",
    color: "#555"
  },
  actionButton: {
    marginTop: "15px",
    padding: "12px 24px",
    backgroundColor: "#00074d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  modelUsageSection: {
    marginTop: "20px",
    padding: "20px",
    backgroundColor: "#f0f8ff",
    borderRadius: "8px",
    border: "1px solid #d1e7ff"
  },
  successMessage: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "12px 15px",
    borderRadius: "6px",
    marginBottom: "20px"
  },
  inputTitle: {
    color: "#00074d",
    marginBottom: "15px"
  },
  inputsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "15px",
    marginBottom: "20px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column"
  },
  inputLabel: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "5px",
    color: "#333"
  },
  textInput: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    marginBottom: "5px"
  },
  columnInfo: {
    marginBottom: "10px"
  },
  columnStats: {
    color: "#666",
    fontSize: "12px"
  },
  errorMessage: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "10px 15px",
    borderRadius: "6px",
    marginBottom: "15px"
  },
  predictButton: {
    padding: "12px 30px",
    backgroundColor: "#00bcd4",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "16px",
    transition: "all 0.2s ease"
  },
  resultSection: {
    marginTop: "20px",
    padding: "20px",
    backgroundColor: "#e8f5e8",
    borderRadius: "8px",
    border: "1px solid #c8e6c9"
  },
  resultTitle: {
    color: "#2e7d32",
    marginBottom: "10px"
  },
  resultValue: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#00074d",
    textAlign: "center",
    marginBottom: "10px"
  },
  resultExplanation: {
    textAlign: "center",
    color: "#333",
    margin: 0
  },
  clusteringSection: {
    marginTop: "20px"
  },
  clusteringMetrics: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap"
  },
  metricItem: {
    padding: "10px 15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "6px",
    border: "1px solid #e9ecef"
  },
  clustersTitle: {
    color: "#00074d",
    marginBottom: "15px"
  },
  clustersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "15px",
    marginBottom: "20px"
  },
  clusterCard: {
    padding: "15px",
    border: "2px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  clusterHeader: {
    color: "#00074d",
    marginBottom: "10px",
    fontSize: "16px"
  },
  clusterTable: {
    width: "100%",
    fontSize: "12px",
    borderCollapse: "collapse"
  },
  tableHeader: {
    border: "1px solid #ddd",
    padding: "4px",
    backgroundColor: "#f8f9fa",
    textAlign: "left",
    fontWeight: "600"
  },
  tableCell: {
    border: "1px solid #ddd",
    padding: "4px",
    textAlign: "left"
  },
  clusterDataSection: {
    marginTop: "20px"
  },
  dataTitle: {
    color: "#00074d",
    marginBottom: "15px"
  },
  dataTableContainer: {
    maxHeight: "300px",
    overflow: "auto",
    border: "1px solid #ccc",
    borderRadius: "8px"
  },
  dataTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px"
  },
  dataHeader: {
    border: "1px solid #ddd",
    padding: "6px 8px",
    backgroundColor: "#f8f9fa",
    fontWeight: "600",
    position: "sticky",
    top: 0
  },
  dataCell: {
    border: "1px solid #ddd",
    padding: "6px 8px"
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
  }, featureImportanceSection: {
    marginTop: "20px",
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef"
  },
  featureImportanceTitle: {
    color: "#00074d",
    marginBottom: "15px",
    fontSize: "16px"
  },
  importanceList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  importanceItem: {
    padding: "10px",
    backgroundColor: "white",
    borderRadius: "6px",
    border: "1px solid #ddd"
  },
  importanceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  importanceRank: {
    fontWeight: "bold",
    color: "#00074d",
    minWidth: "30px"
  },
  importanceName: {
    flex: 1,
    marginLeft: "10px",
    fontWeight: "600"
  },
  importanceValue: {
    fontWeight: "bold",
    color: "#00bcd4",
    minWidth: "60px",
    textAlign: "right"
  },
  importanceBarContainer: {
    width: "100%",
    height: "8px",
    backgroundColor: "#e9ecef",
    borderRadius: "4px",
    overflow: "hidden"
  },
  importanceBar: {
    height: "100%",
    backgroundColor: "#00bcd4",
    borderRadius: "4px",
    transition: "width 0.3s ease"
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '4px 0'
  },
  typingDot: {
    fontSize: '12px', // ← PLUS PETIT
    color: '#666',
    animation: 'bounce 1.4s infinite ease-in-out',
    animationFillMode: 'both'
  },
  typingDot1: {
    animationDelay: '-0.32s'
  },
  typingDot2: {
    animationDelay: '-0.16s'
  },
  typingDot3: {
    animationDelay: '0s'
  },
  '@global': {
    '@keyframes bounce': {
      '0%, 60%, 100%': {
        transform: 'translateY(0)',
        opacity: 0.7
      },
      '30%': {
        transform: 'translateY(-3px)', // ← ANIMATION PLUS DOUCE
        opacity: 1
      }
    }
  }
};