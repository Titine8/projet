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
  LabelList
} from "recharts";
import { useMemo } from "react";
import InfluenceChart from "./InfluenceChart";
import { API_BASE_URL } from './config';

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
  const [target, setTarget] = useState(""); // vide par défaut

  useEffect(() => {
    fetchInfluences();
  }, []);

  const fetchInfluences = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/analyse/influence/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { username: decodedUsername, folder: decodedFolder, file: "file_combined.csv" },
      });

      if (res.data.target) setTarget(res.data.target);

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


// (tout en haut, avec les autres imports)

const topInfluences = useMemo(() => influences.slice(0, 10), [influences]);


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
            <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
              <div style={{ flex: 1, height: 500 }}>
                <InfluenceChart data={topInfluences} />

              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {topInfluences.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "#3399cc",
                      padding: "8px 12px",
                      borderRadius: 6,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      fontSize: 14,
                      color: "#ffffff",
                      lineHeight: 1.4
                    }}
                  >
                    La colonne <strong style={{ color: "#00074d" }}>{item.column}</strong> influence la cible <strong style={{ color: "#00074d" }}>{target}</strong> à hauteur de
                    <span style={{ color: "#ffffff", fontWeight: 600 }}> {item.influence.toFixed(2)}%</span>.
                  </div>
                ))}
              </div>
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
  }
};