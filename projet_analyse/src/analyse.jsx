import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, differenceInDays } from "date-fns";


export default function Analyse() {
  const { username, folder } = useParams();
  const decodedUsername = decodeURIComponent(username);
  const decodedFolder = decodeURIComponent(folder);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState(null);


  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    fetchFile();
  }, []);

  const fetchFile = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/statistique/files/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { username: decodedUsername, folder: decodedFolder }
      });

      const targetFile = (res.data.files || []).find(f => f.startsWith("file_"));
      setFile(targetFile || null);
      if (targetFile) {
        const done = await fetchStats(targetFile);
        if (done) getStats(targetFile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (fileName) => {
    if (stats[fileName]) return;
    try {
      await axios.post(
        `http://localhost:8000/api/statistique/${encodeURIComponent(decodedUsername)}/${encodeURIComponent(decodedFolder)}/${encodeURIComponent(fileName)}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const getStats = async (fileName) => {
  try {
    const res = await axios.get(
      `http://localhost:8000/api/statistique/${encodeURIComponent(decodedUsername)}/${encodeURIComponent(decodedFolder)}/stats-json/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log("=== DEBUG STATS ===");
    console.log("Type de res.data:", typeof res.data);
    console.log("res.data:", res.data);
    console.log("=== FIN DEBUG ===");
    
    let statsData = [];
    let rawData = res.data;

    // Si c'est une string, essayez de la parser en gérant les NaN
    if (typeof rawData === 'string') {
      try {
        // Remplacer NaN par null avant le parsing
        const cleanedJsonString = rawData.replace(/NaN/g, 'null');
        rawData = JSON.parse(cleanedJsonString);
      } catch (e) {
        console.error("Échec parsing JSON:", e);
        // Si le parsing échoue, essayez une méthode plus agressive
        try {
          // Essayez d'extraire le JSON de la string
          const jsonMatch = rawData.match(/\[.*\]/s);
          if (jsonMatch) {
            const cleaned = jsonMatch[0].replace(/NaN/g, 'null');
            rawData = JSON.parse(cleaned);
          }
        } catch (e2) {
          console.error("Échec méthode alternative:", e2);
        }
      }
    }

    // Extraire le tableau des stats
    if (Array.isArray(rawData)) {
      statsData = rawData;
    } else if (rawData && typeof rawData === 'object') {
      // Chercher n'importe quelle propriété qui est un array
      for (let key in rawData) {
        if (Array.isArray(rawData[key])) {
          statsData = rawData[key];
          break;
        }
      }
    }

    // Filtrer pour garder seulement les objets avec nom_colonne
    statsData = statsData.filter(item => 
      item && typeof item === 'object' && item.nom_colonne
    );

    console.log("statsData final:", statsData);
    setStats(prev => ({ ...prev, [fileName]: statsData }));
    
  } catch (err) {
    console.error("Erreur récupération stats:", err);
  }
};

  const formatNumber = (value) => {
    return value != null && !isNaN(value) ? Number(value).toFixed(2) : value ?? "-";
  };

  const formatType = (type) => {
    if (type === "num") return "Numérique";
    if (type === "cat") return "Catégorielle";
    if (type === "date") return "Date";
    return type;
  };

  const getKeyValue = (col) => {
    if (col.type_colonne === "num") return formatNumber(col.total ?? "-");
    if (col.type_colonne === "cat") return col.mode_val ?? "-";
    if (col.type_colonne === "date") {
      if (col.frequence_par_periode && typeof col.frequence_par_periode === "object") {
        const entries = Object.entries(col.frequence_par_periode);
        if (entries.length > 0) return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
      }
      return "-";
    }
    return "-";
  };

  

  const menuButtons = [
    { id: "statistique", label: "Statistique descriptive", action: () => navigate(`/analyse/${username}/${folder}`) },
    { id: "visualisation", label: "Visualisation", action: () => navigate(`/visualisation/${username}/${folder}`) },
    { id: "analyse", label: "Analyse de donnée", action: () => navigate(`/analysetab/${username}/${folder}`) },
    { id: "prediction", label: "Prédiction", action: () => navigate(`/prediction/${username}/${folder}`) },
  ];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1>📊 Statistique descriptive sur les données</h1>
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
              backgroundColor: btn.id === "statistique" ? "#00074d" : "#cfe3f2",
              color: btn.id === "statistique" ? "white" : "#00074d"
            }}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      <div style={styles.mainContainer}>
        <main style={styles.content}>
          {loading ? (
            <p style={styles.loading}>Chargement des statistiques...</p>
          ) : file && stats[file] && Array.isArray(stats[file]) ? (
            <div style={styles.cardsContainer}>
              {stats[file].map((col, index) => {
                const keyValue = getKeyValue(col);
                const keyColor =
                  col.type_colonne === "num"
                    ? "#00074d"
                    : col.type_colonne === "cat"
                      ? "#00bcd4"
                      : "#3399cc";
                return (
                  <div
                    key={index}
                    style={styles.card}
                    onClick={() => setModalData(col)}
                  >
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{col.nom_colonne}</h3>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: keyColor
                        }}
                      >
                        {formatType(col.type_colonne)}
                      </span>
                    </div>

                    <div style={styles.cardContent}>
                      {col.type_colonne === "num" && (
                        <>
                          <p>
                            <strong>Total : </strong>
                            <span style={{ color: keyColor, fontWeight: "700" }}>{keyValue}</span>
                          </p>
                          <p>Min : {formatNumber(col.min_val)}</p>
                          <p>Max : {formatNumber(col.max_val)}</p>
                          <p>Moyenne : {formatNumber(col.moyenne)}</p>
                          <p>Médiane : {formatNumber(col.mediane)}</p>
                          <p>Écart-type : {formatNumber(col.ecart_type)}</p>
                          <p>Variance : {formatNumber(col.variance)}</p>
                        </>
                      )}

                      {col.type_colonne === "cat" && (
                        <>
                          <p>
                            <strong>Mode : </strong>
                            <span style={{ color: keyColor, fontWeight: "700" }}>{keyValue}</span>
                          </p>
                          <p>Catégories uniques : {col.nb_categories_uniques}</p>

                          {col.frequence && col.frequence !== "N/A" && (
                            <div style={{ marginTop: "10px" }}>
                              <strong>Fréquence des catégories :</strong>
                              <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                                {Object.entries(col.frequence)
                                  .slice(0, 5)
                                  .map(([categorie, freq]) => (
                                    <li key={categorie}>
                                      {categorie} : {freq} %
                                    </li>
                                  ))}
                                {Object.keys(col.frequence).length > 5 && <li>…</li>}
                              </ul>
                            </div>
                          )}
                        </>
                      )}

                      {col.type_colonne === "date" && (
                        <>
                          <p>
                            <strong>📅 Période la plus active : </strong>
                            <span style={{ color: keyColor, fontWeight: "700" }}>{keyValue}</span>
                          </p>
                          <p>
                            <strong>📅 Première date : </strong>
                            {format(new Date(col.premiere_date), "d MMM yyyy")}
                          </p>
                          <p>
                            <strong>📅 Dernière date : </strong>
                            {format(new Date(col.derniere_date), "d MMM yyyy")}
                          </p>
                          <p>
                            <strong>⏰ Durée totale : </strong>
                            <span style={{ color: keyColor, fontWeight: "700" }}>{col.intervalle_total}</span>
                          </p>
                        </>
                      )}

                      {col.type_colonne === "time" && (
                        <>
                          <p>
                            <strong>🕒 Première heure : </strong>{col.premiere_heure}
                          </p>
                          <p>
                            <strong>🕒 Dernière heure : </strong>{col.derniere_heure}
                          </p>
                          <p>
                            <strong>⏳ Plage totale : </strong>{col.plage_heure}
                          </p>
                        </>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <p></p>
          )}

          {/* Modal */}
          {modalData && (
            <div
              style={styles.modalOverlay}
              onClick={() => setModalData(null)}
            >
              <div
                style={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Croix pour fermer */}
                <span
                  style={styles.closeCross}
                  onClick={() => setModalData(null)}
                >
                  ×

                  <br />
                  <br />
                </span>

                {/* Header : nom colonne à gauche, type à droite */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h2 style={{ color: "#00074d", margin: 0 }}>{modalData.nom_colonne}</h2>
                  <span style={{
                    ...styles.badge,
                    backgroundColor:
                      modalData.type_colonne === "num"
                        ? "#00074d"
                        : modalData.type_colonne === "cat"
                          ? "#00bcd4"
                          : "#3399cc"
                  }}>
                    {formatType(modalData.type_colonne)}
                  </span>
                </div>


                {/* Histogramme de distribution */}


                {modalData.type_colonne === "num" && modalData.distribution && modalData.distribution !== "N/A" && (
                  <div style={styles.section}>
                    <div style={{ width: "100%", height: 150, marginTop: "10px" }}>
                      <ResponsiveContainer>
                        <LineChart
                          data={Object.entries(modalData.distribution)
                            .map(([interval, count]) => {
                              const nums = interval.match(/[\d.]+/g).map(Number);
                              const x = (nums[0] + nums[1]) / 2; // centre de l'intervalle
                              return { x, y: count };
                            })
                            .sort((a, b) => a.x - b.x)}
                        >
                          <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="y" stroke="#00074d" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}


                {/* Infos générales */}
                <div style={styles.section}>

                  <p><strong>Folder :</strong> {modalData.folder}</p>
                  <p><strong>Valeurs manquantes :</strong> {formatNumber(modalData.nb_valeurs_manquantes)}</p>
                  <p><strong>Valeurs non manquantes :</strong> {formatNumber(modalData.nb_valeurs_non_manquantes)}</p>
                </div>





                {/* Stats principales */}
                <div style={styles.section}>
                  {modalData.type_colonne === "num" && (
                    <>
                      <p><strong>Min :</strong> {formatNumber(modalData.min_val)}</p>
                      <p><strong>Max :</strong> {formatNumber(modalData.max_val)}</p>
                      <p><strong>Moyenne :</strong> {formatNumber(modalData.moyenne)}</p>
                      <p><strong>Médiane :</strong> {formatNumber(modalData.mediane)}</p>
                      <p><strong>Écart-type :</strong> {formatNumber(modalData.ecart_type)}</p>
                      <p><strong>Variance :</strong> {formatNumber(modalData.variance)}</p>
                      <p>
                        <strong>Total :</strong>{" "}
                        <span style={{ color: "#00074d", fontWeight: "700" }}>
                          {formatNumber(modalData.total)}
                        </span>
                      </p>
                    </>
                  )}




                  {modalData.type_colonne === "cat" && (
                    <>
                      <p><strong>Nb catégories uniques :</strong> {modalData.nb_categories_uniques}</p>
                      <p>
                        <strong>Mode :</strong>{" "}
                        <span style={{ color: "#00bcd4", fontWeight: "700" }}>
                          {modalData.mode_val}
                        </span>
                      </p>

                      {modalData.frequence && modalData.frequence !== "N/A" && (
                        <div style={{ marginTop: "10px", height: "200px" }}>
                          <strong>Fréquence des catégories :</strong>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Object.entries(modalData.frequence).map(([categorie, freq]) => ({
                                categorie,
                                freq,
                              }))}
                              margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                            >
                              <XAxis dataKey="categorie" />
                              <YAxis unit="%" />
                              <Tooltip />
                              <Bar dataKey="freq" fill="#00bcd4" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}






                  {modalData.type_colonne === "date" && (
                    <>
                      <p>
                        <strong>📅 Première date :</strong>{" "}
                        {modalData.premiere_date
                          ? format(new Date(modalData.premiere_date), "d MMM yyyy")
                          : "N/A"}
                      </p>
                      <p>
                        <strong>📅 Dernière date :</strong>{" "}
                        {modalData.derniere_date
                          ? format(new Date(modalData.derniere_date), "d MMM yyyy")
                          : "N/A"}
                      </p>
                      <p>
                        <strong>⏰ Durée totale :</strong>{" "}
                        <span style={{ color: "#00074d", fontWeight: "700" }}>
                          {modalData.intervalle_total}
                        </span>
                      </p>

                      {modalData.premiere_date && modalData.derniere_date && (
                        <div
                          style={{
                            marginTop: "10px",
                            height: "120px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontSize: "12px" }}>
                            {format(new Date(modalData.derniere_date), "d MMM yyyy")}
                          </span>
                          <div
                            style={{
                              width: "4px",
                              backgroundColor: "#3399cc",
                              flexGrow: 1,
                              borderRadius: "2px",
                            }}
                          ></div>
                          <span style={{ fontSize: "12px" }}>
                            {format(new Date(modalData.premiere_date), "d MMM yyyy")}
                          </span>
                        </div>
                      )}
                    </>
                  )}


                  {modalData.type_colonne === "time" && (
                    <div style={styles.section}>
                      <p><strong>Première heure :</strong> {modalData.premiere_heure}</p>
                      <p><strong>Dernière heure :</strong> {modalData.derniere_heure}</p>
                      <p><strong>Plage totale :</strong> {modalData.plage_heure}</p>
                      <p><strong>Heure moyenne :</strong> {modalData.moyenne_heure}</p>
                      <p><strong>Mode :</strong> {modalData.mode_heure}</p>

                      {modalData.distribution_par_heure && (
                        <div style={{ width: "100%", height: 150, marginTop: "10px" }}>
                          <ResponsiveContainer>
                            <BarChart
                              data={Object.entries(modalData.distribution_par_heure).map(([h, v]) => ({ heure: h, count: v }))}
                            >
                              <XAxis dataKey="heure" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#3399cc" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}

                </div>




                {/* Quartiles → mini box plot */}
                {modalData.type_colonne === "num" && modalData.quartile && (
                  <div style={styles.section}>
                    <strong>Quartiles :</strong>
                    <div style={{ position: "relative", height: "20px", background: "#e0e0e0", borderRadius: "10px", marginTop: "5px" }}>
                      {/* Q1 */}
                      <div style={{
                        position: "absolute",
                        left: `${((modalData.quartile.Q1 - modalData.min_val) / (modalData.max_val - modalData.min_val)) * 100}%`,
                        width: "2px",
                        height: "100%",
                        backgroundColor: "#00074d"
                      }}>
                        <span style={{ position: "absolute", top: "-18px", fontSize: "10px", color: "#00074d", transform: "translateX(-50%)" }}>
                          {formatNumber(modalData.quartile.Q1)}
                        </span>
                      </div>

                      {/* Q2 / médiane */}
                      <div style={{
                        position: "absolute",
                        left: `${((modalData.quartile.Q2 - modalData.min_val) / (modalData.max_val - modalData.min_val)) * 100}%`,
                        width: "2px",
                        height: "100%",
                        backgroundColor: "#00bcd4"
                      }}>
                        <span style={{ position: "absolute", top: "-18px", fontSize: "10px", color: "#00bcd4", transform: "translateX(-50%)" }}>
                          {formatNumber(modalData.quartile.Q2)}
                        </span>
                      </div>

                      {/* Q3 */}
                      <div style={{
                        position: "absolute",
                        left: `${((modalData.quartile.Q3 - modalData.min_val) / (modalData.max_val - modalData.min_val)) * 100}%`,
                        width: "2px",
                        height: "100%",
                        backgroundColor: "#3399cc"
                      }}>
                        <span style={{ position: "absolute", top: "-18px", fontSize: "10px", color: "#3399cc", transform: "translateX(-50%)" }}>
                          {formatNumber(modalData.quartile.Q3)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "3px" }}>
                      <span>Min</span>
                      <span>Q1</span>
                      <span>Q2</span>
                      <span>Q3</span>
                      <span>Max</span>
                    </div>
                  </div>
                )}




              </div>
            </div>
          )}

        </main>

        
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
    width: "100%",
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
 

  loading: {
    fontStyle: "italic",
    color: "#555"
  },
  cardsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px"
  },
  card: {
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px"
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#00074d"
  },
  badge: {
    color: "white",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600"
  },
  cardContent: {
    color: "#333",
    lineHeight: "1.6"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  modalContent: {
    position: "relative",
    background: "#fff",
    padding: "30px",
    borderRadius: "12px",
    maxWidth: "600px",
    width: "90%",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 8px 20px rgba(0,0,0,0.3)"
  },
  closeCross: {
    position: "absolute",
    top: "12px",
    right: "12px",
    fontSize: "22px",
    fontWeight: "700",
    cursor: "pointer",
    color: "#00074d"
  },
  section: {
    marginBottom: "15px",
    lineHeight: "1.5",
    color: "#333"
  }
};