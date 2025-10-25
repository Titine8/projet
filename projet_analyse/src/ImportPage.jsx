import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid"; // pour id unique des lignes de relation

// ---------------- Header ----------------
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
      background: "linear-gradient(to right, #00074d, #00bcd4)",
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
      backgroundColor: "#fff",
      border: "none",
      borderRadius: "4px",
      color: "#00074d",
      padding: "8px 16px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "0.9rem",
      transition: "all 0.2s ease",
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
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#cfe3f2")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
      >
        Déconnexion
      </button>
    </div>
  );
}

// ---------------- ImportPage ----------------
export default function ImportPage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [userFolders, setUserFolders] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [hoveredFileIndex, setHoveredFileIndex] = useState(null);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [inputHovered, setInputHovered] = useState(false);
  const [subfolderName, setSubfolderName] = useState("");
  const [openFolders, setOpenFolders] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [folderToAnalyze, setFolderToAnalyze] = useState(null);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [fileColumns, setFileColumns] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  const [relationsLocked, setRelationsLocked] = useState(false);
  const [cibleValidated, setCibleValidated] = useState(false);
  const [cibleMessage, setCibleMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ type: "", name: "", folder: "", action: null });
  const [relations, setRelations] = useState([
    { id: uuidv4(), fichier1: "", colonne1: "", fichier2: "", colonne2: "" },
  ]);
  const [showCible, setShowCible] = useState(false);
  const [cible, setCible] = useState("");
  const [columns, setColumns] = useState([]);
  const [singleFileModalOpen, setSingleFileModalOpen] = useState(false); // Nouvel état pour le modal single file

  // Quand les relations sont validées
  const handleRelationsValidated = (columnsList) => {
    setColumns(columnsList);
    setShowCible(true);
  };

  const navigate = useNavigate();

  const addRelation = () => {
    setRelations((prev) => [
      ...prev,
      { id: uuidv4(), fichier1: "", colonne1: "", fichier2: "", colonne2: "" },
    ]);
  };

  const updateRelation = (id, field, value) => {
    setRelations((prev) =>
      prev.map((rel) =>
        rel.id === id ? { ...rel, [field]: value } : rel
      )
    );
  };

  const styles = {
    page: {
      width: "100vw",
      minHeight: "100vh",
      backgroundColor: "#e6f2f8",
      color: "#333",
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
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
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
      borderBottom: "2px solid #00074d",
      paddingBottom: "8px",
      marginBottom: "12px",
      color: "#00074d",
    },
    fileItem: {
      padding: "10px 14px",
      borderRadius: "6px",
      backgroundColor: "#cfe3f2",
      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
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
      color: "#00074d",
    },
    fileItemHover: {
      backgroundColor: "#00074d",
      color: "white",
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
      backgroundColor: "white",
      padding: "30px",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      maxWidth: "600px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    title: {
      fontSize: "2rem",
      fontWeight: "700",
      marginBottom: "8px",
      color: "#00074d",
      letterSpacing: "1px",
    },
    input: {
      color: "#333",
      backgroundColor: "#f5f5f5",
      border: "2px solid #cfe3f2",
      padding: "12px 16px",
      fontSize: "1rem",
      borderRadius: "6px",
      outline: "none",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    inputHover: {
      borderColor: "#00074d",
      backgroundColor: "#fff",
    },
    button: {
      backgroundColor: "#00074d",
      color: "white",
      padding: "12px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "1rem",
      width: "100%",
      boxShadow: "0 2px 4px rgba(0,7,77,0.3)",
      transition: "all 0.3s ease",
      userSelect: "none",
    },
    buttonHover: {
      backgroundColor: "#00bcd4",
      transform: "scale(1.02)",
    },
    loader: {
      marginTop: "20px",
      fontStyle: "italic",
      color: "#00074d"
    },
    message: {
      fontWeight: "600",
      fontSize: "1rem",
      color: "#00074d",
      minHeight: "28px",
      marginTop: "10px"
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
      zIndex: 2000
    },
    modalContent: {
      backgroundColor: "white",
      padding: "30px",
      borderRadius: "12px",
      maxWidth: "800px",
      minWidth: "600px",
      color: "#00074d",
      textAlign: "center",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
    },
    modalButtons: {
      marginTop: "20px",
      display: "flex",
      justifyContent: "space-around",
      gap: "20px"
    },
    modalButton: {
      padding: "10px 20px",
      borderRadius: "6px",
      border: "none",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease"
    },
    modalButtonOk: {
      backgroundColor: "#00074d",
      color: "white",
    },
    modalButtonCancel: {
      backgroundColor: "#cfe3f2",
      color: "#00074d"
    },
  };

  // ---------------- API ----------------
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
      const response = await axios.get("http://localhost:8000/api/import/upload/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserFolders(response.data.folders || []);
    } catch (error) {
      setMessage("Erreur lors de la récupération des dossiers.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchFolderFiles = async (folderName) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (openFolders[folderName]) {
      setOpenFolders((prev) => ({ ...prev, [folderName]: null }));
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/files/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOpenFolders((prev) => ({ ...prev, [folderName]: response.data.files || [] }));
    } catch (error) {
      setMessage("Erreur lors de la récupération des fichiers.");
    }
  };

  const handleDeleteFolder = async (folderName) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      await axios.delete(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`Dossier "${folderName}" supprimé.`);
      setOpenFolders((prev) => ({ ...prev, [folderName]: null }));
      fetchUserFolders();
    } catch (error) {
      setMessage(`Erreur lors de la suppression du dossier "${folderName}".`);
    }
  };

  const handleDeleteFile = async (folderName, fileName) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      await axios.delete(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOpenFolders((prev) => ({ ...prev, [folderName]: prev[folderName].filter((f) => f !== fileName) }));
    } catch (error) {
      setMessage(`Erreur lors de la suppression du fichier "${fileName}".`);
    }
  };

  const confirmDeletion = () => {
    if (confirmAction.action) confirmAction.action();
    setConfirmOpen(false);
  };

  const cancelDeletion = () => setConfirmOpen(false);

  const fetchColumnsForFile = async (folderName, fileName) => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await axios.get(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}/columns/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFileColumns(prev => ({
        ...prev,
        [fileName]: res.data.columns || []
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      alert("Vous ne pouvez importer que 10 fichiers maximum.");
      return;
    }
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !subfolderName.trim()) {
      alert("Veuillez sélectionner fichiers et dossier.");
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
          "Content-Type": "multipart/form-data"
        }
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
  }

  // ---------------- MODAL ANALYSE ----------------
  const openModal = async (folderName) => {
  setFolderToAnalyze(folderName);
  const token = localStorage.getItem("accessToken");
  if (!token) return;

  try {
    const res = await axios.get(
      `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/files/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const files = res.data.files || [];

    // Si un seul fichier
    if (files.length === 1) {
      setSingleFileModalOpen(true);
      const uniqueFile = files[0];
      const resCols = await axios.get(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/${encodeURIComponent(uniqueFile)}/columns/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setColumns(resCols.data.columns || []);
      setCible("");
      setShowCible(true);
      return;
    }

    // Plusieurs fichiers → modal normal
    setModalOpen(true);
    setModalLoading(true);
    setAvailableFiles(files);

    // 🔹 Étape 1 : vérifier relations existantes
    let checkRes = await axios.get(
      `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/check_relations_file/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!checkRes.data.exists) {
      // 🔹 Étape 2 : créer les relations si pas existantes
      await axios.post(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/relations/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 🔹 Étape 3 : rappeler check_relations pour récupérer les relations créées
      checkRes = await axios.get(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/check_relations_file/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    // 🔹 Étape 4 : utiliser les relations
    setRelations(
      checkRes.data.relations.map(r => ({ ...r, id: uuidv4() }))
    );
    setRelationsLocked(false);

    // 🔹 Récupérer la cible si déjà définie
    try {
      const cibleRes = await axios.get(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/get_cible/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cibleRes.data.cible) {
        setCible(cibleRes.data.cible);
        setColumns([cibleRes.data.cible]);
        setShowCible(true);
      }
    } catch (err) {
      console.error("Erreur récupération cible:", err);
    }

    // 🔹 Charger les colonnes pour tous les fichiers
    const columnsData = await Promise.all(
      files.map(async (file) => {
        const res = await axios.get(
          `http://localhost:8000/api/import/folder/${encodeURIComponent(folderName)}/${encodeURIComponent(file)}/columns/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return { file, columns: res.data.columns || [] };
      })
    );

    const newFileColumns = {};
    columnsData.forEach(cd => { newFileColumns[cd.file] = cd.columns });
    setFileColumns(newFileColumns);

  } catch (err) {
    console.error(err);
    setAvailableFiles([]);
    setRelations([{ id: uuidv4(), fichier1: "", colonne1: "", fichier2: "", colonne2: "" }]);
  } finally {
    setModalLoading(false);
  }
};



  const confirmAnalysis = () => {
    if (!cible) {
    alert("Veuillez choisir une colonne cible avant d'analyser.");
    return;
  }
    setModalOpen(false);
    const username = localStorage.getItem("username");
    navigate(`/analyse/${encodeURIComponent(username)}/${encodeURIComponent(folderToAnalyze)}`);
  };

  const cancelAnalysis = () => {
    setModalOpen(false);
    setFolderToAnalyze(null);
  };

  useEffect(() => {
    fetchUserFolders();
  }, []);

  // ---------------- RENDER ----------------
  return (
    <>
      <Header />
      <div style={styles.page}>
        {/* ---------- Liste dossiers ---------- */}
        <div style={styles.filesListContainer}>
          <h3 style={styles.filesListTitle}>Dossiers importés :</h3>
          {loadingFiles ? (
            <p style={styles.loader}>Chargement...</p>
          ) : userFolders.length === 0 ? (
            <p>Aucun dossier importé.</p>
          ) : (
            userFolders.map((folder, idx) => (
              <div key={idx}>
                <div
                  style={{
                    ...styles.fileItem,
                    ...(hoveredFileIndex === idx ? styles.fileItemHover : {}),
                  }}
                  onMouseEnter={() => setHoveredFileIndex(idx)}
                  onMouseLeave={() => setHoveredFileIndex(null)}
                >
                  <span
                    onClick={() => fetchFolderFiles(folder)}
                    style={{ flex: 1, cursor: "pointer" }}
                  >
                    📁 {folder}
                  </span>
                  <span
                    style={styles.trashIcon}
                    onClick={() => {
                      setConfirmOpen(true);
                      setConfirmAction({
                        type: "folder",
                        name: folder,
                        action: () => handleDeleteFolder(folder),
                      });
                    }}
                  >
                    🗑️
                  </span>
                </div>

                {openFolders[folder] && (
                  <div
                    style={{
                      marginLeft: "16px",
                      marginTop: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {openFolders[folder].map((file, fIdx) => (
                      <div
                        key={fIdx}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "6px",
                          backgroundColor: "#f5f5f5",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: "#00074d", fontWeight: 600 }}>
                          {file}
                        </span>
                        <span
                          style={{ ...styles.trashIcon, color: "#00074d" }}
                          onClick={() => {
                            setConfirmOpen(true);
                            setConfirmAction({
                              type: "file",
                              name: file,
                              folder: folder,
                              action: () => handleDeleteFile(folder, file),
                            });
                          }}
                        >
                          🗑️
                        </span>
                      </div>
                    ))}
                    {openFolders[folder].length > 0 && (
                      <button
                        style={{
                          ...styles.button,
                          marginTop: "8px",
                          fontSize: "0.95rem",
                          padding: "8px",
                          border: "2px solid #00074d",
                          backgroundColor: "#00074d",
                        }}
                        onClick={() => openModal(folder)}
                      >
                        Analyser ce dossier
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ---------- Upload ---------- */}
        <div style={styles.container}>
          <h2 style={styles.title}>Importer des fichiers</h2>
          <input
            type="text"
            placeholder="Nom du sous-dossier"
            value={subfolderName}
            onChange={(e) => setSubfolderName(e.target.value)}
            style={{ ...styles.input, ...(inputHovered ? styles.inputHover : {}) }}
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

      {/* ---------- Modal analyse (pour fichiers multiples) ---------- */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div
            style={{
              ...styles.modalContent,
              maxWidth: "800px",
              width: "90%",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  color: "#00074d",
                }}
              >
                ✖
              </button>
            </div>
            <p>
              Analyser vos données dans le dossier : <strong>{folderToAnalyze}</strong>
            </p>

            {/* Loader si fichiers/colonnes pas encore chargés */}
            {modalLoading ? (
              <p style={{ fontStyle: "italic", color: "#00074d", marginTop: "20px" }}>
                Chargement des fichiers et colonnes...
              </p>
            ) : (
              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {relations.map((rel) => (
                  <div
                    key={rel.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr auto 1fr 1fr auto",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    {/* Fichier 1 */}
                    <select
                      value={rel.fichier1}
                      onChange={(e) => {
                        updateRelation(rel.id, "fichier1", e.target.value);
                        fetchColumnsForFile(folderToAnalyze, e.target.value);
                      }}
                      disabled={relationsLocked}
                      style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "2px solid #cfe3f2",
                        backgroundColor: "#f5f5f5",
                      }}
                    >
                      <option value="" disabled>Fichier 1</option>
                      {availableFiles.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>

                    {/* Colonne 1 */}
                    <select
                      value={rel.colonne1}
                      onChange={(e) => updateRelation(rel.id, "colonne1", e.target.value)}
                      disabled={relationsLocked || !rel.fichier1}
                      style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "2px solid #cfe3f2",
                        backgroundColor: "#f5f5f5",
                      }}
                    >
                      <option value="" disabled>Colonne 1</option>
                      {(fileColumns[rel.fichier1] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    =

                    {/* Fichier 2 */}
                    <select
                      value={rel.fichier2}
                      onChange={(e) => {
                        updateRelation(rel.id, "fichier2", e.target.value);
                        fetchColumnsForFile(folderToAnalyze, e.target.value);
                      }}
                      disabled={relationsLocked}
                      style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "2px solid #cfe3f2",
                        backgroundColor: "#f5f5f5",
                      }}
                    >
                      <option value="" disabled>Fichier 2</option>
                      {availableFiles.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>

                    {/* Colonne 2 */}
                    <select
                      value={rel.colonne2}
                      onChange={(e) => updateRelation(rel.id, "colonne2", e.target.value)}
                      disabled={relationsLocked || !rel.fichier2}
                      style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "2px solid #cfe3f2",
                        backgroundColor: "#f5f5f5",
                      }}
                    >
                      <option value="" disabled>Colonne 2</option>
                      {(fileColumns[rel.fichier2] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <button
                      onClick={() => setRelations((prev) => prev.filter((r) => r.id !== rel.id))}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#e53935",
                        fontSize: "1.2rem",
                        cursor: relationsLocked ? "not-allowed" : "pointer",
                      }}
                      disabled={relationsLocked} // 🔒
                    >
                      ❌
                    </button>
                  </div>
                ))}

                {/* Ajouter une relation */}
                {!relationsLocked && (
                  <button
                    onClick={addRelation}
                    style={{
                      marginTop: "8px",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: "#00074d",
                      color: "white",
                      fontWeight: "600",
                    }}
                  >
                    ➕ Ajouter une relation
                  </button>
                )}

                {!relationsLocked && (
                  <button
                    onClick={async () => {
                      const incomplete = relations.some(
                        (r) => !r.fichier1 || !r.colonne1 || !r.fichier2 || !r.colonne2
                      );
                      if (incomplete) {
                        alert("Veuillez remplir toutes les relations avant de valider !");
                        return;
                      }

                      const dataToSave = relations.map((r) => ({
                        fichier1: r.fichier1,
                        colonne1: r.colonne1,
                        fichier2: r.fichier2,
                        colonne2: r.colonne2,
                      }));

                      const token = localStorage.getItem("accessToken");
                      try {
                        const response = await axios.post(
                          `http://localhost:8000/api/import/folder/${encodeURIComponent(folderToAnalyze)}/save_relations/`,
                          { relations: dataToSave },
                          {
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                          }
                        );

                        // Colonnes du fichier combiné
                        const combinedColumns = response.data.columns || [];
                        // Affiche ces colonnes dans le select "cible"
                        handleRelationsValidated(combinedColumns);
                      } catch (err) {
                        console.error(err);
                        alert("Erreur lors de la sauvegarde des relations !");
                      }
                    }}
                    style={{
                      marginTop: "12px",
                      padding: "10px 20px",
                      borderRadius: "6px",
                      border: "2px solid #00074d",
                      cursor: "pointer",
                      backgroundColor: "white",
                      color: "#00074d",
                      fontWeight: "600",
                    }}
                  >
                    ✅ Valider mes relations
                  </button>
                )}
              </div>
            )}

            {showCible && (
              <div style={{ marginTop: "20px" }}>
                <label>Choisir la colonne cible:</label>
                <select
                  value={cible}
                  onChange={(e) => setCible(e.target.value)}
                  disabled={relationsLocked}
                  style={{
                    marginLeft: "12px",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "2px solid #00074d",
                    backgroundColor: "#f5f5f5",
                    color: "#333",
                    fontWeight: "600",
                    cursor: relationsLocked ? "not-allowed" : "pointer",
                    transition: "background-color 0.3s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#fff"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                >
                  <option value="" disabled>-- Choisir --</option>
                  {columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>

                {!relationsLocked && (
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem("accessToken");
                      try {
                        await axios.post(
                          `http://localhost:8000/api/import/folder/${encodeURIComponent(folderToAnalyze)}/save_cible/`,
                          { cible },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setCibleMessage("✅ Cible validée !");
                        setCibleValidated(false); // rend le bouton non cliquable
                      } catch (err) {
                        console.error(err);
                        setCibleMessage("❌ Erreur lors de la validation !");
                      }
                    }}
                    disabled={cibleValidated} // rend le bouton non cliquable si déjà validé
                    style={{
                      marginLeft: "12px",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "2px solid #00074d",
                      backgroundColor: "white",
                      color: "#00074d",
                      fontWeight: "600",
                      cursor: cibleValidated ? "not-allowed" : "pointer",
                    }}
                  >
                    Valider la cible
                  </button>
                )}
              </div>
            )}

            {/* --- Message de confirmation --- */}
            {cibleMessage && (
              <span style={{ marginLeft: "12px", fontWeight: "600", color: "#00074d" }}>
                {cibleMessage}
              </span>
            )}

            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonOk }}
                onClick={confirmAnalysis}
                autoFocus
                disabled={modalLoading}
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

      {/* ---------- Modal single file ---------- */}
      {singleFileModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSingleFileModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  color: "#00074d",
                }}
              >
                ✖
              </button>
            </div>
            
            <p>Vous avez sélectionné un dossier avec un seul fichier pour l'analyse.</p>

            {/* Affiche "Chargement..." tant que les colonnes ne sont pas encore disponibles */}
{columns.length === 0 && (
  <p style={{ fontStyle: "italic", color: "#00074d", marginTop: "12px" }}>
    Préparation des colonnes...
  </p>
)}

{/* Affiche le select seulement quand les colonnes sont chargées */}
{columns.length > 0 && (
  <div style={{ marginTop: "20px" }}>
    <label>Choisir la colonne cible:</label>
    <select
      value={cible}
      onChange={(e) => setCible(e.target.value)}
      style={{
        marginLeft: "12px",
        padding: "10px 14px",
        borderRadius: "6px",
        border: "2px solid #00074d",
        backgroundColor: "#f5f5f5",
        color: "#333",
        fontWeight: "600",
      }}
    >
      <option value="" disabled>-- Choisir --</option>
      {columns.map(col => <option key={col} value={col}>{col}</option>)}
    </select>

    <button
      onClick={async () => {
        const token = localStorage.getItem("accessToken");
        try {
          await axios.post(
            `http://localhost:8000/api/import/folder/${encodeURIComponent(folderToAnalyze)}/save_cible/`,
            { cible },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setCibleMessage("✅ Cible validée !");
          setCibleValidated(true);
        } catch (err) {
          console.error(err);
          setCibleMessage("❌ Erreur lors de la validation !");
        }
      }}
      disabled={cibleValidated}
      style={{
        marginLeft: "12px",
        padding: "8px 16px",
        borderRadius: "6px",
        border: "2px solid #00074d",
        backgroundColor: "white",
        color: "#00074d",
        fontWeight: "600",
        cursor: cibleValidated ? "not-allowed" : "pointer",
      }}
    >
      Valider la cible
    </button>
  </div>
)}


            {cibleMessage && (
              <span style={{ marginLeft: "12px", fontWeight: "600", color: "#00074d" }}>
                {cibleMessage}
              </span>
            )}

            <div style={styles.modalButtons}>
              <button
  style={{ ...styles.modalButton, ...styles.modalButtonOk }}
  onClick={async () => {
    if (!cible) {
      alert("Veuillez choisir et valider une colonne cible avant d'analyser.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    try {
      // ⚡ Appel à l'endpoint prepare_single_combined
      await axios.post(
        `http://localhost:8000/api/import/folder/${encodeURIComponent(folderToAnalyze)}/prepare_single_combined/`,
        {}, // pas de body nécessaire
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSingleFileModalOpen(false);
      const username = localStorage.getItem("username");
      navigate(`/analyse/${encodeURIComponent(username)}/${encodeURIComponent(folderToAnalyze)}`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la préparation du fichier combiné !");
    }
  }}
>
  Analyser
</button>

              <button
                style={{ ...styles.modalButton, ...styles.modalButtonCancel }}
                onClick={() => setSingleFileModalOpen(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal confirmation suppression ---------- */}
      {confirmOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <p>
              Confirmez la suppression {confirmAction.type === "folder" ? "du dossier" : "du fichier"} :{" "}
              <strong>{confirmAction.name}</strong> ?
            </p>
            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonOk }}
                onClick={confirmDeletion}
                autoFocus
              >
                OK
              </button>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonCancel }}
                onClick={cancelDeletion}
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