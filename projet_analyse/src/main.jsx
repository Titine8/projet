import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import AuthPage from "./AuthPage.jsx"; // Nouvelle page d'auth
import RegisterPage from "./RegisterPage.jsx";
import ImportPage from "./ImportPage";



ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
