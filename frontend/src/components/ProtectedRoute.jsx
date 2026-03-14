import { Navigate, useLocation } from "react-router-dom";

import { getRoleHomePath } from "../lib/roles.js";
import { useAuth } from "../state/AuthContext.jsx";

function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getRoleHomePath(user?.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
