import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const HOME_BY_ROLE = {
  admin: "/admin/dashboard",
  restaurateurs: "/restaurateurs",
  client: "/client/dashboard",
};

function getRoleHome() {
  try {
    const token = sessionStorage.getItem("access_token");
    if (!token) return "/login";
    const decoded = jwtDecode(token);
    return HOME_BY_ROLE[decoded?.role] || "/login";
  } catch {
    return "/login";
  }
}

export default function UnauthorizedHandler() {
  const home = getRoleHome();

  return (
    <div
      className="d-flex align-items-center justify-content-center text-center"
      style={{ minHeight: "100vh" }}
    >
      <div>
        <h1 className="mt-3">403 - Access Denied</h1>
        <p className="lead text-muted mb-4">
          You don&apos;t have permission to view this page.
        </p>
        <Link to={home} replace className="btn btn-primary btn-lg">
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}