import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { adminRoutes, participantRoutes } from "./routeConfig.js";

const App = lazy(() => import("./App.jsx"));
const lazyNamed = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));
const SignupPage = lazyNamed(() => import("./pages/auth/SignupPage.jsx"), "SignupPage");
const PublicCredentialVerificationPage = lazyNamed(
  () => import("./pages/public/PublicCredentialVerificationPage.jsx"),
  "PublicCredentialVerificationPage"
);
const PublicActivityProfilePage = lazyNamed(
  () => import("./pages/public/PublicActivityProfilePage.jsx"),
  "PublicActivityProfilePage"
);
const TamperLabPage = lazyNamed(() => import("./pages/public/TamperLabPage.jsx"), "TamperLabPage");
const EvidenceReportPage = lazyNamed(() => import("./pages/public/EvidenceReportPage.jsx"), "EvidenceReportPage");
const JudgeDemoPage = lazyNamed(() => import("./pages/public/JudgeDemoPage.jsx"), "JudgeDemoPage");

function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingScreen />}>
        <Routes>
          {adminRoutes.map((route) => (
            <Route key={route.id} path={route.path} element={<App />} />
          ))}
          {participantRoutes.map((route) => (
            <Route key={route.id} path={route.path} element={<App />} />
          ))}
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup/admin" element={<SignupPage preferredRole="admin" />} />
          <Route path="/verify" element={<PublicCredentialVerificationPage />} />
          <Route path="/verify/:credentialPublicId" element={<PublicCredentialVerificationPage />} />
          <Route path="/activity/:publicProfileId" element={<PublicActivityProfilePage />} />
          <Route path="/tamper-lab" element={<TamperLabPage />} />
          <Route path="/evidence-report" element={<EvidenceReportPage />} />
          <Route path="/demo" element={<JudgeDemoPage />} />
          <Route path="/home" element={<App />} />
          <Route path="/login" element={<App />} />
          <Route path="/review/:contestId" element={<Navigate to="/judge/review" replace />} />
          <Route path="/judge/review" element={<App />} />
          <Route path="/contest/:contestId" element={<App />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RouteLoadingScreen() {
  return (
    <main className="contest-public-page">
      <section className="public-empty" role="status" aria-live="polite">
        <h1>화면을 불러오는 중입니다</h1>
      </section>
    </main>
  );
}

export default AppRouter;
