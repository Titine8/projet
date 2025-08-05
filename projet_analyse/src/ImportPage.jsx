import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const styles = {
    header: {
      position: "fixed",
      top: 0,
      right: 0,
      padding: "12px 24px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      backgroundColor: "rgba(0,0,0,0.6)",
      borderBottomLeftRadius: "12px",
      color: "white",
      fontWeight: "700",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontSize: "1rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      zIndex: 1000,
      userSelect: "none",
    },
    button: {
      backgroundColor: "#1b4d3e",
      border: "none",
      borderRadius: "8px",
      color: "white",
      padding: "8px 16px",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "0.9rem",
      transition: "background-color 0.3s ease",
    },
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
    navigate("/auth");
  };

  return (
    <div style={styles.header}>
      <div>👤 {username}</div>
      <button
        style={styles.button}
        onClick={handleLogout}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#16372e")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1b4d3e")}
      >
        Déconnexion
      </button>
    </div>
  );
}

export default function ImportPage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [userFolders, setUserFolders] = useState([]); // sous-dossiers
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [hoveredFileIndex, setHoveredFileIndex] = useState(null);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [inputHovered, setInputHovered] = useState(false);

  const [subfolderName, setSubfolderName] = useState(""); // nom sous-dossier pour upload

  // Pour modal analyse dossier
  const [modalOpen, setModalOpen] = useState(false);
  const [folderToAnalyze, setFolderToAnalyze] = useState(null);

  const navigate = useNavigate();

  const styles = {
    page: {
      width: "100vw",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #d4f4dd 0%, #1b4d3e 100%)",
      color: "white",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: "60px 40px 40px 40px",
      boxSizing: "border-box",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      gap: "48px",
      flexWrap: "wrap",
    },
    filesListContainer: {
      flex: "1 1 280px",
      backgroundColor: "rgba(0,0,0,0.55)",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
      maxHeight: "70vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      userSelect: "none",
    },
    filesListTitle: {
      fontSize: "1.3rem",
      fontWeight: "700",
      borderBottom: "2px solid #1b4d3e",
      paddingBottom: "8px",
      marginBottom: "12px",
    },
    fileItem: {
      padding: "10px 14px",
      borderRadius: "10px",
      backgroundColor: "rgba(27, 77, 62, 0.8)",
      boxShadow: "inset 0 0 5px #2f8b6a",
      fontWeight: "600",
      fontSize: "0.95rem",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      transition: "background-color 0.3s ease",
      cursor: "pointer",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    fileItemHover: {
      backgroundColor: "rgba(27, 77, 62, 1)",
    },
    trashIcon: {
      marginLeft: "12px",
      color: "#e57373",
      cursor: "pointer",
      fontSize: "1.1rem",
      userSelect: "none",
    },
    container: {
      flex: "2 1 480px",
      backgroundColor: "rgba(0,0,0,0.55)",
      padding: "48px 40px",
      borderRadius: "20px",
      boxShadow: "0 6px 30px rgba(0,0,0,0.7)",
      maxWidth: "600px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      gap: "30px",
    },
    title: {
      fontSize: "2.5rem",
      fontWeight: "800",
      marginBottom: "8px",
      textShadow: "3px 3px 8px #000000",
      letterSpacing: "1.5px",
    },
    input: {
      color: "white",
      backgroundColor: "rgba(27, 77, 62, 0.9)",
      border: "none",
      padding: "14px 20px",
      fontSize: "1.1rem",
      borderRadius: "12px",
      outline: "none",
      cursor: "pointer",
      transition: "background-color 0.3s ease",
    },
    inputHover: {
      backgroundColor: "rgba(27, 77, 62, 1)",
    },
    button: {
      backgroundColor: "#1b4d3e",
      color: "white",
      padding: "16px",
      borderRadius: "12px",
      border: "none",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "1.1rem",
      width: "100%",
      boxShadow: "0 6px 15px rgba(27, 77, 62, 0.8)",
      transition: "background-color 0.3s ease, transform 0.2s ease",
      userSelect: "none",
    },
    buttonHover: {
      backgroundColor: "#16372e",
      transform: "scale(1.05)",
    },
    loader: {
      marginTop: "20px",
      fontStyle: "italic",
      color: "#c7e9c0",
    },
    message: {
      fontWeight: "600",
      fontSize: "1rem",
      color: "#c7e9c0",
      minHeight: "28px",
      marginTop: "10px",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },
    modalContent: {
      backgroundColor: "white",
      padding: "30px 40px",
      borderRadius: "16px",
      maxWidth: "400px",
      color: "#1b4d3e",
      textAlign: "center",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    },
    modalButtons: {
      marginTop: "20px",
      display: "flex",
      justifyContent: "space-around",
      gap: "20px",
    },
    modalButton: {
      padding: "10px 20px",
      borderRadius: "12px",
      border: "none",
      fontWeight: "700",
      cursor: "pointer",
    },
    modalButtonOk: {
      backgroundColor: "#1b4d3e",
      color: "white",
      transition: "background-color 0.3s ease",
    },
    modalButtonCancel: {
      backgroundColor: "#ccc",
      color: "#444",
    },
  };

  const fetchUserFolders = async () => {
    setLoadingFiles(true);
    setMessage("");
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setMessage("Erreur : utilisateur non authentifié.");
      setLoadingFiles(false);
      return;
    }
    try {
      // On suppose que l'API GET retourne un tableau des noms des sous-dossiers
      const response = await axios.get("http://localhost:8000/api/import/upload/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserFolders(response.data.folders || []); // changement clé à 'folders'
    } catch (error) {
      setMessage("Erreur lors de la récupération des dossiers.");
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchUserFolders();
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      alert("Vous ne pouvez importer que 10 fichiers maximum.");
      return;
    }
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      alert("Veuillez sélectionner au moins un fichier.");
      return;
    }
    if (!subfolderName.trim()) {
      alert("Veuillez saisir un nom de dossier.");
      return;
    }

    setUploading(true);
    setMessage("");
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Utilisateur non authentifié");
      setUploading(false);
      return;
    }
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    formData.append("subfolder", subfolderName.trim());

    try {
      await axios.post("http://localhost:8000/api/import/upload/", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage("Fichiers importés avec succès !");
      setSelectedFiles([]);
      setSubfolderName("");
      fetchUserFolders();
    } catch (error) {
      setMessage("Erreur lors de l'import des fichiers.");
    } finally {
      setUploading(false);
    }
  };

  // Supprimer un sous-dossier
  const handleDeleteFolder = async (folderName) => {
    if (!window.confirm(`Confirmez-vous la suppression du dossier "${folderName}" et de son contenu ?`)) {
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Utilisateur non authentifié");
      return;
    }
    try {
      await axios.delete(`http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(`Dossier "${folderName}" supprimé.`);
      fetchUserFolders();
    } catch (error) {
      setMessage(`Erreur lors de la suppression du dossier "${folderName}".`);
    }
  };

  // Ouvre modal analyse dossier
  const openModal = (folderName) => {
    setFolderToAnalyze(folderName);
    setModalOpen(true);
  };

  // Confirme l'analyse -> redirection
  const confirmAnalysis = () => {
    setModalOpen(false);
    navigate("/analyse", { state: { folder: folderToAnalyze } });
  };

  // Annule l'analyse modal
  const cancelAnalysis = () => {
    setModalOpen(false);
    setFolderToAnalyze(null);
  };

  return (
    <>
      <Header />
      <div style={styles.page}>
        <div style={styles.filesListContainer}>
          <h3 style={styles.filesListTitle}>Dossiers importés :</h3>
          {loadingFiles ? (
            <p style={styles.loader}>Chargement...</p>
          ) : userFolders.length === 0 ? (
            <p>Aucun dossier importé.</p>
          ) : (
            userFolders.map((folder, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.fileItem,
                  ...(hoveredFileIndex === idx ? styles.fileItemHover : {}),
                }}
                onMouseEnter={() => setHoveredFileIndex(idx)}
                onMouseLeave={() => setHoveredFileIndex(null)}
              >
                <span
                  onClick={() => openModal(folder)}
                  title={`Analyser le dossier "${folder}"`}
                  style={{ flex: 1, cursor: "pointer" }}
                >
                  📁 {folder}
                </span>
                <span
                  style={styles.trashIcon}
                  title={`Supprimer le dossier "${folder}"`}
                  onClick={() => handleDeleteFolder(folder)}
                >
                  🗑️
                </span>
              </div>
            ))
          )}
        </div>

        <div style={styles.container}>
          <h2 style={styles.title}>Importer des fichiers</h2>
          <input
            type="text"
            placeholder="Nom du sous-dossier"
            value={subfolderName}
            onChange={(e) => setSubfolderName(e.target.value)}
            style={{
              ...styles.input,
              ...(inputHovered ? styles.inputHover : {}),
            }}
            disabled={uploading}
            onMouseEnter={() => setInputHovered(true)}
            onMouseLeave={() => setInputHovered(false)}
          />
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            accept=".csv, .xlsx"
            style={{
              ...styles.input,
              marginTop: "16px",
              ...(inputHovered ? styles.inputHover : {}),
            }}
            disabled={uploading}
            onMouseEnter={() => setInputHovered(true)}
            onMouseLeave={() => setInputHovered(false)}
          />
          <button
            onClick={handleUpload}
            style={{
              ...styles.button,
              ...(buttonHovered ? styles.buttonHover : {}),
              marginTop: "20px",
            }}
            disabled={uploading || !subfolderName.trim()}
            onMouseEnter={() => setButtonHovered(true)}
            onMouseLeave={() => setButtonHovered(false)}
          >
            {uploading ? "Importation en cours..." : "Importer"}
          </button>
          {message && <p style={styles.message}>{message}</p>}
        </div>
      </div>

      {/* Modal analyse dossier */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <p>Analyser vos données dans le dossier : <strong>{folderToAnalyze}</strong> ?</p>
            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonOk }}
                onClick={confirmAnalysis}
                autoFocus
              >
                OK
              </button>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonCancel }}
                onClick={cancelAnalysis}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
