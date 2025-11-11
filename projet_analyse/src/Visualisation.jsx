import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  ScatterChart, Scatter, Legend, LineChart, Line
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
      console.log("✅ Données reçues:", resData);
      console.log("🔗 Corrélations reçues:", resData.correlations); // AJOUTE CETTE LIGNE
      console.log("📊 Nombre de corrélations:", resData.correlations ? resData.correlations.length : 0); // ET CELLE-CI


        // Générer des données simulées pour les graphiques
        generateSimulatedData(resData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
// Ajouter après getNumericRange

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
  // Appliquer les filtres
useEffect(() => {
  let filtered = [...rawData];

  // Filtre par plage numérique
  if (filters.selectedVariable && filters.numericRange && getVariableType(filters.selectedVariable) === "num") {
    const { min, max } = filters.numericRange;
    filtered = filtered.filter(row => {
      const value = parseFloat(row[filters.selectedVariable]);
      return !isNaN(value) && value >= min && value <= max;
    });
  }

  // Filtre par catégorie
  if (filters.selectedVariable && filters.categoryFilter && getVariableType(filters.selectedVariable) === "cat") {
    console.log(`🎯 Filtrage catégoriel: ${filters.selectedVariable} = ${filters.categoryFilter}`);
    console.log(`📊 Exemple de valeurs avant filtrage:`, rawData.slice(0, 5).map(row => row[filters.selectedVariable]));
    
    filtered = filtered.filter(row => 
      String(row[filters.selectedVariable]) === String(filters.categoryFilter)
    );
    
    console.log(`📈 Données après filtrage: ${filtered.length} lignes`);
    if (filtered.length > 0) {
      console.log(`🔍 Premières lignes filtrées:`, filtered.slice(0, 3));
    }
  }

  console.log("🔍 Filtrage appliqué:", {
    variable: filters.selectedVariable,
    type: getVariableType(filters.selectedVariable),
    filtreCatégorie: filters.categoryFilter,
    donnéesOriginales: rawData.length,
    donnéesFiltrées: filtered.length
  });

  setFilteredData(filtered);
}, [filters, rawData]);


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
  
  // Priorité aux données de fréquence de l'API
  if (colData?.type_colonne === "cat" && colData.frequence && colData.frequence !== "N/A") {
    const categories = Object.keys(colData.frequence);
    console.log(`📊 Catégories depuis API pour ${variableName}:`, categories);
    return categories;
  }
  
  // Fallback: extraire des données simulées
  const uniqueCategories = Array.from(new Set(
    rawData.map(row => String(row[variableName])).filter(Boolean)
  )).slice(0, 10);
  
  console.log(`📊 Catégories extraites des données pour ${variableName}:`, uniqueCategories);
  return uniqueCategories;
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
        return `${col.moyenne?.toFixed(2) ?? "N/A"}`;
      case "cat":
        if (col.frequence && col.frequence !== "N/A") {
          const maxCat = Object.entries(col.frequence).sort((a, b) => b[1] - a[1])[0];
          return `${maxCat[0]}`;
        }
        return "N/A";
      case "date":
        return `${col.premiere_date}`;
      case "time":
        return `${col.premiere_heure}`;
      default:
        return "N/A";
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
    console.log("❌ Données manquantes ou filteredData vide", { 
      hasData: !!data, 
      filteredLength: filteredData.length 
    });
    return [];
  }

  console.log(`🔍 Préparation graphique ${colName}:`, {
    donnéesFiltrées: filteredData.length,
    premièresLignes: filteredData.slice(0, 3)
  });

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

// Fonction pour calculer la régression linéaire
const calculateRegression = (points) => {
  if (points.length < 2) return [];
  
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Créer des points pour la ligne de régression
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  
  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];
};

  // Ajouter après la fonction prepareChartData
  const prepareCorrelationData = (var1, var2) => {
    if (!data || filteredData.length === 0) return [];

    const type1 = getVariableType(var1);
    const type2 = getVariableType(var2);

    try {
      // CAS 1: Les deux variables sont numériques → Scatter plot
      if (type1 === "num" && type2 === "num") {
        const points = filteredData
          .map(row => ({
            x: parseFloat(row[var1]) || 0,
            y: parseFloat(row[var2]) || 0
          }))
          .filter(point => !isNaN(point.x) && !isNaN(point.y));

        return points;
      }

      // CAS 2: Une variable numérique et une catégorielle → Bar chart
      if ((type1 === "num" && type2 === "cat") || (type1 === "cat" && type2 === "num")) {
        const numVar = type1 === "num" ? var1 : var2;
        const catVar = type1 === "cat" ? var1 : var2;

        const categories = {};

        filteredData.forEach(row => {
          const category = row[catVar];
          const value = parseFloat(row[numVar]);

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

        return result;
      }

      // CAS 3: Les deux sont catégorielles → Stacked bar chart
      if (type1 === "cat" && type2 === "cat") {
        const categories1 = Array.from(new Set(
          filteredData.map(row => row[var1]).filter(Boolean)
        )).slice(0, 8);

        const categories2 = Array.from(new Set(
          filteredData.map(row => row[var2]).filter(Boolean)
        )).slice(0, 5);

        const result = categories1.map(cat1 => {
          const item = { category: cat1 };
          let total = 0;

          categories2.forEach(cat2 => {
            const count = filteredData.filter(row =>
              row[var1] === cat1 && row[var2] === cat2
            ).length;
            item[cat2] = count;
            total += count;
          });

          item.total = total;
          return item;
        });

        return result;
      }
    } catch (error) {
      console.error("❌ Erreur dans prepareCorrelationData:", error);
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

  // PALETTE BLEUE STYLÉE POUR TOUS LES GRAPHIQUES
  const colors = {
    scatter: '#0078D4',           // Bleu principal
    bar: '#005A9E',               // Bleu foncé
    bar2: '#00BCF2',              // Bleu clair
    category: [
      '#0078D4',                 // Bleu principal
      '#005A9E',                 // Bleu foncé  
      '#00BCF2',                 // Bleu clair
      '#4A90E2',                 // Bleu moyen
      '#106EBE'                  // Bleu corporate
    ]
  };

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
    // Variable numérique -> REGRESSION
    if (colType === "num") {
      const regressionLine = calculateRegression(chartData);
      
      return (
        <div key={idx} style={styles.scatterChart}>
          <h4 style={styles.chartTitle}>{inf.column} vs {targetName}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                name={inf.column} 
                type="number"
                label={{ value: inf.column, position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                dataKey="y" 
                name={targetName}
                label={{ value: targetName, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [value.toFixed(2), name]}
                labelFormatter={(label) => `${inf.column}: ${label.toFixed(2)}`}
              />
              {/* Points de données */}
              <Scatter 
                data={chartData} 
                fill={colors.scatter} 
                opacity={0.6}
                name="Données"
              />
              {/* Ligne de régression */}
              <Line 
                type="linear" 
                data={regressionLine} 
                dataKey="y"
                stroke={colors.bar}
                strokeWidth={2}
                dot={false}
                name="Tendance"
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Variable catégorielle -> Bar chart des moyennes
    if (colType === "cat") {
      return (
        <div key={idx} style={styles.scatterChart}>
          <h4 style={styles.chartTitle}>{inf.column} vs {targetName}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="category"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip formatter={(value) => value.toFixed(2)} />
              <Bar dataKey="moyenne" fill={colors.bar} />
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
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="moyenne" fill={colors.bar2} name={`Moyenne ${inf.column}`} />
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
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
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
              {targetCategories.map((cat, index) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  fill={colors.category[index % colors.category.length]}
                  stackId="a"
                  name={cat}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
  }

  return null;
};
  // Ajouter après la fonction renderChart
  // REMPLACER toute la fonction renderCorrelationChart par ceci :
// REMPLACER toute la fonction renderCorrelationChart par ceci :
const renderCorrelationChart = (correlation, idx) => {
  const { var1, var2, correlation: corrValue } = correlation;

  const chartData = prepareCorrelationData(var1, var2);
  const type1 = getVariableType(var1);
  const type2 = getVariableType(var2);

  // PALETTE 100% BLEUE - Même thème que le reste
  const colors = {
    scatter: '#0078D4',           // Bleu principal
    bar: '#005A9E',               // Bleu foncé
    bar2: '#00BCF2',              // Bleu clair
    category: [
      '#0078D4',                 // Bleu principal
      '#005A9E',                 // Bleu foncé  
      '#00BCF2',                 // Bleu clair
      '#4A90E2',                 // Bleu moyen
      '#106EBE'                  // Bleu corporate
    ]
  };

  if (chartData.length === 0) {
    return (
      <div key={`corr-${idx}`} style={styles.scatterChart}>
        <h4 style={styles.chartTitle}>{var1} vs {var2} (corr: {corrValue}%)</h4>
        <p style={styles.noData}>Aucune donnée disponible pour le graphique</p>
      </div>
    );
  }

  // CAS 1: Les deux variables sont numériques
  // CAS 1: Les deux variables sont numériques -> REGRESSION
if (type1 === "num" && type2 === "num") {
  const regressionLine = calculateRegression(chartData);
  
  return (
    <div key={`corr-${idx}`} style={styles.scatterChart}>
      <h4 style={styles.chartTitle}>{var1} vs {var2} (corr: {corrValue}%)</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            name={var1} 
            type="number"
            label={{ value: var1, position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            dataKey="y" 
            name={var2}
            label={{ value: var2, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value, name) => [value.toFixed(2), name]}
            labelFormatter={(label) => `${var1}: ${label.toFixed(2)}`}
          />
          {/* Points de données */}
          <Scatter 
            data={chartData} 
            fill={colors.scatter} 
            opacity={0.6}
            name="Données"
          />
          {/* Ligne de régression */}
          <Line 
            type="linear" 
            data={regressionLine} 
            dataKey="y"
            stroke={colors.bar}
            strokeWidth={2}
            dot={false}
            name="Tendance"
          />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

  // CAS 2: Une numérique et une catégorielle
  if ((type1 === "num" && type2 === "cat") || (type1 === "cat" && type2 === "num")) {
    const numVar = type1 === "num" ? var1 : var2;
    const catVar = type1 === "cat" ? var1 : var2;
    
    return (
      <div key={`corr-${idx}`} style={styles.scatterChart}>
        <h4 style={styles.chartTitle}>Moyenne de {numVar} par {catVar} (corr: {corrValue}%)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="category"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis />
            <Tooltip formatter={(value) => value.toFixed(2)} />
            <Bar dataKey="moyenne" fill={colors.bar} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // CAS 3: Les deux catégorielles
  if (type1 === "cat" && type2 === "cat") {
    const categories2 = Array.from(new Set(
      filteredData.map(row => row[var2]).filter(Boolean)
    )).slice(0, 5);
    
    return (
      <div key={`corr-${idx}`} style={styles.scatterChart}>
        <h4 style={styles.chartTitle}>Distribution de {var2} par {var1} (corr: {corrValue}%)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
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
            {categories2.map((cat, index) => (
              <Bar
                key={cat}
                dataKey={cat}
                fill={colors.category[index % colors.category.length]}
                stackId="a"
                name={cat}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

const calculateFilteredStats = (variableName) => {
  if (!filteredData.length || !variableName) {
    console.log(`❌ Données manquantes pour ${variableName}`, {
      filteredLength: filteredData.length,
      variableName
    });
    return null;
  }
  
  const values = filteredData.map(row => row[variableName]).filter(val => val != null);
  
  if (values.length === 0) {
    console.log(`⚠️ Aucune valeur pour ${variableName} dans les données filtrées`);
    return null;
  }
  
  const variableType = getVariableType(variableName);
  console.log(`📊 Calcul stats pour ${variableName} (${variableType}):`, {
    nbValeurs: values.length,
    exemples: values.slice(0, 3)
  });
  
  if (variableType === "num") {
    const numericValues = values.map(val => parseFloat(val)).filter(val => !isNaN(val));
    if (numericValues.length > 0) {
      const moyenne = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      console.log(`✅ Moyenne calculée pour ${variableName}:`, moyenne);
      return moyenne.toFixed(2);
    }
  } else {
    // Variable catégorielle
    const frequency = {};
    values.forEach(val => {
      const strVal = String(val);
      frequency[strVal] = (frequency[strVal] || 0) + 1;
    });
    
    const mostFrequent = Object.entries(frequency).sort((a, b) => b[1] - a[1])[0];
    console.log(`✅ Catégorie fréquente pour ${variableName}:`, mostFrequent);
    
    return mostFrequent ? mostFrequent[0] : "N/A";
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

{/* KPI Cards avec filtres */}
<div style={styles.kpiContainer}>
  {/* KPI pour la cible */}
  <div style={styles.kpiCard}>
    <h3 style={styles.kpiTitle}>{data.cible.vrai_nom}</h3>
    <p style={styles.kpiValue}>
      {filteredData.length !== rawData.length 
        ? calculateFilteredStats(data.cible.vrai_nom) || renderKeyInfo(data.cible?.cible)
        : renderKeyInfo(data.cible?.cible)
      }
    </p>
    {filteredData.length !== rawData.length && (
      <p style={styles.kpiFiltered}>(Filtré)</p>
    )}
  </div>

  {/* KPI pour les variables d'influence */}
  {data.influences.map((inf, idx) => {
    const colData = data.colonnes.find(c => c.nom_colonne === inf.column);
    const filteredValue = calculateFilteredStats(inf.column);
    const originalValue = renderKeyInfo(colData);
    
    return (
      <div key={idx} style={styles.kpiCard}>
        <h3 style={styles.kpiTitle}>{inf.column}</h3>
        <p style={styles.kpiValue}>
          {filteredData.length !== rawData.length 
            ? filteredValue || originalValue
            : originalValue
          }
        </p>
        {filteredData.length !== rawData.length && filteredValue && (
          <p style={styles.kpiFiltered}></p>
        )}
      </div>
    );
  })}
</div>

              {/* Charts de comparaison */}
              {/* Charts de comparaison */}
              <div style={styles.chartsContainer}>
                {/* Graphiques 1, 2, 3 : Cible vs Variables influentes */}
                {data.influences.slice(0, 3).map((inf, idx) => renderChart(inf, idx))}

                {/* Graphiques 4, 5 : Corrélations entre variables (sans la cible) */}
                {data.correlations && data.correlations.map((corr, idx) =>
                  renderCorrelationChart(corr, idx)
                )}
              </div>
            </>
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
  // Remplacer la section kpiContainer et kpiCard dans vos styles par :

  // Styles pour les KPI Cards (version réduite style PBI)
  kpiContainer: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 24
  },
  kpiCard: {
    flex: "1 1 150px",
    background: "linear-gradient(135deg, #3399cc, #00074d)",
    color: "white",
    borderRadius: 8,
    padding: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    transition: "transform 0.2s ease",
    minHeight: "80px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center"
  },
  kpiTitle: {
    margin: "0 0 8px 0",
    fontSize: 14,
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    width: "100%"
  },
  kpiText: {
    margin: "2px 0", // Marge réduite
    fontSize: 12, // Police plus petite
    opacity: 0.9
  }, kpiValue: {
    fontSize: 20, // Taille grande pour la valeur principale
    fontWeight: "bold",
    margin: 0,
    opacity: 1
  },
  kpiInfo: {
    margin: "6px 0 0 0",
    fontSize: 10, // Police encore plus petite
    opacity: 0.8,
    fontStyle: "italic",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
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
  },kpiFiltered: {
  fontSize: 10,
  opacity: 0.8,
  fontStyle: 'italic',
  margin: '2px 0 0 0'
}
};