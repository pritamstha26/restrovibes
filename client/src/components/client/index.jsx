import React from "react";
import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "./sidebar";
import useIsMobile from "../../hooks/useIsMobile";

function ClientPortal() {
  const location = useLocation();
  const isMobile = useIsMobile(768);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTab = location.pathname.replace("/client", "").replace(/^\//, "") || "dashboard";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  return (
    <div className="min-vh-100 bg-light">
      <button
        className={`v-hamburger ${menuOpen ? "is-open" : ""}`}
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        {menuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <div className={`v-backdrop ${menuOpen ? "is-visible" : ""}`} onClick={() => setMenuOpen(false)} />
      <div className="d-flex">
        <Sidebar activeTab={activeTab} open={isMobile ? menuOpen : true} />
        <main className="v-client-content" style={{ marginLeft: isMobile ? 0 : "280px", width: "100%" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ClientPortal;