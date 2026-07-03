import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import { adminRoutes, participantRoutes } from "./routeConfig.js";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {adminRoutes.map((route) => (
          <Route key={route.id} path={route.path} element={<App />} />
        ))}
        {participantRoutes.map((route) => (
          <Route key={route.id} path={route.path} element={<App />} />
        ))}
        <Route path="/login" element={<App />} />
        <Route path="/review/:contestId" element={<App />} />
        <Route path="/contest/:contestId" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
