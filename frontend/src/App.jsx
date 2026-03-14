import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import "./App.css";
import AdminContentPage from "./pages/AdminContentPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import GuardianDashboardPage from "./pages/GuardianDashboardPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import StudentDiagnosticPage from "./pages/StudentDiagnosticPage.jsx";
import StudentDashboardPage from "./pages/StudentDashboardPage.jsx";
import StudentInvitePage from "./pages/StudentInvitePage.jsx";
import StudentLeaderboardPage from "./pages/StudentLeaderboardPage.jsx";
import StudentProfilePage from "./pages/StudentProfilePage.jsx";
import StudentStudyPlanPage from "./pages/StudentStudyPlanPage.jsx";
import StudentStudySessionPage from "./pages/StudentStudySessionPage.jsx";

function App() {
  return (
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
        <Route index element={<StudentDashboardPage />} />
        <Route path="diagnostic/:attemptId" element={<StudentDiagnosticPage />} />
        <Route path="leaderboard" element={<StudentLeaderboardPage />} />
        <Route path="study-plan" element={<StudentStudyPlanPage />} />
        <Route path="study-plan/tasks/:taskId" element={<StudentStudySessionPage />} />
        <Route path="invites" element={<StudentInvitePage />} />
        <Route path="profile" element={<StudentProfilePage />} />
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
  );
}

export default App;
