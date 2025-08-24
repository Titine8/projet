import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import AuthPage from "./AuthPage.jsx"; // Nouvelle page d'auth
import RegisterPage from "./RegisterPage.jsx";
import ImportPage from "./ImportPage";
import Analyse from "./analyse";
import Visualisation from "./Visualisation"
import Prediction from "./prediction";
import AnalyseTab from "./AnalyseTab";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/analyse/:username/:folder" element={<Analyse />}/>
         <Route path="/visualisation/:username/:folder" element={<Visualisation />} />
         <Route path="/prediction/:username/:folder" element={<Prediction />} />
         <Route path="/analysetab/:username/:folder" element={<AnalyseTab />} />
         </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
