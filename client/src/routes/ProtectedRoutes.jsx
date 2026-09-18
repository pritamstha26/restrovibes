import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function isExpired(token) {
  try {
    const decoded = jwtDecode(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

const ProtectedRoute = ({ allowedRoles } = {}) => {
  const token = sessionStorage.getItem("access_token");

  if (!token || isExpired(token)) {
    if (token) {
      try {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
      } catch {}
    }
    return <Navigate to="/login" replace />;
  }

  // Role-based guard: decode role from JWT and enforce allowedRoles.
  // Without this, any authenticated user (e.g. restaurateurs) could
  // manually navigate to /admin and render the admin panel.
  if (allowedRoles && allowedRoles.length > 0) {
    let role = null;
    try {
      const decoded = jwtDecode(token);
      role = decoded?.role || null;
    } catch {
      return <Navigate to="/login" replace />;
    }
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;