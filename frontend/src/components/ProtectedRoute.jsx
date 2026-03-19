import { Navigate, useLocation } from "react-router-dom";

import AppRouteLoader from "./AppRouteLoader.jsx";
import { getRoleHomePath } from "../lib/roles.js";
import { useAuth } from "../state/AuthContext.jsx";

function ProtectedRoute({ allowedRoles, children }) {
  const { authReady, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <AppRouteLoader label="Loading page" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getRoleHomePath(user?.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
