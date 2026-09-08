// import React, { useState, useEffect } from "react";
// import {
//   Container,
//   Row,
//   Col,
//   Card,
//   Table,
//   Badge,
//   Button,
//   Alert,
// } from "react-bootstrap";
// import {
//   FaCalendarAlt,
//   FaClock,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaExclamationCircle,
//   FaUserAlt,
//   FaCalendar,
//   FaList,
// } from "react-icons/fa";
// import { ImCross } from "react-icons/im";
// import api from "../../apis/api";
// import { Spinner } from "react-bootstrap";
// import { jwtDecode } from "jwt-decode";

// const Dashboard = () => {
//   const [allServiceRequests, setAllServiceRequests] = useState([]);
//   const [appointments, setAppointments] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showAlert, setShowAlert] = useState(false);
//   const [alertMessage, setAlertMessage] = useState("");
//   const [alertVariant, setAlertVariant] = useState("success");

//   const getStatusVariant = (status) => {
//     switch (status) {
//       case "completed":
//       case "accepted":
//         return "success";
//       case "confirmed":
//         return "success";
//       case "in_progress":
//         return "primary";
//       case "pending":
//         return "warning";
//       case "cancelled":
//         return "danger";
//       default:
//         return "secondary";
//     }
//   };

//   const stats = {
//     total: allServiceRequests.length,
//     completed: allServiceRequests.filter((r) => r.status === "completed")
//       .length,
//     terminated: allServiceRequests.filter((r) => r.status === "cancelled")
//       .length,
//     pending: allServiceRequests.filter((r) => r.status === "pending").length,
//     appointments: appointments.length,
//   };

//   const fetchServiceRequests = async () => {
//     try {
//       const response = await api.get("/services");
//       if (response.status === 200) {
//         setAllServiceRequests(response.data);
//       }
//     } catch (error) {
//       console.error("Error fetching service requests:", error);
//     }
//   };

//   const showAlertMessage = (message, variant) => {
//     setAlertMessage(message);
//     setAlertVariant(variant);
//     setShowAlert(true);
//     setTimeout(() => setShowAlert(false), 5000);
//   };

//   const fetchAppointments = async () => {
//     try {
//       setIsLoading(true);
//       const token = sessionStorage.getItem("access_token");
//       if (!token) return;

//       const decoded = jwtDecode(token);
//       const userId = decoded.id;
//       console.log("Decoded token for appointments (client):", decoded);
//       if (!userId) {
//         console.error("No userId found in token, skipping appointments fetch");
//         return;
//       }

//       // Call the canonical endpoint. If backend fails, surface its message.
//       try {
//         const response = await api.get(`/appointments/client/${userId}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (response.status === 200) {
//           setAppointments(response.data.data || []);
//         } else {
//           console.warn(
//             "Non-200 response fetching appointments:",
//             response.status,
//             response.data,
//           );
//           setAppointments([]);
//         }
//       } catch (err) {
//         console.error(
//           "Error fetching appointments (single endpoint):",
//           err,
//           err.response?.data,
//         );
//         const serverMessage =
//           err.response?.data?.message || err.response?.data || err.message;

//         // Save initial failure info

//         // If the error indicates Sequelize multiple associations, try safe fallbacks
//         const assocErrorText =
//           typeof serverMessage === "string"
//             ? serverMessage
//             : JSON.stringify(serverMessage || "");

//         if (
//           assocErrorText.includes(
//             "associated to AppointmentModel multiple times",
//           ) ||
//           assocErrorText.includes("specify the alias")
//         ) {
//           // Try a short list of fallback endpoints that some backends expose
//           const fallbacks = [
//             `/appointments?client_id=${userId}`,
//             `/appointments?user_id=${userId}`,
//             `/appointments?client=${userId}`,
//             `/appointments?user=${userId}`,
//           ];

//           let fallbackSuccess = false;
//           for (const ep of fallbacks) {
//             try {
//               const r = await api.get(ep, {
//                 headers: { Authorization: `Bearer ${token}` },
//               });
//               setDebugInfo((d) => ({
//                 ...d,
//                 fallbackAttempt: { endpoint: ep, response: r.data },
//               }));
//               if (r.status === 200) {
//                 setAppointments(r.data.data || r.data || []);
//                 fallbackSuccess = true;
//                 break;
//               }
//             } catch (e2) {
//               // continue trying next fallback
//               setDebugInfo((d) => ({
//                 ...d,
//                 fallbackAttempt: {
//                   endpoint: ep,
//                   error: e2.response?.data || e2.message,
//                 },
//               }));
//             }
//           }

//           if (!fallbackSuccess) {
//             showAlertMessage(
//               `Server error fetching appointments: ${assocErrorText}. Backend needs association alias fix.`,
//               "danger",
//             );
//             setAppointments([]);
//           }
//         } else {
//           showAlertMessage(
//             `Failed to load appointments: ${JSON.stringify(serverMessage)}`,
//             "danger",
//           );
//         }
//       }
//     } catch (error) {
//       console.error(
//         "Error fetching appointments:",
//         error,
//         error.response?.data,
//       );
//       const serverMessage =
//         error.response?.data?.message || error.response?.data || error.message;
//       showAlertMessage(
//         `Failed to load appointments: ${JSON.stringify(serverMessage)}`,
//         "danger",
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleCancelAppointment = async (appointmentId) => {
//     try {
//       if (
//         !window.confirm("Are you sure you want to cancel this appointment?")
//       ) {
//         return;
//       }

//       setIsLoading(true);
//       const token = sessionStorage.getItem("access_token");

//       const response = await api.put(
//         `/appointments/${appointmentId}/cancel`,
//         {},
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );

//       if (response.status === 200) {
//         showAlertMessage("Appointment cancelled successfully!", "warning");
//         // Update appointments list
//         await fetchAppointments();
//       } else {
//         showAlertMessage("Failed to cancel appointment", "danger");
//       }
//     } catch (error) {
//       console.error("Error cancelling appointment:", error);
//       showAlertMessage(
//         `Error: ${error.response?.data?.message || error.message}`,
//         "danger",
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchServiceRequests();
//     fetchAppointments();
//   }, []);
//   return (
//     <Container fluid className="p-4">
//       <div className="mb-4">
//         <h1 className="display-5 fw-bold text-dark mb-2">Dashboard</h1>
//         <p className="text-muted">
//           Welcome back! Here's an overview of your appointments and service
//           requests.
//         </p>
//       </div>

//       {/* Stats Cards */}
//       <Row className="g-4 mb-4">
//         <Col md={3}>
//           <Card className="h-100 border-0 shadow-sm">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <Card.Text className="text-muted mb-1 small">
//                     Total Requests
//                   </Card.Text>
//                   <Card.Title className="display-6 fw-bold mb-0">
//                     {stats.total}
//                   </Card.Title>
//                 </div>
//                 <div className="bg-primary bg-opacity-10 p-3 rounded">
//                   <FaCalendarAlt className="text-primary fs-4" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>

//         <Col md={3}>
//           <Card className="h-100 border-0 shadow-sm">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <Card.Text className="text-muted mb-1 small">
//                     Completed
//                   </Card.Text>
//                   <Card.Title className="display-6 fw-bold mb-0 text-success">
//                     {stats.completed}
//                   </Card.Title>
//                 </div>
//                 <div className="bg-success bg-opacity-10 p-3 rounded">
//                   <FaCheckCircle className="text-success fs-4" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>

//         <Col md={3}>
//           <Card className="h-100 border-0 shadow-sm">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <Card.Text className="text-muted mb-1 small">
//                     Terminated
//                   </Card.Text>
//                   <Card.Title className="display-6 fw-bold mb-0 text-primary">
//                     {stats.terminated}
//                   </Card.Title>
//                 </div>
//                 <div className="bg-primary bg-opacity-10 p-3 rounded">
//                   <FaClock className="text-primary fs-4" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>

//         <Col md={3}>
//           <Card className="h-100 border-0 shadow-sm">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <Card.Text className="text-muted mb-1 small">
//                     Pending
//                   </Card.Text>
//                   <Card.Title className="display-6 fw-bold mb-0 text-warning">
//                     {stats.pending}
//                   </Card.Title>
//                 </div>
//                 <div className="bg-warning bg-opacity-10 p-3 rounded">
//                   <FaExclamationCircle className="text-warning fs-4" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>

//         <Col md={3}>
//           <Card className="h-100 border-0 shadow-sm">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <Card.Text className="text-muted mb-1 small">
//                     Appointments
//                   </Card.Text>
//                   <Card.Title className="display-6 fw-bold mb-0 text-info">
//                     {stats.appointments}
//                   </Card.Title>
//                 </div>
//                 <div className="bg-info bg-opacity-10 p-3 rounded">
//                   <FaCalendar className="text-info fs-4" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>

//       {/* Appointments Card */}
//       {/* Alert message */}
//       {showAlert && (
//         <div
//           className={`alert alert-${alertVariant} alert-dismissible fade show mb-4`}
//           role="alert"
//         >
//           {alertMessage}
//           <button
//             type="button"
//             className="btn-close"
//             onClick={() => setShowAlert(false)}
//             aria-label="Close"
//           ></button>
//         </div>
//       )}

//       <Card className="border-0 shadow-sm mb-4">
//         <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
//           <Card.Title className="mb-0 h5">
//             <FaCalendar className="me-2 text-primary" /> Your Appointments
//           </Card.Title>
//           <Button
//             variant="outline-primary"
//             size="sm"
//             onClick={() => fetchAppointments()}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <>
//                 <Spinner animation="border" size="sm" className="me-2" />
//                 Loading...
//               </>
//             ) : (
//               "Refresh"
//             )}
//           </Button>
//         </Card.Header>
//         <Card.Body>
//           {appointments && appointments.length > 0 ? (
//             <Row>
//               {appointments.map((appointment) => (
//                 <Col md={4} key={appointment.id} className="mb-3">
//                   <Card className="h-100 border-0 shadow-sm">
//                     <Card.Header className="bg-light">
//                       <h6 className="mb-0 text-primary">
//                         {appointment.service_name}
//                       </h6>
//                     </Card.Header>
//                     <Card.Body>
//                       <div className="d-flex align-items-center mb-3">
//                         <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
//                           <FaUserAlt className="text-primary fs-4" />
//                         </div>
//                         <div>
//                           <h5 className="mb-0">
//                             {appointment.restaurateur_name ||
//                               "No Restaurant Assigned"}
//                           </h5>
//                           <p className="text-muted small mb-0">
//                             Your Restaurant
//                           </p>
//                         </div>
//                       </div>
//                       <div className="mb-2">
//                         <strong>Date & Time:</strong>{" "}
//                         {new Date(appointment.date).toLocaleString("en-US", {
//                           year: "numeric",
//                           month: "short",
//                           day: "numeric",
//                           hour: "2-digit",
//                           minute: "2-digit",
//                           hour12: true,
//                         })}
//                       </div>
//                       <div className="mb-2">
//                         <strong>Duration:</strong> {appointment.duration}{" "}
//                         minutes
//                       </div>
//                       <div className="mb-2">
//                         <strong>Price:</strong> Rs. {appointment.price}
//                       </div>
//                       <div className="mb-2">
//                         <strong>Status:</strong>{" "}
//                         <Badge bg={getStatusVariant(appointment.status)}>
//                           {appointment.status}
//                         </Badge>
//                       </div>
//                     </Card.Body>
//                     <Card.Footer className="bg-white border-top">
//                       <Button
//                         variant="outline-danger"
//                         size="sm"
//                         className="w-100"
//                         disabled={
//                           appointment.status === "completed" ||
//                           appointment.status === "cancelled"
//                         }
//                         onClick={() => handleCancelAppointment(appointment.id)}
//                       >
//                         Cancel Appointment
//                       </Button>
//                     </Card.Footer>
//                   </Card>
//                 </Col>
//               ))}
//             </Row>
//           ) : (
//             <Alert variant="info">
//               You have no scheduled appointments. Visit the Nearby Restaurant
//               section to book an appointment.
//             </Alert>
//           )}
//         </Card.Body>
//       </Card>

//       {/* Requests Table */}
//     </Container>
//   );
// };

// export default Dashboard;
import React, { useState, useEffect } from "react";
import { Container, Table, Badge, Spinner } from "react-bootstrap";
import {
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaCalendar,
  FaSyncAlt,
  FaMapMarkerAlt
} from "react-icons/fa";
import api from "../../apis/api";
import { jwtDecode } from "jwt-decode";
import { usePolling } from "../../hooks/usePolling";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [allServiceRequests, setAllServiceRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");

  const normalizeAppointments = (raw) => {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((appt) => {
      const source = appt.restaurateurs || appt.restaurant || appt.restaurateur || {};
      const name =
        appt.restaurateur_name ||
        appt.restaurateurs_name ||
        appt.restaurant_name ||
        (source.first_name && source.last_name
          ? `${source.first_name} ${source.last_name}`
          : source.name) ||
        "Unassigned Provider";

      return {
        ...appt,
        restaurateur_name: name,
        restaurateur_location:
          appt.restaurateur_location ||
          source.location_name ||
          appt.restaurant_location ||
          null,
      };
    });
  };

  const stats = {
    total: allServiceRequests.length,
    completed: allServiceRequests.filter((r) => r.status === "completed").length,
    terminated: allServiceRequests.filter((r) => r.status === "cancelled").length,
    pending: allServiceRequests.filter((r) => r.status === "pending").length,
    appointments: appointments.length,
  };

  const fetchServiceRequests = async () => {
    try {
      const response = await api.get("/services");
      if (response.status === 200) {
        setAllServiceRequests(response.data);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const showAlertMessage = (message, variant) => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  const fetchAppointments = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const token = sessionStorage.getItem("access_token");
      if (!token) return;

      const decoded = jwtDecode(token);
      const userId = decoded.id;
      if (!userId) return;

      try {
        const response = await api.get(`/appointments/client/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 200) {
          setAppointments(normalizeAppointments(response.data.data || []));
        } else {
          setAppointments([]);
        }
      } catch (err) {
        const serverMessage = err.response?.data?.message || err.response?.data || err.message;
        const assocErrorText = typeof serverMessage === "string" ? serverMessage : JSON.stringify(serverMessage || "");

        if (
          assocErrorText.includes("associated to AppointmentModel multiple times") ||
          assocErrorText.includes("specify the alias")
        ) {
          const fallbacks = [
            `/appointments?client_id=${userId}`,
            `/appointments?user_id=${userId}`,
          ];

          let fallbackSuccess = false;
          for (const ep of fallbacks) {
            try {
              const r = await api.get(ep, { headers: { Authorization: `Bearer ${token}` } });
              if (r.status === 200) {
                setAppointments(normalizeAppointments(r.data.data || r.data || []));
                fallbackSuccess = true;
                break;
              }
            } catch (e) {
              console.warn(`Fallback endpoint ${ep} failed:`, e.response?.data || e.message);
            }
          }

          if (!fallbackSuccess) {
            showAlertMessage("Relational infrastructure misalignment.", "danger");
          }
        } else {
          showAlertMessage(`Fetch exception: ${JSON.stringify(serverMessage)}`, "danger");
        }
      }
    } catch (error) {
      showAlertMessage("System failure fetching logs.", "danger");
      console.error("Error fetching appointments:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (appointment) => {
    try {
      const ids = (appointment.items && appointment.items.length
        ? appointment.items.map((i) => i.id)
        : [appointment.id]).filter(Boolean);
      if (ids.length === 0) return;

      const count = ids.length > 1 ? ` ${ids.length} line items` : "";
      if (!window.confirm(`Are you sure you want to cancel this booking${count}?`)) {
        return;
      }

      setIsLoading(true);
      const token = sessionStorage.getItem("access_token");

      let cancelled = 0;
      for (const id of ids) {
        const response = await api.put(
          `/appointments/${id}/cancel`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.status === 200) cancelled++;
      }

      if (cancelled === ids.length) {
        showAlertMessage("Booking cancelled successfully!", "warning");
      } else if (cancelled > 0) {
        showAlertMessage("Partially cancelled the booking", "warning");
      } else {
        showAlertMessage("Failed to cancel booking", "danger");
      }
      await fetchAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      showAlertMessage(`Error: ${error.response?.data?.message || error.message}`, "danger");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceRequests();
    fetchAppointments();
  }, []);

  usePolling(() => fetchAppointments(true), 5000);

  return (
    <div className="v-dashboard-root">
      {/* Scope Subheader Nav */}
      <div className="v-nav-scope">
        <div className="v-scope-container">
          <div className="v-scope-switcher">
            <span className="v-org">Personal Space</span>
            <span className="v-slash">/</span>
            <span className="v-project">Overview</span>
          </div>
        </div>
      </div>

      <Container fluid className="v-main-layout">
        {/* Dynamic Vercel System Metrics Grid */}
        <div className="v-metrics-grid">
          <div className="v-metric-card">
            <div className="v-metric-title">TOTAL REQUESTS</div>
            <div className="v-metric-num">{stats.total}</div>
          </div>
          <div className="v-metric-card">
            <div className="v-metric-title">COMPLETED SYSTEMS</div>
            <div className="v-metric-num text-success">{stats.completed}</div>
          </div>
          <div className="v-metric-card">
            <div className="v-metric-title">TERMINATED PIPELINES</div>
            <div className="v-metric-num">{stats.terminated}</div>
          </div>
          <div className="v-metric-card">
            <div className="v-metric-title">PENDING POOL</div>
            <div className="v-metric-num text-warning">{stats.pending}</div>
          </div>
          <div className="v-metric-card">
            <div className="v-metric-title">ACTIVE ARRANGEMENTS</div>
            <div className="v-metric-num text-info">{stats.appointments}</div>
          </div>
        </div>

        {showAlert && (
          <div className={`v-banner v-banner-${alertVariant}`}>
            <span className="v-banner-text">{alertMessage}</span>
            <button className="v-banner-close" onClick={() => setShowAlert(false)}>×</button>
          </div>
        )}

        {(() => {
          const upcoming = (appointments || [])
            .filter((app) => app.status !== "cancelled")
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .at(0);

          if (!upcoming) return null;

          return (
            <div className="v-block-card mb-4">
              <div className="v-block-header">
                <h2 className="v-block-heading">Next Destination</h2>
              </div>
              <div className="v-block-body p-3">
                <div className="d-flex flex-column gap-2">
                  <div>
                    <div className="text-muted small font-monospace" style={{ fontSize: "0.7rem" }}>
                      DESTINATION
                    </div>
                    <div className="v-cell-main" style={{ fontSize: "1.1rem" }}>
                      {upcoming.restaurateur_name || "Restaurant"}
                    </div>
                    {upcoming.restaurateur_location && (
                      <div className="font-monospace text-muted" style={{ fontSize: "0.85rem" }}>
                        <FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} />
                        {upcoming.restaurateur_location}
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-3 flex-wrap">
                    <div>
                      <div className="text-muted small font-monospace" style={{ fontSize: "0.7rem" }}>
                        SERVICE
                      </div>
                      <div className="font-medium">
                        {(upcoming.items && upcoming.items.length
                          ? upcoming.items.map((it) => `${it.service_name}${Number(it.quantity) > 1 ? ` × ${it.quantity}` : ""}`).join(", ")
                          : upcoming.service_name) || "Unknown Service"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted small font-monospace" style={{ fontSize: "0.7rem" }}>
                        SCHEDULED
                      </div>
                      <div className="font-monospace">
                        {new Date(upcoming.date).toLocaleString("en-US", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted small font-monospace" style={{ fontSize: "0.7rem" }}>
                        STATUS
                      </div>
                      <div>
                        <span className={`v-status-flag v-status-flag-${upcoming.status}`}>
                          {upcoming.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Deployments Section Block */}
        <div className="v-block-card">
          <div className="v-block-header">
            <h2 className="v-block-heading">Production Deployments</h2>
            <button className="v-btn-geist" onClick={fetchAppointments} disabled={isLoading}>
              {isLoading ? <Spinner animation="border" size="sm" /> : <FaSyncAlt />}
              <span className="ms-2">Refresh Stream</span>
            </button>
          </div>

          <div className="v-block-body">
            {appointments && appointments.length > 0 ? (
              <div className="v-table-wrapper">
                <Table responsive className="v-geist-table mb-0">
                  <thead>
                    <tr>
                      <th>SERVICE NAME</th>
                      <th>PROVIDER</th>
                      <th>SCHEDULED INSTANT</th>
                      <th>METRIC</th>
                      <th>COST RUNTIME</th>
                      <th>STATUS</th>
                      <th className="text-end">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((app) => {
                      const items = (app.items && app.items.length ? app.items : [app]);
                      const canCancel = app.status !== "cancelled" && app.status !== "completed" && app.status !== "no_show";
                      const primaryId = app.primary_id || app.id || items[0]?.id;
                      const grandTotal =
                        app.grand_total != null
                          ? Number(app.grand_total)
                          : items.reduce((sum, it) => sum + Number(it.booked_price ?? it.price ?? 0), 0);
                      return (
                        <tr key={primaryId} style={{ cursor: "pointer" }} onClick={() => navigate(`/appointments/${primaryId}`)}>
                          <td className="v-cell-main">
                            {items.map((it) => (
                              <div key={it.id} className="v-service-line">
                                <span>{it.service_name || "Unknown Service"}</span>
                                <span className="v-service-qty">× {it.quantity}</span>
                              </div>
                            ))}
                          </td>
                          <td>
                            <div className="v-cell-main">{app.restaurateur_name || "Unassigned Provider"}</div>
                            {app.restaurateur_location && (
                              <div className="text-muted font-monospace" style={{ fontSize: "0.7rem" }}>
                                {app.restaurateur_location}
                              </div>
                            )}
                          </td>
                          <td className="v-cell-mono">
                            {new Date(app.date).toLocaleString("en-US", {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false
                            })}
                          </td>
                          <td>{items[0]?.duration || app.duration}m</td>
                          <td className="v-cell-mono fw-medium">
                            <div>NPR {grandTotal.toLocaleString()}</div>
                            {items.length > 1 && (
                              <div className="text-muted font-monospace lh-1 mt-1" style={{ fontSize: "0.68rem" }}>
                                {items.length} items
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`v-status-flag v-status-flag-${app.status}`}>
                              {app.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="text-end">
                            {canCancel && (
                              <button
                                className="v-btn-geist"
                                style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                                onClick={() => handleCancelAppointment(app)}
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="v-empty-zone">
                <p>No active continuous deployment nodes detected inside this layout structure.</p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Dashboard;
