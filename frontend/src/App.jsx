import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppRouteLoader from "./components/AppRouteLoader.jsx";
import AppShell from "./components/AppShell.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import "./App.css";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage.jsx"));
const AdminTokenRulesPage = lazy(() => import("./pages/AdminTokenRulesPage.jsx"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage.jsx"));
const AdminContentPage = lazy(() => import("./pages/AdminContentPage.jsx"));
const GuardianDashboardPage = lazy(() => import("./pages/GuardianDashboardPage.jsx"));
const StudentExamSelectionPage = lazy(() => import("./pages/StudentExamSelectionPage.jsx"));
const StudentMockTestPage = lazy(() => import("./pages/StudentMockTestPage.jsx"));
const StudentProfilePage = lazy(() => import("./pages/StudentProfilePage.jsx"));
const StudentReportPage = lazy(() => import("./pages/StudentReportPage.jsx"));
const StudentLearnPage = lazy(() => import("./pages/StudentLearnPage.jsx"));

function App() {
  return (
    <Suspense fallback={<AppRouteLoader label="Loading page" />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/admin-portal"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="token-rules" element={<AdminTokenRulesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="content" element={<AdminContentPage />} />
        </Route>
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentExamSelectionPage />} />
          <Route path="attempt/:attemptId" element={<StudentMockTestPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="report" element={<StudentReportPage />} />
          <Route path="learn" element={<StudentLearnPage />} />
        </Route>
        <Route
          path="/guardian"
          element={
            <ProtectedRoute allowedRoles={["guardian"]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<GuardianDashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
