import React from "react";
import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Container } from "react-bootstrap";
import {
  LayoutDashboard,
  Users,
  Store,
  Scissors,
  Settings,
  LogOut,
  UtensilsCrossed,
  CalendarCheck,
  Table,
  Menu,
  X,
  BarChart3,
} from "lucide-react";
import api from "../apis/api";
import useIsMobile from "../hooks/useIsMobile";

function SidebarContent({ onNavigate, onClose }) {
  const navigate = useNavigate();
  const navElements = [
    { id: 1, name: "Dashboard", path: "dashboard", icon: LayoutDashboard },
    { id: 2, name: "Bookings", path: "bookings", icon: CalendarCheck },
    { id: 9, name: "Lottery Demo", path: "lottery-demo", icon: BarChart3 },
    { id: 3, name: "Clients", path: "clients", icon: Users },
    { id: 4, name: "Restaurants", path: "restaurant-list", icon: Store },
    { id: 5, name: "Services and Capacity", path: "services", icon: Scissors },
    { id: 6, name: "Tables", path: "tables", icon: Table },
    { id: 7, name: "Settings", path: "settings", icon: Settings },
    { id: 8, name: "Logout", icon: LogOut },
  ];

  return (
    <div className="d-flex flex-column justify-content-between py-4 px-3 h-100 overflow-auto">
      <div>
        {/* Branding Header Block */}
        <div className="d-flex align-items-center gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid #1e293b" }}>
          <div
            className="d-flex align-items-center justify-content-center"
            style={{ width: "32px", height: "32px", backgroundColor: "#38bdf8", color: "#0f172a", borderRadius: "8px" }}
          >
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <h4 className="m-0 fs-5 fw-bold" style={{ letterSpacing: "-0.02em", color: "#f8fafc" }}>RestroVibe</h4>
            <span style={{ fontSize: "0.68rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>HQ Panel</span>
          </div>
        </div>

        {/* Main Navigation Row Stack */}
        <nav className="nav flex-column gap-1">
          {navElements.map((navItem) => {
            const Icon = navItem.icon;

            if (navItem.name === "Logout") {
              return (
                <span
                  key={navItem.id}
                  className="nav-link d-flex align-items-center gap-3 rounded-3"
                  style={{
                    cursor: "pointer",
                    color: "#f87171",
                    padding: "0.75rem 1rem",
                    fontSize: "0.88rem",
                    fontWeight: "500",
                  }}
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to log out?")) {
                      try {
                        const refreshToken = sessionStorage.getItem("refresh_token");
                        if (refreshToken) {
                          await api.post("/auth/logout", { refreshToken });
                        }
                      } catch (error) {
                        console.error("Logout error:", error);
                      } finally {
                        sessionStorage.removeItem("access_token");
                        sessionStorage.removeItem("refresh_token");
                        navigate("/login");
                      }
                    }
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <Icon size={16} style={{ color: "#f87171" }} />
                  <span>{navItem.name}</span>
                </span>
              );
            }

            return (
              <NavLink
                key={navItem.id}
                to={`/admin/${navItem.path}`}
                style={{ textDecoration: "none" }}
                onClick={onNavigate}
              >
                {({ isActive }) => (
                  <span
                    className="nav-link d-flex align-items-center gap-3 rounded-3"
                    style={{
                      padding: "0.75rem 1rem",
                      fontSize: "0.88rem",
                      fontWeight: isActive ? "600" : "500",
                      backgroundColor: isActive ? "#38bdf8" : "transparent",
                      color: isActive ? "#0f172a" : "#94a3b8",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#1e293b"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <Icon size={16} style={{ color: isActive ? "#0f172a" : "#64748b" }} />
                    <span>{navItem.name.replace("-", " ")}</span>
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Minimalist Fixed Admin Identity Card */}
      <div className="pt-3" style={{ borderTop: "1px solid #1e293b" }}>
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center fw-bold"
            style={{ width: "36px", height: "36px", backgroundColor: "#334155", color: "#f8fafc", borderRadius: "50%", fontSize: "0.85rem" }}
          >
            A
          </div>
          <div className="flex-grow-1">
            <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "#f1f5f9" }}>Administrator</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Root Access Enabled</div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="admin-close-button"
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const isMobile = useIsMobile(768);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer when crossing to desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  return (
    <Container fluid className="p-0 admin-shell" style={{ backgroundColor: "#f8fafc" }}>
      <div className="d-flex vh-100 overflow-hidden">
        {/* Desktop static sidebar */}
        {!isMobile && (
          <div
            className="admin-sidebar-static flex-shrink-0"
            style={{ width: "280px", minWidth: "280px", backgroundColor: "#0f172a", borderRight: "1px solid #1e293b" }}
          >
            <SidebarContent />
          </div>
        )}

        {/* Mobile slide-over sidebar + backdrop */}
        {isMobile && (
          <>
            <div className={`admin-sidebar-overlay ${menuOpen ? "is-open" : ""}`} style={{ backgroundColor: "#0f172a" }}>
              <SidebarContent onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
            </div>
            <div
              className={`admin-backdrop ${menuOpen ? "is-visible" : ""}`}
              onClick={() => setMenuOpen(false)}
            />
          </>
        )}

        {/* Hamburger — visible only on mobile, hidden while drawer is open */}
        {isMobile && !menuOpen && (
          <button
            className="admin-hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Fluid Content Canvas Main Window */}
        <div className="flex-grow-1 overflow-y-auto admin-content" style={{ backgroundColor: "#f8fafc" }}>
          <Outlet />
        </div>
      </div>
    </Container>
  );
}