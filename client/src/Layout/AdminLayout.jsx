// import React from "react";
// import { Outlet, NavLink, useNavigate } from "react-router-dom";
// import { Container } from "react-bootstrap";

// export default function AdminLayout() {
//   const navElements = [
//     { id: 1, name: "Dashboard" },
//     { id: 2, name: "Clients" },
//     { id: 3, name: "Restaurant-List" },
//     { id: 4, name: "Services" },
//     { id: 5, name: "Settings" },
//     { id: 6, name: "Logout" },
//   ];
//   const navigate = useNavigate();
//   return (
//     <Container fluid className="p-0">
//       <div className="d-flex  vh-100 overflow-hidden">
//         {/* Sidebar */}
//         <div className="w-25  text-light py-3 p-0 overflow-auto bg-dark">
//           <h4 className="px-3 fs-2 fw-bold">Admin Panel</h4>
//           <nav className="nav flex-column ">
//             {navElements.map((navItem) =>
//               navItem.name === "Logout" ? (
//                 <span
//                   key={navItem.id}
//                   className="nav-link text-light"
//                   style={{ cursor: "pointer" }}
//                   onClick={() => {
//                     sessionStorage.removeItem("access_token"); // Clear token
//                     navigate("/login"); // Redirect to login page
//                   }}
//                 >
//                   {navItem.name}
//                 </span>
//               ) : (
//                 <NavLink
//                   key={navItem.id}
//                   to={`/admin/${navItem.name.toLowerCase()}`}
//                   className={({ isActive }) =>
//                     `nav-link ${
//                       isActive ? "fw-bold bg-primary text-light" : "text-light"
//                     }`
//                   }
//                 >
//                   {navItem.name}
//                 </NavLink>
//               ),
//             )}
//           </nav>
//         </div>

//         {/* Main Content */}
//         <div className="p-0 w-75  overflow-y-auto">
//           <Outlet />
//         </div>
//       </div>
//     </Container>
//   );
// }

import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Container } from "react-bootstrap";
import {
  LayoutDashboard,
  Users,
  Store,
  Scissors,
  Settings,
  LogOut,
  ShieldCheck,
  CalendarCheck,
  Table,
} from "lucide-react";
import api from "../apis/api";

export default function AdminLayout() {
  const navElements = [
    { id: 1, name: "Dashboard", path: "dashboard", icon: LayoutDashboard },
    { id: 2, name: "Bookings", path: "bookings", icon: CalendarCheck },
    { id: 3, name: "Clients", path: "clients", icon: Users },
    { id: 4, name: "Restaurants", path: "restaurant-list", icon: Store },
    { id: 5, name: "Services and Capacity", path: "services", icon: Scissors },
    { id: 6, name: "Tables", path: "tables", icon: Table },
    { id: 7, name: "Settings", path: "settings", icon: Settings },
    { id: 8, name: "Logout", icon: LogOut },
  ];
  
  const navigate = useNavigate();

  return (
    <Container fluid className="p-0" style={{ backgroundColor: "#f8fafc" }}>
      <div className="d-flex vh-100 overflow-hidden">
        
        {/* Core Sidebar Container Panel */}
        <div 
          className="d-flex flex-column justify-content-between text-light py-4 px-3 overflow-auto" 
          style={{ 
            width: "280px", 
            minWidth: "280px", 
            backgroundColor: "#0f172a",
            borderRight: "1px solid #1e293b"
          }}
        >
          <div>
            {/* Branding Header Block */}
            <div className="d-flex align-items-center gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid #1e293b" }}>
              <div 
                className="d-flex align-items-center justify-content-center" 
                style={{ width: "32px", height: "32px", backgroundColor: "#38bdf8", color: "#0f172a", borderRadius: "8px" }}
              >
                <ShieldCheck size={18} />
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
                        fontWeight: "500" 
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
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => { if(!isActive) e.currentTarget.style.backgroundColor = "#1e293b"; }}
                        onMouseLeave={(e) => { if(!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
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
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "#f1f5f9" }}>Administrator</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Root Access Enabled</div>
              </div>
            </div>
          </div>

        </div>

        {/* Fluid Content Canvas Main Window */}
        <div className="flex-grow-1 overflow-y-auto" style={{ backgroundColor: "#f8fafc" }}>
          <Outlet />
        </div>

      </div>
    </Container>
  );
}