// import React from "react";
// import { Nav, Button } from "react-bootstrap";
// import { useNavigate } from "react-router-dom";
// import {
//   FaHome,
//   FaCog,
//   FaSignOutAlt,
//   FaUser,
//   FaMapMarkerAlt,
// } from "react-icons/fa";
// import { jwtDecode } from "jwt-decode";

// export const Sidebar = ({ activeTab, setActiveTab }) => {
//   const navigate = useNavigate();
//   const menuItems = [
//     { id: "dashboard", label: "Dashboard", icon: FaHome },
//     {
//       id: "nearby-restaurants",
//       label: "Nearby Restaurants",
//       icon: FaMapMarkerAlt,
//     },
//     { id: "settings", label: "Settings", icon: FaCog },
//   ];

//   const handleLogout = () => {
//     sessionStorage.removeItem("access_token");
//     navigate("/login");
//   };

//   const sidebarStyle = {
//     width: "350px",
//     height: "100vh",
//     position: "fixed",
//     left: 0,
//     top: 0,
//     zIndex: 1000,
//     backgroundColor: "#ffffff",
//     boxShadow: "0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)",
//   };

//   const sessionStorageData = sessionStorage.getItem("access_token");
//   let decodeToken = {};
//   try {
//     if (sessionStorageData) decodeToken = jwtDecode(sessionStorageData);
//   } catch (err) {
//     console.error("Failed to decode token in Sidebar:", err);
//     decodeToken = {};
//   }

//   return (
//     <div style={sidebarStyle}>
//       {/* Header */}
//       <div className="p-4 border-bottom">
//         <div className="d-flex align-items-center">
//           <div
//             className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3"
//             style={{ width: "40px", height: "40px" }}
//           >
//             <FaUser className="text-white" />
//           </div>
//           <div>
//             <h5 className="mb-0 fw-bold text-capitalize">
//               {decodeToken.first_name || "Guest"} {decodeToken.last_name || ""}
//             </h5>
//             <small className="text-muted">{decodeToken.role || ""}</small>
//           </div>
//         </div>
//       </div>

//       {/* Navigation */}
//       <Nav className="flex-column mt-3 px-3">
//         {menuItems.map((item) => {
//           const IconComponent = item.icon;
//           return (
//             <Nav.Item key={item.id} className="mb-2">
//               <Button
//                 variant={activeTab === item.id ? "primary" : "outline-light"}
//                 className={`w-100 d-flex align-items-center text-start p-3 border-0 ${
//                   activeTab === item.id ? "" : "text-dark"
//                 }`}
//                 style={{
//                   borderLeft:
//                     activeTab === item.id ? "4px solid #0d6efd" : "none",
//                   borderRadius: "8px",
//                   backgroundColor:
//                     activeTab === item.id ? "#0d6efd" : "transparent",
//                 }}
//                 onClick={() => setActiveTab(item.id)}
//               >
//                 <IconComponent className="me-3" />
//                 <span className="fw-medium">{item.label}</span>
//               </Button>
//             </Nav.Item>
//           );
//         })}
//       </Nav>

//       {/* Logout Button */}
//       <div className="position-absolute bottom-0 start-0 end-0 p-3">
//         <Button
//           variant="outline-danger"
//           className="w-100 d-flex align-items-center justify-content-center"
//           onClick={handleLogout}
//         >
//           <FaSignOutAlt className="me-2" />
//           <span className="fw-medium">Logout</span>
//         </Button>
//       </div>
//     </div>
//   );
// };

// export default Sidebar;

import React from "react";
import { Nav, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaCog,
  FaSignOutAlt,
  FaUser,
  FaMapMarkerAlt,
  FaRoute,
} from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import api from "../../apis/api";
import "./dashboard.css"; // Uses shared Vercel theme variables

export const Sidebar = ({ activeTab, open }) => {
  const navigate = useNavigate();
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: FaHome },
    {
      id: "nearby-restaurants",
      label: "Nearby Nodes",
      icon: FaMapMarkerAlt,
    },
    {
      id: "gps-navigation",
      label: "Navigate",
      icon: FaRoute,
    },
    { id: "settings", label: "Settings", icon: FaCog },
  ];

  const handleLogout = async () => {
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
  };

  const sessionStorageData = sessionStorage.getItem("access_token");
  let decodeToken = {};
  try {
    if (sessionStorageData) decodeToken = jwtDecode(sessionStorageData);
  } catch (err) {
    console.error("Failed to decode token in Sidebar:", err);
    decodeToken = {};
  }

  return (
    <div className={`v-sidebar-container ${open ? "v-sidebar-open" : ""}`}>
      {/* Identity Node Frame */}
      <div className="v-sidebar-header">
        <div className="d-flex align-items-center">
          <div className="v-sidebar-avatar">
            <FaUser className="text-muted" style={{ fontSize: "0.85rem" }} />
          </div>
          <div className="overflow-hidden">
            <h5 className="v-sidebar-name text-capitalize">
              {decodeToken.first_name || "Guest"} {decodeToken.last_name || ""}
            </h5>
            <small className="v-sidebar-role font-monospace">
              {decodeToken.role ? `${decodeToken.role.toUpperCase()}_INSTANCE` : "UNASSIGNED_NODE"}
            </small>
          </div>
        </div>
      </div>

      {/* Navigation Stream Blocks */}
      <Nav className="flex-column mt-3 px-2">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Nav.Item key={item.id} className="mb-1">
              <button
                className={`v-sidebar-nav-btn ${isActive ? "active" : ""}`}
                onClick={() => navigate(`/client/${item.id}`)}
              >
                <IconComponent className="v-sidebar-icon" />
                <span>{item.label}</span>
              </button>
            </Nav.Item>
          );
        })}
      </Nav>

      {/* Terminal System Teardown Section */}
      <div className="v-sidebar-footer">
        <button
          className="v-sidebar-logout-btn"
          onClick={handleLogout}
        >
          <FaSignOutAlt className="me-2" style={{ fontSize: "0.8rem" }} />
          <span>Tear Down Session</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
