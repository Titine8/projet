import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import AuthPage from "./AuthPage.jsx"; // Nouvelle page d'auth
import RegisterPage from "./RegisterPage.jsx";
import ImportPage from "./ImportPage";
import Analyse from "./analyse";
import StatistiqueTab from "./StatistiqueTab.jsx";
import VisualisationTab from "./VisualisationTab";
import AnalyseTab from "./AnalyseTab";
import PredictionTab from "./PredictionTab";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/analyse/:username/:folder" element={<Analyse />}/>
        <Route path="statistique" element={<StatistiqueTab />} />
        <Route path="visualisation" element={<VisualisationTab />} />
        <Route path="analyse-data" element={<AnalyseTab />} />
        <Route path="prediction" element={<PredictionTab />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
