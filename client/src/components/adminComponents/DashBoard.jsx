// import { Row, Col, Card, Spinner } from "react-bootstrap";

// import "./admin-panel.css";
// import { useEffect, useState } from "react";
// import api from "../../apis/api";

// const Dashboard = () => {
//   const [appointments, setAppointments] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const POLL_INTERVAL_MS = 5000;
//   const StatusBadge = ({ status }) => {
//     let className = "badge ";

//     switch (status) {
//       case "pending":
//         className += "bg-warning";
//         break;

//       case "completed":
//         className += "bg-success";
//         break;
//       case "cancelled":
//         className += "bg-danger";
//         break;
//       case "in_progress":
//         className += "bg-secondary";
//         break;
//       default:
//         className += "bg-light text-dark"; // default style
//     }

//     return <span className={className}>{status || "N/A"}</span>;
//   };

//   const getAppointments = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // Get current restaurant/restaurateur ID from token
//       const token = sessionStorage.getItem("access_token");
//       if (!token) {
//         return;
//       }

//       // Fetch appointments for this restaurateur
//       const response = await api.get(`/appointments/all`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (response.status === 200) {
//         const rawData = response.data.data ?? response.data;
//         const appointmentsData = Array.isArray(rawData)
//           ? rawData.map((apt) => ({
//               ...apt,
//               client_name:
//                 apt.client?.first_name && apt.client?.last_name
//                   ? `${apt.client.first_name} ${apt.client.last_name}`
//                   : apt.client_name,
//               restaurateur_name:
//                 apt.restaurateurs?.first_name && apt.restaurateurs?.last_name
//                   ? `${apt.restaurateurs.first_name} ${apt.restaurateurs.last_name}`
//                   : apt.restaurateur_name,
//               service_name: apt.service?.name || apt.service_name,
//               duration: apt.service?.duration || apt.duration,
//               price: apt.service?.price || apt.price,
//             }))
//           : [];
//         setAppointments(appointmentsData);
//         console.log("Appointments loaded:", appointmentsData);
//       }
//     } catch (error) {
//       console.error("Error fetching appointments:", error);
//       setError("Failed to load appointments");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     getAppointments();
//     const interval = setInterval(getAppointments, POLL_INTERVAL_MS);
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div className="dashboard p-4">
//       <div className="page-title">
//         <h2>Dashboard</h2>
//         <p className="text-muted">
//           Welcome back,<span className="fw-bold"> Admin</span>
//         </p>
//       </div>

//       <Row>
//         <Col md={6} lg={3} className="mb-4">
//           <Card className="dashboard-card">
//             <Card.Body className="text-center">
//               <div className="card-icon bg-warning text-white mx-auto">
//                 <i className="bi bi-calendar-check"></i>
//               </div>
//               <h2>{appointments.length}</h2>
//               <p className="text-muted mb-0">Today's Appointments</p>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>

//       <Row>
//         <Col lg={12} className="mb-4">
//           <Card className="dashboard-card">
//             <Card.Body>
//               <h5 className="card-title"> Appointments Details</h5>
//               <div className="table-responsive">
//                 <table className="table table-hover">
//                   <thead>
//                     <tr>
//                       <th>Client</th>
//                       <th>Restaurant</th>
//                       <th>Service</th>
//                       <th>Time</th>
//                       <th>Status</th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {appointments.map((data) => (
//                       <tr key={data.id}>
//                         <td>{data.client_name || "Unknown Client"}</td>
//                         <td>{data.restaurateur_name || "Restaurant"}</td>
//                         <td>{data.service_name || "Service Deleted"}</td>
//                         <td>{new Date(data.date).toLocaleString()}</td>
//                         <td>
//                           <StatusBadge status={data.status} />
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>

//         {/* <Col lg={4} className="mb-4">
//           <Card className="dashboard-card">
//             <Card.Body>
//               <h5 className="card-title">Popular Services</h5>
//               <div className="mb-3">
//                 <div className="d-flex justify-content-between mb-1">
//                   <span>Haircut</span>
//                   <span>65%</span>
//                 </div>
//                 <div className="progress">
//                   <div
//                     className="progress-bar bg-primary"
//                     role="progressbar"
//                     style={{ width: "70%" }}
//                     aria-valuenow="65"
//                     aria-valuemin="0"
//                     aria-valuemax="100"
//                   ></div>
//                 </div>
//               </div>
//               <div className="mb-3">
//                 <div className="d-flex justify-content-between mb-1">
//                   <span>Beard Trim</span>
//                   <span>45%</span>
//                 </div>
//                 <div className="progress">
//                   <div
//                     className="progress-bar bg-success"
//                     role="progressbar"
//                     style={{ width: "45%" }}
//                     aria-valuenow="45"
//                     aria-valuemin="0"
//                     aria-valuemax="100"
//                   ></div>
//                 </div>
//               </div>
//               <div className="mb-3">
//                 <div className="d-flex justify-content-between mb-1">
//                   <span>Hair Styling</span>
//                   <span>30%</span>
//                 </div>
//                 <div className="progress">
//                   <div
//                     className="progress-bar bg-warning"
//                     role="progressbar"
//                     style={{ width: "30%" }}
//                     aria-valuenow="30"
//                     aria-valuemin="0"
//                     aria-valuemax="100"
//                   ></div>
//                 </div>
//               </div>
//               <div className="mb-3">
//                 <div className="d-flex justify-content-between mb-1">
//                   <span>Hot Towel Shave</span>
//                   <span>25%</span>
//                 </div>
//                 <div className="progress">
//                   <div
//                     className="progress-bar bg-info"
//                     role="progressbar"
//                     style={{ width: "25%" }}
//                     aria-valuenow="25"
//                     aria-valuemin="0"
//                     aria-valuemax="100"
//                   ></div>
//                 </div>
//               </div>
//               <div className="mb-3">
//                 <div className="d-flex justify-content-between mb-1">
//                   <span>Color Treatment</span>
//                   <span>15%</span>
//                 </div>
//                 <div className="progress">
//                   <div
//                     className="progress-bar bg-danger"
//                     role="progressbar"
//                     style={{ width: "15%" }}
//                     aria-valuenow="15"
//                     aria-valuemin="0"
//                     aria-valuemax="100"
//                   ></div>
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col> */}
//       </Row>
//     </div>
//   );
// };

// export default Dashboard;

import { useEffect, useState, useMemo } from "react";
import { Row, Col, Spinner } from "react-bootstrap";
import { CalendarCheck, Clock, User, UtensilsCrossed, Landmark,TrendingUp } from "lucide-react";

import "./admin-panel.css";
import api from "../../apis/api";

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const POLL_INTERVAL_MS = 5000;

  const sortedAppointments = useMemo(() => {
    const data = [...(appointments || [])];
    data.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "date") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [appointments, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>⇅</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  // Modern, flat status badge component matching your system theme
  const StatusBadge = ({ status }) => {
    let styleClass = "slick-badge ";
    switch (status) {
      case "pending":
        styleClass += "slick-badge-pending";
        break;
      case "accepted":
        styleClass += "slick-badge-accepted";
        break;
      case "confirmed":
        styleClass += "slick-badge-confirmed";
        break;
      case "in_progress":
        styleClass += "slick-badge-in_progress";
        break;
      case "completed":
        styleClass += "slick-badge-completed";
        break;
      case "cancelled":
        styleClass += "slick-badge-cancelled";
        break;
      case "rejected":
        styleClass += "slick-badge-rejected";
        break;
      default:
        styleClass += "slick-badge-secondary";
    }
    return <span className={styleClass}>{status ? status.replace("_", " ") : "N/A"}</span>;
  };

  const getAppointments = async () => {
    try {
      setIsLoading(true); // Fixed: changed from setLoading to setIsLoading
      setError(null);

      const token = sessionStorage.getItem("access_token");
      if (!token) return;

      const response = await api.get(`/appointments/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const rawData = response.data.data ?? response.data;
        const appointmentsData = Array.isArray(rawData)
          ? rawData.map((apt) => ({
              ...apt,
              client_name:
                apt.client?.first_name && apt.client?.last_name
                  ? `${apt.client.first_name} ${apt.client.last_name}`
                  : apt.client_name,
              restaurateur_name:
                apt.restaurateurs?.first_name && apt.restaurateurs?.last_name
                  ? `${apt.restaurateurs.first_name} ${apt.restaurateurs.last_name}`
                  : apt.restaurateur_name,
              service_name: apt.service?.name || apt.service_name,
              duration: apt.service?.duration || apt.duration,
              price: apt.service?.price || apt.price,
            }))
          : [];
        setAppointments(appointmentsData);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setError("Failed to stream administrative real-time schedules.");
    } finally {
      setIsLoading(false); // Fixed: changed from setLoading to setIsLoading
    }
  };

  useEffect(() => {
    getAppointments();
    const interval = setInterval(getAppointments, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="slick-workspace p-4">
      {/* Header Block */}
      <div className="slick-header mb-4">
        <h1 className="slick-title">Dashboard</h1>
        <p className="slick-subtitle">
          Welcome back, <span className="text-dark fw-semibold">Admin</span>. Mirroring operational metrics.
        </p>
      </div>

      {/* KPI Cards Strip */}
    {/* Expanded KPI Cards Strip */}
<Row className="mb-4 g-3">
  {/* Today's Appointments */}
  <Col sm={6} xl={3}>
    <div className="slick-kpi-card d-flex align-items-center gap-3">
      <div className="slick-kpi-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
        <CalendarCheck size={20} />
      </div>
      <div>
        <div className="slick-kpi-value">{appointments.length}</div>
        <div className="slick-kpi-label">Today's Bookings</div>
      </div>
    </div>
  </Col>

  {/* Real-time System Volume / Gross Revenue */}
  <Col sm={6} xl={3}>
    <div className="slick-kpi-card d-flex align-items-center gap-3">
      <div className="slick-kpi-icon-wrapper" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
        <span className="fw-bold small">Rs</span>
      </div>
      <div>
        <div className="slick-kpi-value">
          {appointments.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0).toLocaleString()}
        </div>
        <div className="slick-kpi-label">Gross Volume (Today)</div>
      </div>
    </div>
  </Col>

  {/* Active Outlets / restaurants Online */}
  <Col sm={6} xl={3}>
    <div className="slick-kpi-card d-flex align-items-center gap-3">
      <div className="slick-kpi-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
        <Landmark size={20} />
      </div>
      <div>
        <div className="slick-kpi-value">
          {[...new Set(appointments.map(a => a.restaurateur_name))].filter(Boolean).length}
        </div>
        <div className="slick-kpi-label">Active Outlets Pool</div>
      </div>
    </div>
  </Col>

  {/* Platform Fulfilment Rate */}
  <Col sm={6} xl={3}>
    <div className="slick-kpi-card d-flex align-items-center gap-3">
      <div className="slick-kpi-icon-wrapper" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
        <TrendingUp size={20} />
      </div>
      <div>
        <div className="slick-kpi-value">
          {appointments.length > 0 
            ? Math.round((appointments.filter(a => a.status === 'completed').length / appointments.length) * 100) 
            : 0}%
        </div>
        <div className="slick-kpi-label">Fulfillment Rate</div>
      </div>
    </div>
  </Col>
</Row>

      {/* Main Table Container Canvas */}
      <div className="slick-table-card">
        <div className="p-4 border-bottom border-light d-flex justify-content-between align-items-center">
          <h5 className="m-0 fw-bold text-dark" style={{ fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
            Live Booking Feed
          </h5>
          {isLoading && <Spinner animation="border" size="sm" className="text-secondary" style={{ width: '14px', height: '14px' }} />}
        </div>
        
        {error && <div className="alert alert-minimal text-danger m-3 p-2 small">{error}</div>}

        <div className="table-responsive">
          <table className="table mb-0 slick-table">
            <thead>
              <tr>
                <th className="ps-4" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("client_name")}>
                  Client <SortIcon field="client_name" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("restaurateur_name")}>
                  Provider / Shop <SortIcon field="restaurateur_name" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("service_name")}>
                  Selected Service <SortIcon field="service_name" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("date")}>
                  Scheduled Timestamp <SortIcon field="date" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("status")} className="pe-4 text-end">
                  Live Status <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAppointments.length > 0 ? (
                sortedAppointments.map((data) => (
                  <tr key={data.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-2">
                        <User size={13} className="text-slate-muted" />
                        <span className="slick-profile-name">{data.client_name || "Unknown Client"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Landmark size={13} className="text-slate-muted" />
                        <span className="text-secondary fw-medium">{data.restaurateur_name || "Merchant Hub"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <UtensilsCrossed size={13} className="text-slate-muted" />
                        <span className="text-dark fw-medium">{data.service_name || "Service Item Deleted"}</span>
                      </div>
                    </td>
                    <td className="text-mono-sub small">
                      <div className="d-flex align-items-center gap-2">
                        <Clock size={12} />
                        {data.date ? new Date(data.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "—"}
                      </div>
                    </td>
                    <td className="pe-4 text-end">
                      <StatusBadge status={data.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-5 slick-empty-state">
                    No active scheduling pipeline logs found for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;