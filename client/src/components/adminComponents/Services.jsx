// import { useEffect, useState } from "react";
// import { Card, Table, Button, Modal, Form, Row, Col } from "react-bootstrap";
// import "./admin-panel.css";
// import { Edit2, Plus, Trash2, Search } from "lucide-react";
// import api from "../../apis/api";

// const Services = () => {
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);

//   const [selectedService, setSelectedService] = useState(null);
//   const [data, setData] = useState([]);

//   const [formData, setFormData] = useState({
//     name: "",
//     price: "",
//     duration: "",
//   });
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };
//   const handleAddService = async (e) => {
//     e.preventDefault();
//     const token = sessionStorage.getItem("access_token");

//     try {
//       await api.post("/restaurateurs-services/", formData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       alert("Service added successfully");
//       setShowAddModal(false);
//       setFormData({ name: "", price: "", duration: "" });
//       await getData();
//     } catch (error) {
//       console.error("Error adding service:", error.response?.data || error);
//       alert("Failed to add service");
//     }
//   };

//   const handleEditService = async (service) => {
//     setSelectedService(service);
//     setFormData({
//       name: service.name || "",
//       price: service.price || "",
//       duration: service.duration || "",
//     });
//     setShowEditModal(true);
//   };

//   const handleUpdateService = async () => {
//     try {
//       const token = sessionStorage.getItem("access_token");
//       const service = selectedService;

//       await api.put(`/restaurateurs-services/${service.id}`, formData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       setShowEditModal(false);
//       setSelectedService(null);
//       setFormData({ name: "", price: "", duration: "" });
//       await getData();
//       alert("Service updated successfully");
//     } catch (error) {
//       console.error("Error updating service:", error.response?.data || error);
//       alert("Failed to update service");
//     }
//   };

//   const handleDeleteService = async (id) => {
//     if (window.confirm("Are you sure you want to delete this service?")) {
//       const token = sessionStorage.getItem("access_token");
//       const response = await api.delete(`/restaurateurs-services/${id}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       console.log(response.data);
//       alert("Service deleted successfully");
//       await getData();
//     }
//   };
//   const getData = async () => {
//     try {
//       const token = sessionStorage.getItem("access_token");
//       const response = await api.get("/restaurateurs-services/all", {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       const result = response.data;
//       setData(result);
//     } catch (error) {
//       console.error("Error fetching services:", error);
//     }
//   };
//   useEffect(() => {
//     getData();
//   }, []);
//   useEffect(() => {
//     if (selectedService) {
//       setFormData({
//         name: selectedService.name || "",
//         price: selectedService.price || "",
//         duration: selectedService.duration || "",
//       });
//     }
//   }, [selectedService]);
//   console.log(data);
//   return (
//     <div className="services p-3">
//       <div className="page-title d-flex justify-content-between align-items-center">
//         <div>
//           <h2>Services</h2>
//           <p className="text-muted">Manage your service offerings</p>
//         </div>
//         <Button variant="primary" onClick={() => setShowAddModal(true)}>
//           <Plus size={20} /> Add New Service
//         </Button>
//       </div>

//       <Row className="mb-4">
//         <Col md={4} className="mb-3">
//           <Card className="dashboard-card">
//             <Card.Body className="text-center">
//               <div className="card-icon bg-primary text-white mx-auto">
//                 <i className="bi bi-scissors"></i>
//               </div>
//               <h2>{data.length}</h2>
//               <p className="text-muted mb-0">Total Services</p>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>
//       <div className="table-container">
//         <Table responsive hover>
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Service</th>

//               <th>Price</th>
//               <th>Duration</th>

//               <th className="d-flex justify-content-around ">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {data?.map((service, num) => (
//               <tr key={service.id}>
//                 <td>{num + 1}</td>
//                 <td>{service.name}</td>

//                 <td>Rs.{service.price}</td>
//                 <td>{service.duration} mins</td>

//                 <td className="action-buttons d-flex justify-content-around">
//                   <Button
//                     variant="outline-primary"
//                     size="sm"
//                     onClick={() => handleEditService(service)}
//                   >
//                     <Edit2 size={20} />
//                   </Button>
//                   <Button
//                     variant="outline-danger"
//                     size="sm"
//                     onClick={() => handleDeleteService(service.id)}
//                   >
//                     <Trash2 size={20} />
//                   </Button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>
//       </div>

//       {/* Add Service Modal */}
//       <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
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
//                     placeholder="Enter the name"
//                     name="name"
//                     onChange={handleChange}
//                     value={formData.name}
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
//                     onChange={handleChange}
//                     value={formData.price}
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
//                     value={formData.duration}
//                     onChange={handleChange}
//                     required
//                   />
//                 </Form.Group>
//               </Col>
//             </Row>
//           </Form>
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowAddModal(false)}>
//             Cancel
//           </Button>
//           <Button variant="primary" onClick={handleAddService}>
//             Add Service
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       {/* Edit Service Modal */}
//       <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
//         <Modal.Header closeButton>
//           <Modal.Title>Edit Service</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           {selectedService && (
//             <Form>
//               <Row>
//                 <Col md={12}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Title</Form.Label>
//                     <Form.Control
//                       type="text"
//                       value={formData.name || ""}
//                       onChange={handleChange}
//                       name="name"
//                     />
//                   </Form.Group>
//                 </Col>
//                 <Col md={12}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Duration (in minutes)</Form.Label>
//                     <Form.Control
//                       type="number"
//                       value={formData.duration}
//                       name="duration"
//                       onChange={handleChange}
//                     />
//                   </Form.Group>
//                 </Col>
//                 <Col md={12}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Price (Rs)</Form.Label>
//                     <Form.Control
//                       type="number"
//                       name="price"
//                       value={formData.price}
//                       onChange={handleChange}
//                     />
//                   </Form.Group>
//                 </Col>
//               </Row>
//             </Form>
//           )}
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowEditModal(false)}>
//             Cancel
//           </Button>
//           <Button variant="primary" onClick={handleUpdateService}>
//             Update Service
//           </Button>
//         </Modal.Footer>
//       </Modal>
//     </div>
//   );
// };

// export default Services;
import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Row, Col, Card, InputGroup } from "react-bootstrap";
import { Edit2, Plus, Trash2, Scissors, Layers, Armchair, Search } from "lucide-react";
import { jwtDecode } from "jwt-decode";

import "./admin-panel.css";
import api from "../../apis/api";

const Services = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedService, setSelectedService] = useState(null);
  const [data, setData] = useState([]);
  const [owners, setOwners] = useState([]);
  const [tables, setTables] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("access_token");
    const decoded = token ? jwtDecode(token) : null;

    try {
      await api.post("/restaurateurs-services/", { ...formData, restaurateurId: decoded?.id }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert("Service added successfully");
      setShowAddModal(false);
      setFormData({ name: "", price: "", duration: "" });
      await getData();
    } catch (error) {
      console.error("Error adding service:", error.response?.data || error);
      alert("Failed to add service");
    }
  };

  const handleEditService = async (service) => {
    setSelectedService(service);
    setFormData({
      name: service.name || "",
      price: service.price || "",
      duration: service.duration || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateService = async () => {
    try {
      const token = sessionStorage.getItem("access_token");
      const decoded = token ? jwtDecode(token) : null;
      const service = selectedService;

      await api.put(`/restaurateurs-services/${service.id}`, { ...formData, restaurateurId: decoded?.id }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setShowEditModal(false);
      setSelectedService(null);
      setFormData({ name: "", price: "", duration: "" });
      await getData();
      alert("Service updated successfully");
    } catch (error) {
      console.error("Error updating service:", error.response?.data || error);
      alert("Failed to update service");
    }
  };

  const handleDeleteService = async (id) => {
    if (window.confirm("Are you sure you want to delete this service?")) {
      const token = sessionStorage.getItem("access_token");
      const decoded = token ? jwtDecode(token) : null;
      try {
        await api.delete(`/restaurateurs-services/${id}`, {
          data: { restaurateurId: decoded?.id },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        alert("Service deleted successfully");
        await getData();
      } catch (error) {
        console.error("Error deleting service:", error);
        alert("Failed to delete service");
      }
    }
  };

  const getData = async () => {
    try {
      const token = sessionStorage.getItem("access_token");
      const results = await Promise.allSettled([
        api.get("/restaurateurs-services/all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        api.get("/users/all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        api.get("/tables/all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const [servicesResult, usersResult, tablesResult] = results;

      const loadedServices = servicesResult.status === "fulfilled" ? (servicesResult.value.data?.services || servicesResult.value.data || []) : [];
      const loadedOwners = usersResult.status === "fulfilled" ? (usersResult.value.data?.data || usersResult.value.data || []) : [];
      const loadedTables = tablesResult.status === "fulfilled" ? (tablesResult.value.data?.data || tablesResult.value.data || []) : [];

      setData(loadedServices);
      setOwners(Array.isArray(loadedOwners) ? loadedOwners : []);
      setTables(Array.isArray(loadedTables) ? loadedTables : []);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    if (selectedService) {
      setFormData({
        name: selectedService.name || "",
        price: selectedService.price || "",
        duration: selectedService.duration || "",
      });
    }
  }, [selectedService]);

  const getAvatarColor = (name) => {
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];
    const charCode = name ? name.charCodeAt(0) : 0;
    return colors[charCode % colors.length];
  };

  const ownerMap = useMemo(() => {
    return owners.reduce((accumulator, owner) => {
      accumulator[owner.id] = `${owner.first_name || ""} ${owner.last_name || ""}`.trim() || `Owner ${owner.id}`;
      return accumulator;
    }, {});
  }, [owners]);

  const restaurantOwners = useMemo(() => owners.filter((o) => o.role === "restaurateurs"), [owners]);

  const filteredOwners = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return restaurantOwners;
    return restaurantOwners.filter((o) => {
      const ownerName = `${o.first_name || ""} ${o.last_name || ""}`.toLowerCase();
      const locName = (o.location_name || "").toLowerCase();
      return ownerName.includes(q) || locName.includes(q);
    });
  }, [restaurantOwners, searchTerm]);

  const groupedServices = useMemo(() => {
    const groups = data.reduce((accumulator, service) => {
      const ownerKey = service.restaurateurId ?? "unassigned";
      if (!accumulator[ownerKey]) {
        accumulator[ownerKey] = [];
      }
      accumulator[ownerKey].push(service);
      return accumulator;
    }, {});

    return Object.entries(groups).map(([ownerKey, services]) => ({
      ownerKey,
      ownerLabel: ownerKey === "unassigned" ? "Unassigned Services" : ownerMap[ownerKey] || `Owner ${ownerKey}`,
      services,
    }));
  }, [data, ownerMap]);

  const tableStats = useMemo(() => {
    const stats = {};
    for (const t of tables) {
      const key = t.restaurateur_id ?? "unassigned";
      if (!stats[key]) {
        stats[key] = { totalTables: 0, totalCapacity: 0, tables: [] };
      }
      stats[key].totalTables += 1;
      stats[key].totalCapacity += Number(t.capacity || 0);
      stats[key].tables.push(t);
    }
    return stats;
  }, [tables]);

  return (
    <div className="slick-workspace p-4">
      {/* Header Block */}
      <div className="slick-header d-flex justify-content-between align-items-end mb-4">
        <div>
          <h1 className="slick-title">Services and Capacity</h1>
          <p className="slick-subtitle">Manage catalog offerings, custom duration structures, pricing matrix, and seating capacity across outlets</p>
        </div>
        <Button variant="none" className="slick-btn-primary" onClick={() => { setFormData({ name: "", price: "", duration: "" }); setShowAddModal(true); }}>
          <Plus size={16} /> Add New Service
        </Button>
      </div>

      {/* Slick Control Toolbar */}
      <div className="slick-toolbar d-flex gap-3 mb-4">
        <InputGroup className="slick-search-group flex-grow-1">
          <InputGroup.Text className="slick-search-icon">
            <Search size={16} />
          </InputGroup.Text>
          <Form.Control
            className="slick-search-input"
            placeholder="Search restaurants by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>

      {/* KPI Cards Strip */}
      <Row className="mb-4">
        <Col md={4} xl={3}>
          <div className="slick-kpi-card d-flex align-items-center gap-3">
            <div className="slick-kpi-icon-wrapper">
              <Layers size={20} />
            </div>
            <div>
              <div className="slick-kpi-value">{data.length}</div>
              <div className="slick-kpi-label">Active Offerings</div>
            </div>
          </div>
        </Col>
        <Col md={4} xl={3}>
          <div className="slick-kpi-card d-flex align-items-center gap-3">
            <div className="slick-kpi-icon-wrapper">
              <Layers size={20} />
            </div>
            <div>
              <div className="slick-kpi-value">{restaurantOwners.length}</div>
              <div className="slick-kpi-label">Restaurants</div>
            </div>
          </div>
        </Col>
        <Col md={4} xl={3}>
          <div className="slick-kpi-card d-flex align-items-center gap-3">
            <div className="slick-kpi-icon-wrapper">
              <Armchair size={20} />
            </div>
            <div>
              <div className="slick-kpi-value">{tables.length}</div>
              <div className="slick-kpi-label">Configured Tables</div>
            </div>
          </div>
        </Col>
        <Col md={4} xl={3}>
          <div className="slick-kpi-card d-flex align-items-center gap-3">
            <div className="slick-kpi-icon-wrapper">
              <Armchair size={20} />
            </div>
            <div>
              <div className="slick-kpi-value">{tables.reduce((acc, t) => acc + Number(t.capacity || 0), 0)}</div>
              <div className="slick-kpi-label">Total Seating Capacity</div>
            </div>
          </div>
        </Col>
      </Row>

      {filteredOwners.length > 0 ? (
        filteredOwners.map((owner) => {
          const services = groupedServices.find((g) => String(g.ownerKey) === String(owner.id))?.services || [];
          const stats = tableStats[owner.id] || { totalTables: 0, totalCapacity: 0, tables: [] };

          return (
            <Card key={owner.id} className="slick-table-card mb-4 border-0">
              <Card.Header className="bg-transparent border-0 px-4 pt-4 pb-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h3 className="h5 mb-1">{owner.location_name || `${owner.first_name} ${owner.last_name}`}</h3>
                    <p className="text-muted mb-0">
                      {owner.location_name ? `${owner.first_name} ${owner.last_name} · ` : ""}
                      {services.length} service{services.length === 1 ? "" : "s"} · {stats.totalTables} table{stats.totalTables === 1 ? "" : "s"} · {stats.totalCapacity} seats
                    </p>
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="pt-0 px-0">
                {services.length > 0 && (
                  <Table responsive className="mb-0 slick-table">
                    <thead>
                      <tr>
                        <th className="ps-4 text-center" style={{ width: '70px' }}>#</th>
                        <th>Service Details</th>
                        <th>Price Bracket</th>
                        <th>Target Duration</th>
                        <th className="pe-4 text-end" style={{ width: '130px' }}>Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service, num) => (
                        <tr key={service.id}>
                          <td className="ps-4 text-center text-mono-sub">{num + 1}</td>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="slick-avatar"
                                style={{ backgroundColor: getAvatarColor(service.name) }}
                              >
                                <Scissors size={14} />
                              </div>
                              <div>
                                <div className="slick-profile-name">{service.name}</div>
                                <div className="slick-profile-id">SRV-{service.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="slick-price-badge">Rs. {service.price}</span>
                          </td>
                          <td>
                            <span className="text-secondary fw-medium">{service.duration} mins</span>
                          </td>
                          <td className="pe-4 text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <Button variant="none" className="slick-action-btn slick-edit-btn" onClick={() => handleEditService(service)}>
                                <Edit2 size={13} />
                              </Button>
                              <Button variant="none" className="slick-action-btn slick-delete-btn" onClick={() => handleDeleteService(service.id)}>
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
                {stats.totalTables > 0 && (
                  <Table responsive className={`mb-0 slick-table ${services.length > 0 ? "mt-3" : ""}`}>
                    <thead>
                      <tr>
                        <th className="ps-4 text-center" style={{ width: '70px' }}>#</th>
                        <th>Table Details</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th className="pe-4 text-end" style={{ width: '130px' }}>Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.tables.map((table, num) => (
                        <tr key={table.id}>
                          <td className="ps-4 text-center text-mono-sub">{num + 1}</td>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="slick-avatar" style={{ backgroundColor: "#6366f1", color: "#fff" }}>
                                <Armchair size={14} />
                              </div>
                              <div>
                                <div className="slick-profile-name">Table {table.table_number}</div>
                                <div className="slick-profile-id">TBL-{table.id}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="text-secondary fw-medium">{table.capacity} guests</span></td>
                          <td>
                            <span className={`badge ${table.is_active ? "bg-success" : "bg-secondary"}`}>
                              {table.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="pe-4 text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <Button variant="none" className="slick-action-btn slick-edit-btn" onClick={() => { window.location.href = `/admin/tables`; }}>
                                <Edit2 size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
                {services.length === 0 && stats.totalTables === 0 && (
                  <div className="text-center py-4 text-muted">No services or tables configured for this restaurant.</div>
                )}
              </Card.Body>
            </Card>
          );
        })
      ) : (
        <div className="slick-table-card text-center py-5 slick-empty-state">
          {searchTerm.trim() ? `No restaurants match "${searchTerm.trim()}".` : "No restaurants found."}
        </div>
      )}

      {/* Add Service Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered className="matte-modal-ui slick-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Add New Service</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleAddService}>
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Title / Package Designation</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Classic Beard Trim"
                name="name"
                onChange={handleChange}
                value={formData.name}
                className="matte-input"
                required
              />
            </Form.Group>
            <div className="row g-3">
              <div className="col-6">
                <Form.Group>
                  <Form.Label className="matte-label">Price (Rs)</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="500"
                    name="price"
                    onChange={handleChange}
                    value={formData.price}
                    className="matte-input"
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group>
                  <Form.Label className="matte-label">Duration (Minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="30"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="matte-input"
                    required
                  />
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="none" className="matte-modal-close" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="none" className="matte-modal-submit" onClick={handleAddService}>Catalog Service</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Service Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered className="matte-modal-ui slick-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Edit Service Attributes</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedService && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="matte-label">Title / Package Designation</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name || ""}
                  onChange={handleChange}
                  name="name"
                  className="matte-input"
                />
              </Form.Group>
              <div className="row g-3">
                <div className="col-6">
                  <Form.Group>
                    <Form.Label className="matte-label">Price (Rs)</Form.Label>
                    <Form.Control
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className="matte-input"
                    />
                  </Form.Group>
                </div>
                <div className="col-6">
                  <Form.Group>
                    <Form.Label className="matte-label">Duration (Minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.duration}
                      name="duration"
                      onChange={handleChange}
                      className="matte-input"
                    />
                  </Form.Group>
                </div>
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="none" className="matte-modal-close" onClick={() => setShowEditModal(false)}>Discard</Button>
          <Button variant="none" className="matte-modal-submit" onClick={handleUpdateService}>Save Alterations</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Services;