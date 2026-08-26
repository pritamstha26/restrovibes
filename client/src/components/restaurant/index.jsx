// import { useEffect, useState } from "react";
// import {
//   Container,
//   Row,
//   Col,
//   Navbar,
//   Nav,
//   Card,
//   Table,
//   Button,
//   Badge,
//   Modal,
//   Form,
//   Alert,
//   Spinner,
// } from "react-bootstrap";
// import {
//   FaTachometerAlt,
//   FaCalendarAlt,
//   FaUserClock,
//   FaCut,
//   FaCog,
//   FaSignOutAlt,
//   FaCheck,
//   FaTimes,
//   FaEye,
//   FaCalendar,
//   FaPhoneAlt,
//   FaEnvelope,
//   FaUser,
// } from "react-icons/fa";
// import "bootstrap/dist/css/bootstrap.min.css";
// import api from "../../apis/api";
// import { useNavigate } from "react-router-dom";
// import { jwtDecode } from "jwt-decode";
// import { Plus } from "lucide-react";

// export default function RestaurantDashboard() {
//   const [activeTab, setActiveTab] = useState("appointments");
//   const navigate = useNavigate();

//   const [appointments, setAppointments] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showAlert, setShowAlert] = useState(false);
//   const [alertMessage, setAlertMessage] = useState("");
//   const [alertVariant, setAlertVariant] = useState("success");
//   //
//   const [restaurateurInfo, setRestaurantInfo] = useState(null);
//   const [formData, setFormData] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     password: "",
//     phone_number: "",
//   });
//   const [serviceDataForm, setServiceDataForm] = useState({
//     name: "",
//     price: "",
//     duration: "",
//   });

//   const [services, setServices] = useState([]);
//   const [selectedService, setSelectedService] = useState(null);

//   const [show, setShow] = useState(false);
//   const handleClose = () => setShow(!show);
//   const handleService = (service) => {
//     setSelectedService(service);
//     setShow(true);
//   };
//   const getServices = async () => {
//     try {
//       const token = sessionStorage.getItem("access_token");
//       const response = await api.get("/restaurateurs-services/all", {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       if (response.status === 200) {
//         setServices(response.data);
//       }
//     } catch (error) {
//       console.error("Error fetching services:", error);
//     }
//   };

//   const showAlertMessage = (message, variant) => {
//     setAlertMessage(message);
//     setAlertVariant(variant);
//     setShowAlert(true);
//     setTimeout(() => setShowAlert(false), 5000);
//   };

//   // Removed viewRequestDetails as it's no longer needed

//   const getStatusVariant = (status) => {
//     switch (status) {
//       case "completed":
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

//   const handleLogout = () => {
//     sessionStorage.removeItem("access_token");
//     navigate("/login");
//   };
//   const handleAddService = async (e) => {
//     e.preventDefault();
//     const token = sessionStorage.getItem("access_token");

//     try {
//       await api.post(
//         "/restaurateurs-services/",
//         serviceDataForm,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );
//       alert("Service added successfully");
//       setShow(false);
//       location.reload();
//     } catch (error) {
//       console.error("Error adding service:", error.response?.data || error);
//       alert("Failed to add service");
//     }
//   };

//   const handleUpdateRestaurateur = async () => {
//     try {
//       const token = sessionStorage.getItem("access_token");
//       const decode = jwtDecode(token);

//       const updatedData = { ...formData };

//       // Remove password field if it's empty or only whitespace
//       if (!updatedData.password?.trim()) {
//         delete updatedData.password;
//       }

//       const response = await api.put(`/users/${decode.id}`, updatedData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       if (response.status === 200) {
//         alert("successfully ");
//         sessionStorage.removeItem("access_token");
//         navigate("/login");
//       }
//     } catch (error) {
//       console.error(
//         "An error occurred while updating the restaurateur:",
//         error,
//       );
//     }
//   };
//   const handleUpdateService = async () => {
//     const token = sessionStorage.getItem("access_token");
//     const service = selectedService;
//     await api.put(`/restaurateurs-services/${service.id}`, serviceDataForm, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     setShow(false);
//     await getServices();
//   };

//   // Handle appointment confirmation
//   const handleConfirmAppointment = async (appointmentId) => {
//     try {
//       setIsLoading(true);
//       const token = sessionStorage.getItem("access_token");

//       const response = await api.put(
//         `/appointments/${appointmentId}/confirm`,
//         {},
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );

//       if (response.status === 200) {
//         showAlertMessage("Appointment confirmed successfully!", "success");
//         // Update appointments list
//         await fetchAppointments();
//       } else {
//         showAlertMessage("Failed to confirm appointment", "danger");
//       }
//     } catch (error) {
//       console.error("Error confirming appointment:", error);
//       showAlertMessage(
//         `Error: ${error.response?.data?.message || error.message}`,
//         "danger",
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Handle appointment cancellation
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

//   // Handle marking appointment as completed
//   const handleCompleteAppointment = async (appointmentId) => {
//     try {
//       setIsLoading(true);
//       const token = sessionStorage.getItem("access_token");

//       const response = await api.put(
//         `/appointments/${appointmentId}/complete`,
//         {},
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );

//       if (response.status === 200) {
//         showAlertMessage("Appointment marked as completed!", "success");
//         // Update appointments list
//         await fetchAppointments();
//       } else {
//         showAlertMessage("Failed to complete appointment", "danger");
//       }
//     } catch (error) {
//       console.error("Error completing appointment:", error);
//       showAlertMessage(
//         `Error: ${error.response?.data?.message || error.message}`,
//         "danger",
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchAppointments = async () => {
//     try {
//       setIsLoading(true);
//       const token = sessionStorage.getItem("access_token");
//       if (!token) return;

//       const decoded = jwtDecode(token);
//       const restaurateurs = decoded.id;

//       try {
//         const response = await api.get(
//           `/appointments/restaurateurs/${restaurateurs}`,
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           },
//         );
//         if (response.status === 200) {
//           setAppointments(response.data.data || []);
//         } else {
//           console.warn(
//             "Non-200 response fetching restaurant appointments:",
//             response.status,
//             response.data,
//           );
//           setAppointments([]);
//         }
//       } catch (err) {
//         console.error(
//           "Error fetching restaurant appointments:",
//           err,
//           err.response?.data,
//         );
//         throw err;
//       }
//     } catch (error) {
//       console.error(
//         "Error fetching appointments:",
//         error,
//         error.response?.data,
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Removed fetchAllServiceRequests as it's no longer needed

//   const fetchUserById = async () => {
//     const token = sessionStorage.getItem("access_token");
//     const decode = jwtDecode(token);
//     const response = await api.get(`/users/${decode.id}`);
//     if (response.status === 200) {
//       setRestaurantInfo(response.data.data);
//     }
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };
//   const handleServiceChange = (e) => {
//     const { name, value } = e.target;
//     setServiceDataForm((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };
//   const renderDashboard = () => (
//     <div>
//       <Row className="mb-4">
//         <Col md={3}>
//           <Card className="text-center bg-primary text-white">
//             <Card.Body>
//               <h3>{appointments.length}</h3>
//               <p>Total Appointments</p>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col md={3}>
//           <Card className="text-center bg-success text-white">
//             <Card.Body>
//               <h3>
//                 {
//                   appointments.filter(
//                     (a) => a.status === "confirmed" || a.status === "completed",
//                   ).length
//                 }
//               </h3>
//               <p>Confirmed/Completed</p>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col md={3}>
//           <Card className="text-center bg-warning text-white">
//             <Card.Body>
//               <h3>
//                 {appointments.filter((a) => a.status === "pending").length}
//               </h3>
//               <p>Pending</p>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col md={3}>
//           <Card className="text-center bg-info text-white">
//             <Card.Body>
//               <h3>
//                 Rs.
//                 {appointments.reduce(
//                   (total, app) => total + parseInt(app.price || 0),
//                   0,
//                 )}
//               </h3>
//               <p>Est. Revenue</p>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>

//       <Card>
//         <Card.Header className="d-flex justify-content-between align-items-center">
//           <h5>Today's Appointments</h5>
//           <Button
//             variant="outline-primary"
//             size="sm"
//             onClick={fetchAppointments}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <>
//                 <Spinner animation="border" size="sm" className="me-1" />
//                 Loading...
//               </>
//             ) : (
//               <>
//                 <FaCalendarAlt className="me-1" /> Refresh
//               </>
//             )}
//           </Button>
//         </Card.Header>
//         <Card.Body>
//           <Table responsive striped>
//             <thead>
//               <tr>
//                 <th>Client</th>
//                 <th>Service</th>
//                 <th>Date & Time</th>
//                 <th>Status</th>
//                 <th>Duration</th>
//                 <th>Price</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {appointments.length > 0 ? (
//                 appointments.slice(0, 5).map((appointment) => (
//                   <tr key={appointment.id}>
//                     <td>{appointment.client_name}</td>
//                     <td>{appointment.service_name}</td>
//                     <td>
//                       {new Date(appointment.date).toLocaleString("en-US", {
//                         year: "numeric",
//                         month: "short",
//                         day: "numeric",
//                         hour: "2-digit",
//                         minute: "2-digit",
//                         hour12: true,
//                       })}
//                     </td>
//                     <td>
//                       <Badge bg={getStatusVariant(appointment.status)}>
//                         {appointment.status}
//                       </Badge>
//                     </td>
//                     <td>{appointment.duration} min</td>
//                     <td>Rs. {appointment.price}</td>
//                     <td>
//                       <Button
//                         variant="success"
//                         size="sm"
//                         className="me-1"
//                         disabled={appointment.status !== "pending"}
//                         onClick={() => handleConfirmAppointment(appointment.id)}
//                       >
//                         <FaCheck /> Confirm
//                       </Button>
//                       <Button
//                         variant="danger"
//                         size="sm"
//                         disabled={
//                           appointment.status === "completed" ||
//                           appointment.status === "cancelled"
//                         }
//                         onClick={() => handleCancelAppointment(appointment.id)}
//                       >
//                         <FaTimes /> Cancel
//                       </Button>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="7" className="text-center py-4">
//                     {isLoading ? (
//                       <div>
//                         <Spinner
//                           animation="border"
//                           size="sm"
//                           className="me-2"
//                         />
//                         Loading appointments...
//                       </div>
//                     ) : (
//                       "No appointments found. Your schedule is clear!"
//                     )}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </Table>
//         </Card.Body>
//       </Card>
//     </div>
//   );

//   const renderAppointments = () => (
//     <div>
//       <div className="mb-4">
//         <h1 className="display-5 fw-bold text-dark mb-2">Appointments</h1>
//         <p className="text-muted">
//           Manage all your scheduled appointments and bookings.
//         </p>
//       </div>

//       <Card className="shadow-sm border-0 mb-4">
//         <Card.Header className="bg-white d-flex justify-content-between align-items-center">
//           <h5 className="mb-0">
//             <FaCalendarAlt className="me-2 text-primary" /> All Appointments
//           </h5>
//           <Button
//             variant="outline-primary"
//             size="sm"
//             onClick={fetchAppointments}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <>
//                 <Spinner animation="border" size="sm" className="me-1" />
//                 Loading...
//               </>
//             ) : (
//               <>
//                 <FaCalendarAlt className="me-1" /> Refresh
//               </>
//             )}
//           </Button>
//         </Card.Header>
//         <Card.Body className="p-0">
//           {isLoading ? (
//             <div className="text-center py-5">
//               <Spinner animation="border" variant="primary" />
//               <p className="mt-2">Loading appointments...</p>
//             </div>
//           ) : (
//             <Table responsive hover className="mb-0">
//               <thead className="table-light">
//                 <tr>
//                   <th className="px-4 py-3">Client</th>
//                   <th className="px-4 py-3">Service</th>
//                   <th className="px-4 py-3">Date & Time</th>
//                   <th className="px-4 py-3">Duration</th>
//                   <th className="px-4 py-3">Price</th>
//                   <th className="px-4 py-3">Status</th>
//                   <th className="px-4 py-3">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {appointments.length > 0 ? (
//                   appointments.map((appointment) => (
//                     <tr key={appointment.id}>
//                       <td className="px-4 py-3">
//                         <div className="d-flex align-items-center">
//                           <div className="bg-light rounded-circle p-2 me-2">
//                             <FaUser className="text-primary" />
//                           </div>
//                           <div>
//                             <div className="fw-medium">
//                               {appointment.client_name}
//                             </div>
//                             <div className="small text-muted">
//                               ID: {appointment.client_id}
//                             </div>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-4 py-3">{appointment.service_name}</td>
//                       <td className="px-4 py-3">
//                         {new Date(appointment.date).toLocaleString("en-US", {
//                           year: "numeric",
//                           month: "short",
//                           day: "numeric",
//                           hour: "2-digit",
//                           minute: "2-digit",
//                           hour12: true,
//                         })}
//                       </td>
//                       <td className="px-4 py-3">{appointment.duration} min</td>
//                       <td className="px-4 py-3">Rs. {appointment.price}</td>
//                       <td className="px-4 py-3">
//                         <Badge bg={getStatusVariant(appointment.status)}>
//                           {appointment.status}
//                         </Badge>
//                       </td>
//                       <td className="px-4 py-3">
//                         {appointment.status === "pending" && (
//                           <Button
//                             variant="success"
//                             size="sm"
//                             className="me-1 mb-1"
//                             onClick={() =>
//                               handleConfirmAppointment(appointment.id)
//                             }
//                           >
//                             <FaCheck className="me-1" /> Confirm
//                           </Button>
//                         )}
//                         {appointment.status === "confirmed" && (
//                           <Button
//                             variant="primary"
//                             size="sm"
//                             className="me-1 mb-1"
//                             onClick={() =>
//                               handleCompleteAppointment(appointment.id)
//                             }
//                           >
//                             <FaCheck className="me-1" /> Complete
//                           </Button>
//                         )}
//                         {(appointment.status === "pending" ||
//                           appointment.status === "confirmed") && (
//                           <Button
//                             variant="danger"
//                             size="sm"
//                             className="mb-1"
//                             onClick={() =>
//                               handleCancelAppointment(appointment.id)
//                             }
//                           >
//                             <FaTimes className="me-1" /> Cancel
//                           </Button>
//                         )}
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan="7" className="text-center py-5">
//                       <div className="my-4">
//                         <FaCalendarAlt
//                           className="text-muted mb-3"
//                           style={{ fontSize: "2rem" }}
//                         />
//                         <h5>No appointments found</h5>
//                         <p className="text-muted">Your schedule is clear!</p>
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </Table>
//           )}
//         </Card.Body>
//       </Card>
//     </div>
//   );

//   // Removed renderRequests function as it's no longer needed

//   const renderServices = () => (
//     <Card>
//       <Card.Header>
//         <div className="page-title d-flex justify-content-between align-items-center">
//           <div>
//             <h2>Services</h2>
//             <p className="text-muted">Manage your service offerings</p>
//           </div>
//           <Button variant="primary" onClick={() => setShow(true)}>
//             <Plus size={20} /> Add New Service
//           </Button>
//         </div>
//       </Card.Header>
//       <Card.Body>
//         <Row>
//           {services?.map((service) => (
//             <Col md={4} className="mb-3" key={service.id}>
//               <Card className="h-100">
//                 <Card.Body className="text-center">
//                   <FaCut className="mb-2" size={30} />
//                   <Card.Title>{service?.name}</Card.Title>
//                   <Card.Text>
//                     <strong>Price:</strong> {service?.price}
//                     <br />
//                     <strong>Duration:</strong> {service?.duration}
//                   </Card.Text>
//                   <Button
//                     variant="outline-primary"
//                     size="sm"
//                     onClick={() => handleService(service)}
//                   >
//                     Edit Service
//                   </Button>
//                 </Card.Body>
//               </Card>
//             </Col>
//           ))}
//         </Row>
//       </Card.Body>
//     </Card>
//   );

//   const renderSettings = () => (
//     <Card>
//       <Card.Header>
//         <h5>Settings</h5>
//       </Card.Header>
//       <Card.Body>
//         <Form>
//           <Row>
//             <Col md={6}>
//               <Form.Group className="mb-3">
//                 <Form.Label>First name</Form.Label>
//                 <Form.Control
//                   className="text-capitalize"
//                   type="text"
//                   name="first_name"
//                   value={formData.first_name}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//             </Col>
//             <Col md={6}>
//               <Form.Group className="mb-3">
//                 <Form.Label>Last name</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="last_name"
//                   className="text-capitalize"
//                   value={formData.last_name}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//             </Col>
//             <Col md={6}>
//               <Form.Group className="mb-3">
//                 <Form.Label>Contact Phone</Form.Label>
//                 <Form.Control
//                   type="number"
//                   name="phone_number"
//                   value={formData.phone_number}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//             </Col>
//             <Col md={6}>
//               <Form.Group className="mb-3">
//                 <Form.Label>Email</Form.Label>
//                 <Form.Control
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//             </Col>{" "}
//             <Col md={6}>
//               <Form.Group className="mb-3">
//                 <Form.Label>Password</Form.Label>
//                 <Form.Control
//                   placeholder="Enter your password"
//                   type="text"
//                   name="password"
//                   value={formData.password}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//             </Col>
//           </Row>

//           <Button variant="primary" onClick={handleUpdateRestaurateur}>
//             Save Settings
//           </Button>
//         </Form>
//       </Card.Body>
//     </Card>
//   );

//   const renderContent = () => {
//     switch (activeTab) {
//       case "dashboard":
//         return renderDashboard();
//       case "appointments":
//         return renderAppointments();
//       case "services":
//         return renderServices();
//       case "settings":
//         return renderSettings();
//       default:
//         return renderDashboard();
//     }
//   };
//   useEffect(() => {
//     fetchUserById();
//     getServices();
//     fetchAppointments();
//   }, []);
//   useEffect(() => {
//     if (restaurateurInfo) {
//       setFormData({
//         first_name: restaurateurInfo.first_name,
//         last_name: restaurateurInfo.last_name,
//         email: restaurateurInfo.email,
//         password: "",
//         phone_number: restaurateurInfo.phone_number,
//       });
//     }
//   }, [restaurateurInfo]);
//   useEffect(() => {
//     if (selectedService) {
//       setServiceDataForm({
//         name: selectedService.name || "",
//         price: selectedService.price || "",

//         duration: selectedService.duration || "",
//       });
//     }
//   }, [selectedService]);
//   return (
//     <div className="d-flex" style={{ minHeight: "100vh" }}>
//       {/* Alert message */}
//       {showAlert && (
//         <div
//           className={`position-fixed top-0 start-50 translate-middle-x p-3 mt-4 alert alert-${alertVariant} alert-dismissible fade show`}
//           style={{ zIndex: 1050, maxWidth: "500px" }}
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
//       {/* Sidebar */}
//       <div
//         className="bg-dark text-white"
//         style={{ width: "250px", minHeight: "100vh" }}
//       >
//         <div className="p-3">
//           <h4 className="mb-4">
//             <FaCut className="me-2" />
//             Restaurateurs Dashboard
//           </h4>
//           <Nav className="flex-column">
//             <Nav.Link
//               className={`text-white mb-2 ${activeTab === "dashboard" ? "bg-primary rounded" : ""}`}
//               onClick={() => setActiveTab("dashboard")}
//               style={{ cursor: "pointer" }}
//             >
//               <FaTachometerAlt className="me-2" />
//               Dashboard
//             </Nav.Link>
//             <Nav.Link
//               className={`text-white mb-2 ${
//                 activeTab === "appointments" ? "bg-primary rounded" : ""
//               }`}
//               onClick={() => setActiveTab("appointments")}
//               style={{ cursor: "pointer" }}
//             >
//               <FaCalendarAlt className="me-2" />
//               Appointments
//               {appointments.filter((a) => a.status === "pending").length >
//                 0 && (
//                 <Badge bg="warning" className="ms-2">
//                   {appointments.filter((a) => a.status === "pending").length}
//                 </Badge>
//               )}
//             </Nav.Link>
//             <Nav.Link
//               className={`text-white mb-2 ${activeTab === "services" ? "bg-primary rounded" : ""}`}
//               onClick={() => setActiveTab("services")}
//               style={{ cursor: "pointer" }}
//             >
//               <FaCut className="me-2" />
//               Services
//             </Nav.Link>
//             <Nav.Link
//               className={`text-white mb-2 ${activeTab === "settings" ? "bg-primary rounded" : ""}`}
//               onClick={() => setActiveTab("settings")}
//               style={{ cursor: "pointer" }}
//             >
//               <FaCog className="me-2" />
//               Settings
//             </Nav.Link>
//             <hr />
//             <Nav.Link
//               className="text-white"
//               onClick={handleLogout}
//               style={{ cursor: "pointer" }}
//             >
//               <FaSignOutAlt className="me-2" />
//               Logout
//             </Nav.Link>
//           </Nav>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="flex-grow-1">
//         <Navbar bg="light" expand="lg" className="border-bottom">
//           <Container fluid>
//             <Navbar.Brand>
//               Welcome,
//               <span className="fw-bold text-capitalize ms-1">
//                 {formData.first_name} {formData.last_name}
//               </span>
//               !
//             </Navbar.Brand>
//             {isLoading && (
//               <div className="ms-auto me-3">
//                 <Spinner
//                   animation="border"
//                   size="sm"
//                   role="status"
//                   className="text-primary me-2"
//                 />
//                 <span className="small text-muted">Processing...</span>
//               </div>
//             )}
//             <Navbar.Text className="ms-auto">
//               {new Date().toLocaleDateString("en-US", {
//                 weekday: "long",
//                 year: "numeric",
//                 month: "long",
//                 day: "numeric",
//               })}
//             </Navbar.Text>
//           </Container>
//         </Navbar>

//         <Container fluid className="p-4">
//           {showAlert && (
//             <Alert
//               variant={alertVariant}
//               dismissible
//               onClose={() => setShowAlert(false)}
//             >
//               {alertMessage}
//             </Alert>
//           )}
//           {renderContent()}
//         </Container>
//       </div>

//       {/* Service edit Modal */}
//       <Modal show={show} onHide={handleClose}>
//         <Modal.Header closeButton>
//           <Modal.Title>Edit Services</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           <Form>
//             <Form.Group className="mb-3" controlId="edit service price">
//               <Form.Label className="fw-bold">Title</Form.Label>
//               <Form.Control
//                 type="text"
//                 value={serviceDataForm.name || ""}
//                 name="name"
//                 onChange={handleServiceChange}
//                 autoFocus
//                 required
//               />
//             </Form.Group>
//             <Form.Group className="mb-3" controlId="edit service price">
//               <Form.Label className="fw-bold">Price</Form.Label>
//               <Form.Control
//                 type="number"
//                 value={serviceDataForm?.price || ""}
//                 onChange={handleServiceChange}
//                 name="price"
//                 autoFocus
//                 required
//               />
//             </Form.Group>
//             <Form.Group className="mb-3" controlId=" edit service price">
//               <Form.Label className="fw-bold">Duration</Form.Label>
//               <Form.Control
//                 type="number"
//                 onChange={handleServiceChange}
//                 name="duration"
//                 autoFocus
//                 value={serviceDataForm?.duration || ""}
//                 required
//               />
//             </Form.Group>
//           </Form>
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="secondary" onClick={handleClose}>
//             Close
//           </Button>
//           <Button variant="primary" onClick={handleUpdateService}>
//             Save Changes
//           </Button>
//         </Modal.Footer>
//       </Modal>
//       {/* add services */}
//       <Modal show={show} onHide={setShow}>
//         <Modal.Header closeButton>
//           <Modal.Title>Add New Service</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           <Form>
//             <Row>
//               <Col md={12}>
//                 <Form.Group className="mb-3">
//                   <Form.Label>Title </Form.Label>
//                   <Form.Control
//                     type="text"
//                     placeholder="Enter the title"
//                     name="name"
//                     onChange={handleServiceChange}
//                     value={serviceDataForm.title}
//                     required
//                   />
//                 </Form.Group>
//               </Col>
//               <Col md={12}>
//                 <Form.Group className="mb-3">
//                   <Form.Label>Price (Rs)</Form.Label>
//                   <Form.Control
//                     type="number"
//                     placeholder="Enter price"
//                     name="price"
//                     onChange={handleServiceChange}
//                     value={serviceDataForm.price}
//                     required
//                   />
//                 </Form.Group>
//               </Col>
//               <Col md={12}>
//                 <Form.Group className="mb-3">
//                   <Form.Label>Duration (in minutes)</Form.Label>
//                   <Form.Control
//                     type="number"
//                     placeholder="Enter duration"
//                     name="duration"
//                     value={serviceDataForm.duration}
//                     onChange={handleServiceChange}
//                     required
//                   />
//                 </Form.Group>
//               </Col>
//             </Row>
//           </Form>
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShow(false)}>
//             Cancel
//           </Button>
//           <Button variant="primary" onClick={handleAddService}>
//             Add Service
//           </Button>
//         </Modal.Footer>
//       </Modal>
//     </div>
//   );
// }

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Container,
  Navbar,
  Nav,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import {
  FaTachometerAlt,
  FaCalendarAlt,
  FaCut,
  FaCog,
  FaSignOutAlt,
  FaChair,
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./restaurant.css";
import api from "../../apis/api";
import DashboardTab from "./tabs/DashboardTab";
import AppointmentsTab from "./tabs/AppointmentsTab";
import ServicesTab from "./tabs/ServicesTab";
import SettingsTab from "./tabs/SettingsTab";
import TablesTab from "./tabs/TablesTab";
import LocationSetup from "./LocationSetup";
import { useNavigate, useParams, NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { tab } = useParams();
  const activeTab = tab || "dashboard";
  const [isLoading, setIsLoading] = useState(false);

  // Global Context Alert System
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");

  // Core Entity States
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [restaurateurInfo, setRestaurateurInfo] = useState(null);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // Separated Dedicated Modal Handlers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const locationPrompted = useRef(false);

  // Form Initializations
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    opening_time: "09:00",
    closing_time: "18:00",
  });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    price: "",
    duration: "",
  });

  // Global Alert Displayer
  const triggerAlert = (message, variant = "success") => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4500);
  };

  // Auth & Initial Fetching
  const getAuthTokenAndId = useCallback(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return { token: null, id: null };
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded?.exp && decoded.exp * 1000 <= Date.now()) {
        sessionStorage.removeItem("access_token");
        navigate("/login");
        return { token: null, id: null };
      }
      return { token, id: decoded.id };
    } catch (err) {
      console.error("Invalid application token context context", err);
      navigate("/login");
      return { token: null, id: null };
    }
  }, [navigate]);

  const fetchProfile = useCallback(async () => {
    const { token, id } = getAuthTokenAndId();
    if (!token) return;
    try {
      const res = await api.get(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200 && res.data?.data) {
        setRestaurateurInfo(res.data.data);
      }
    } catch (err) {
      console.error("Failed fetching account data", err);
    }
  }, [getAuthTokenAndId]);

  const getServices = useCallback(async () => {
    const { token, id } = getAuthTokenAndId();
    if (!token) return;
    try {
      const response = await api.get("/restaurateurs-services/all", {
        params: { restaurateurId: id },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200) {
        setServices(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching operational records:", error);
    }
  }, [getAuthTokenAndId]);

  const fetchAppointments = useCallback(async () => {
    const { token, id } = getAuthTokenAndId();
    if (!token) return;
    try {
      setIsLoading(true);
      const response = await api.get(`/appointments/restaurateurs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200) {
        setAppointments(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading scheduling queues:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthTokenAndId]);

  useEffect(() => {
    fetchProfile();
    getServices();
    fetchAppointments();
  }, [fetchAppointments, fetchProfile, getServices]);

  // Sync profile details when loaded
  useEffect(() => {
    if (restaurateurInfo) {
      setProfileForm({
        first_name: restaurateurInfo.first_name || "",
        last_name: restaurateurInfo.last_name || "",
        email: restaurateurInfo.email || "",
        password: "",
        phone_number: restaurateurInfo.phone_number || "",
        opening_time: restaurateurInfo.opening_time ? String(restaurateurInfo.opening_time).slice(0, 5) : "09:00",
        closing_time: restaurateurInfo.closing_time ? String(restaurateurInfo.closing_time).slice(0, 5) : "18:00",
      });
    }
  }, [restaurateurInfo]);

  // Check if location is set — prompt setup if not (only once per session)
  useEffect(() => {
    if (!locationPrompted.current && restaurateurInfo && restaurateurInfo.latitude == null && restaurateurInfo.longitude == null) {
      locationPrompted.current = true;
      setShowLocationSetup(true);
    }
  }, [restaurateurInfo]);

  // Sync service schema when editing
  useEffect(() => {
    if (selectedService) {
      setServiceForm({
        name: selectedService.name || "",
        price: selectedService.price || "",
        duration: selectedService.duration || "",
      });
    } else {
      setServiceForm({ name: "", price: "", duration: "" });
    }
  }, [selectedService]);

  // Handle Input Changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setServiceForm((prev) => ({ ...prev, [name]: value }));
  };

  // Form Operations
  const handleAddService = async (e) => {
    e.preventDefault();
    const { token } = getAuthTokenAndId();
    const { id } = getAuthTokenAndId();
    try {
      await api.post("/restaurateurs-services/", { ...serviceForm, restaurateurId: id }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      triggerAlert("New service added successfully", "success");
      setShowAddModal(false);
      getServices();
    } catch (error) {
      console.error(error);
      triggerAlert("Failed to add service", "danger");
    }
  };

  const handleOpenEditModal = (service) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    const { token } = getAuthTokenAndId();
    const { id } = getAuthTokenAndId();
    if (!selectedService) return;
    try {
      await api.put(`/restaurateurs-services/${selectedService.id}`, { ...serviceForm, restaurateurId: id }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      triggerAlert("Service properties updated successfully", "success");
      setShowEditModal(false);
      setSelectedService(null);
      getServices();
    } catch (error) {
      console.error(error);
      triggerAlert("Failed updating service properties", "danger");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const { token, id } = getAuthTokenAndId();
    try {
      const payload = { ...profileForm };
      if (!payload.password?.trim()) delete payload.password;

      const response = await api.put(`/users/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200) {
        alert("Profile updated successfully. Please sign in again.");
        sessionStorage.removeItem("access_token");
        navigate("/login");
      }
    } catch (error) {
      console.error(error);
      triggerAlert("Could not finalize user profile parameters.", "danger");
    }
  };

  // Appointment Status Transitions
  const handleUpdateAppointmentStatus = async (id, actionEndpoint, alertMessage, variant) => {
    const { token } = getAuthTokenAndId();
    if (!token) return;
    try {
      setIsLoading(true);
      const response = await api.put(`/appointments/${id}/${actionEndpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200) {
        triggerAlert(alertMessage, variant);
        fetchAppointments();
      }
    } catch (error) {
      console.error(error);
      triggerAlert("Action failed on targeted booking instance.", "danger");
    } finally {
      setIsLoading(false);
    }
  };

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

  // Sub-Views Layout Components
  const renderDashboard = () => (
    <DashboardTab
      appointments={appointments}
      isLoading={isLoading}
      onSync={fetchAppointments}
      sortField={sortField}
      sortDir={sortDir}
      onSort={handleSort}
    />
  );

  const renderAppointments = () => (
    <AppointmentsTab
      appointments={appointments}
      isLoading={isLoading}
      onSync={fetchAppointments}
      sortField={sortField}
      sortDir={sortDir}
      onSort={handleSort}
      onUpdateStatus={handleUpdateAppointmentStatus}
    />
  );

  const renderServices = () => (
    <ServicesTab
      services={services}
      onAdd={() => { setSelectedService(null); setShowAddModal(true); }}
      onEdit={handleOpenEditModal}
    />
  );

  const renderSettings = () => (
    <SettingsTab
      profileForm={profileForm}
      onChange={handleProfileChange}
      onSubmit={handleUpdateProfile}
    />
  );

  const renderTables = () => (
    <TablesTab restaurateurId={restaurateurInfo?.id} />
  );

  return (
    <div className="d-flex structural-dashboard-container">
      {/* Absolute Dynamic Global Toast Notification */}
      {showAlert && (
        <div className={`matte-toast alert-variant-${alertVariant}`}>
          <span className="small fw-medium">{alertMessage}</span>
          <button type="button" className="close-mini" onClick={() => setShowAlert(false)}>×</button>
        </div>
      )}

      {/* Modern Matte Dark Sidebar Framework */}
      <div className="matte-sidebar">
        <div>
          <div className="sidebar-brand-block">
            <FaCut className="brand-logo-icon" />
            <h5 className="brand-title-text">RestroVibe</h5>
          </div>
          <Nav className="flex-column gap-2">
            {[
              { id: "dashboard", label: "Dashboard Hub", icon: FaTachometerAlt },
              { id: "appointments", label: "Bookings Registry", icon: FaCalendarAlt, badge: appointments.filter(a => a.status === "pending").length },
              { id: "services", label: "Service Tiers", icon: FaCut },
              { id: "tables", label: "Tables & Views", icon: FaChair },
              { id: "settings", label: "Workspace Config", icon: FaCog },
            ].map((tab) => (
              <Nav.Link
                key={tab.id}
                as={NavLink}
                to={`/restaurateurs/${tab.id}`}
                className={`sidebar-nav-item ${activeTab === tab.id ? "is-active" : ""}`}
              >
                <div className="d-flex align-items-center gap-3">
                  <tab.icon className="nav-icon-element" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge > 0 && <span className="sidebar-badge">{tab.badge}</span>}
              </Nav.Link>
            ))}
          </Nav>
        </div>
        <Nav.Link className="sidebar-logout-link" onClick={handleLogout}>
          <FaSignOutAlt /> <span>Disconnect Session</span>
        </Nav.Link>
      </div>

      {/* Primary Content Field */}
      <div className="dashboard-content-canvas">
        <Navbar className="canvas-header-navbar">
          <span className="user-session-indicator">
            Active Operator: <strong className="text-capitalize">{profileForm.first_name || "Merchant"}</strong>
          </span>
          <span className="header-date-string">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </Navbar>

        <Container fluid className="p-4 flex-grow-1">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "appointments" && renderAppointments()}
          {activeTab === "services" && renderServices()}
          {activeTab === "tables" && renderTables()}
          {activeTab === "settings" && renderSettings()}
        </Container>
      </div>

      {/* Modal Block A: Add Service Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered className="matte-modal-ui">
        <Modal.Header closeButton className="border-0 pb-0"><Modal.Title className="modal-heading">Add New Catalog Item</Modal.Title></Modal.Header>
        <Form onSubmit={handleAddService}>
          <Modal.Body className="pt-3">
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Service Name</Form.Label>
              <Form.Control type="text" className="matte-input" name="name" value={serviceForm.name} onChange={handleServiceChange} required placeholder="e.g., Beard Trim & Lineup" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Rate Cost (Rs)</Form.Label>
              <Form.Control type="number" className="matte-input" name="price" value={serviceForm.price} onChange={handleServiceChange} required placeholder="500" />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="matte-label">Estimated Allocation Time (Minutes)</Form.Label>
              <Form.Control type="number" className="matte-input" name="duration" value={serviceForm.duration} onChange={handleServiceChange} required placeholder="30" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="none" className="matte-modal-close" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="none" className="matte-modal-submit" type="submit">Publish Service</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Block B: Edit Service Modal */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setSelectedService(null); }} centered className="matte-modal-ui">
        <Modal.Header closeButton className="border-0 pb-0"><Modal.Title className="modal-heading">Modify Catalog Properties</Modal.Title></Modal.Header>
        <Form onSubmit={handleUpdateService}>
          <Modal.Body className="pt-3">
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Service Title</Form.Label>
              <Form.Control type="text" className="matte-input" name="name" value={serviceForm.name} onChange={handleServiceChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Pricing Structure (Rs)</Form.Label>
              <Form.Control type="number" className="matte-input" name="price" value={serviceForm.price} onChange={handleServiceChange} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="matte-label">Session Windows Length (Minutes)</Form.Label>
              <Form.Control type="number" className="matte-input" name="duration" value={serviceForm.duration} onChange={handleServiceChange} required />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="none" className="matte-modal-close" onClick={() => { setShowEditModal(false); setSelectedService(null); }}>Discard</Button>
            <Button variant="none" className="matte-modal-submit" type="submit">Apply Mutation</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {showLocationSetup && (
        <LocationSetup
          onSaved={() => {
            setShowLocationSetup(false);
            fetchProfile();
          }}
          onSkip={() => setShowLocationSetup(false)}
        />
      )}
    </div>
  );
}