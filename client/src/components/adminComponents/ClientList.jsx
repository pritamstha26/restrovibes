// import { Edit2, Plus, Trash2, Search } from "lucide-react";
// import { useEffect, useState } from "react";
// import { Table, Button, Badge, Modal, Form, InputGroup } from "react-bootstrap";

// import "./admin-panel.css";
// import { useAppointments } from "../../context/Appointment_context";
// import api from "../../apis/api";
// export const ClientList = () => {
//   const { clientList, setList } = useAppointments();
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedClient, setSelectedClient] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [formData, setFormData] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     password: "",
//     phone_number: "",
//     role: "client",
//   });

//   const handleAddClient = async () => {
//     try {
//       const token = sessionStorage.getItem("access_token");

//       const addData = { ...formData };

//       const response = await api.post(`/auth/register`, addData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       if (response.status === 201) {
//         alert("successfully updated");
//         window.location.reload();
//       }
//     } catch (error) {
//       console.error("An error occurred while adding the client:", error);
//     }

//     setShowAddModal(false);
//   };

//   const handleEditClient = (client) => {
//     setSelectedClient(client);
//     setShowEditModal(true);
//   };

//   const handleUpdateClient = async (client) => {
//     try {
//       const token = sessionStorage.getItem("access_token");

//       const updatedData = { ...formData };

//       // Remove password field if it's empty or only whitespace
//       if (!updatedData.password?.trim()) {
//         delete updatedData.password;
//       }

//       const response = await api.put(`/users/${client.id}`, updatedData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       if (response.status === 200) {
//         alert("successfully updated");

//         window.location.reload();
//       }
//     } catch (error) {
//       console.error("An error occurred while updating the client:", error);
//     }
//     setShowEditModal(false);
//   };

//   const filterClient = clientList.filter(
//     (client) =>
//       client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       client.last_name.includes(searchTerm),
//   );
//   const handleDeleteClient = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this user?")) return;

//     try {
//       const token = sessionStorage.getItem("access_token");
//       if (!token) {
//         alert("No token found, please login again.");
//         return;
//       }

//       const response = await api.delete(`/users/delete/${id}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (response.data.success) {
//         alert(response.data.message); // "User deleted successfully, related appointments cancelled"
//         // Update your local list by filtering out deleted user
//         setList((prevList) => prevList.filter((user) => user.id !== id));
//       } else {
//         alert(response.data.message || "Failed to delete user");
//       }
//     } catch (error) {
//       console.error("An error occurred while deleting the user:", error);
//       alert("Something went wrong while deleting the user.");
//     }
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };
//   useEffect(() => {
//     if (selectedClient) {
//       setFormData({
//         first_name: selectedClient.first_name,
//         last_name: selectedClient.last_name,
//         email: selectedClient.email,
//         password: "",
//         phone_number: selectedClient.phone_number,
//       });
//     }
//   }, [selectedClient]);
//   return (
//     <div className=" p-3">
//       <div className="page-title d-flex justify-content-between align-items-center">
//         <div>
//           <h2 className="">Client List</h2>
//           <p className="text-muted">Manage your clients</p>
//         </div>
//         <Button variant="primary" onClick={() => setShowAddModal(true)}>
//           <Plus size={20} /> Add New Client
//         </Button>
//       </div>
//       <div className="mb-3">
//         <InputGroup>
//           <InputGroup.Text>
//             <Search />
//           </InputGroup.Text>
//           <Form.Control
//             placeholder="Search clients..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </InputGroup>
//       </div>
//       <div className="table-container ">
//         <Table responsive hover>
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Name</th>

//               <th>Email</th>
//               <th>Phone no.</th>
//               <th className="d-flex justify-content-center">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filterClient.map((client, num) => (
//               <tr key={client.id}>
//                 <td className="py-3">{num + 1}</td>
//                 <td className="py-3">
//                   {client.first_name} {client.last_name}
//                 </td>
//                 <td className="py-3">
//                   <div>{client.email}</div>
//                 </td>

//                 <td className="py-3">{client.phone_number}</td>
//                 <td className="action-buttons d-flex justify-content-around py-3  ">
//                   <Button
//                     variant="outline-primary"
//                     size="sm"
//                     onClick={() => handleEditClient(client)}
//                   >
//                     <Edit2 size={20} />
//                   </Button>
//                   <Button
//                     variant="outline-danger"
//                     size="sm"
//                     onClick={() => handleDeleteClient(client.id)}
//                   >
//                     <Trash2 size={20} />
//                   </Button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>
//       </div>

//       {/* Add Client Modal */}
//       <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
//         <Modal.Header closeButton>
//           <Modal.Title>Add New Client</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           <Form>
//             <Form.Group className="mb-3">
//               <Form.Label>First name</Form.Label>
//               <Form.Control
//                 type="text"
//                 name="first_name"
//                 value={formData.first_name}
//                 placeholder="Enter first name"
//                 onChange={handleInputChange}
//               />
//             </Form.Group>
//             <Form.Group className="mb-3">
//               <Form.Label>Last name</Form.Label>
//               <Form.Control
//                 type="text"
//                 name="last_name"
//                 value={formData.last_name}
//                 placeholder="Enter last name"
//                 onChange={handleInputChange}
//               />
//             </Form.Group>
//             <Form.Group className="mb-3">
//               <Form.Label>Phone number</Form.Label>
//               <Form.Control
//                 type="number"
//                 name="phone_number"
//                 value={formData.phone_number}
//                 placeholder="Enter phone number"
//                 onChange={handleInputChange}
//               />
//             </Form.Group>
//             <Form.Group className="mb-3">
//               <Form.Label>Email</Form.Label>
//               <Form.Control
//                 type="email"
//                 name="email"
//                 value={formData.email}
//                 placeholder="Enter email"
//                 onChange={handleInputChange}
//               />
//             </Form.Group>
//             <Form.Group className="mb-3">
//               <Form.Label>Password</Form.Label>
//               <Form.Control
//                 type="email"
//                 name="password"
//                 value={formData.password}
//                 placeholder="Enter password"
//                 onChange={handleInputChange}
//               />
//             </Form.Group>
//           </Form>
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowAddModal(false)}>
//             Cancel
//           </Button>
//           <Button variant="primary" onClick={handleAddClient}>
//             Add Client
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       {/* Edit Client Modal */}
//       <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
//         <Modal.Header closeButton>
//           <Modal.Title>Edit Client</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           {selectedClient && (
//             <Form>
//               <Form.Group className="mb-3">
//                 <Form.Label>First name</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="first_name"
//                   value={formData.first_name}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>

//               <Form.Group className="mb-3">
//                 <Form.Label>Last name</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="last_name"
//                   value={formData.last_name}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//               <Form.Group className="mb-3">
//                 <Form.Label>Phone no.</Form.Label>
//                 <Form.Control
//                   type="number"
//                   name="phone_number"
//                   placeholder="Phone no."
//                   value={formData.phone_number}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//               <Form.Group className="mb-3">
//                 <Form.Label>Email</Form.Label>
//                 <Form.Control
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//               <Form.Group className="mb-3">
//                 <Form.Label>Password</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="password"
//                   value={formData.password}
//                   placeholder="Enter new password"
//                   onChange={handleInputChange}
//                 />
//               </Form.Group>
//             </Form>
//           )}
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowEditModal(false)}>
//             Cancel
//           </Button>
//           <Button
//             variant="primary"
//             onClick={() => handleUpdateClient(selectedClient)}
//           >
//             Update Client
//           </Button>
//         </Modal.Footer>
//       </Modal>
//     </div>
//   );
// };

// export default ClientList;

import { Edit2, Plus, Trash2, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Table, Button, Modal, Form, InputGroup } from "react-bootstrap";

import "./admin-panel.css";
import { useAppointments } from "../../context/Appointment_context";
import api from "../../apis/api";

export const ClientList = () => {
  const { clientList, setList } = useAppointments();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    role: "client",
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone_number: "",
      role: "client",
    });
  };

  const handleAddClient = async () => {
    try {
      const token = sessionStorage.getItem("access_token");
      const addData = { ...formData };

      const response = await api.post(`/auth/register`, addData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 201) {
        alert("successfully updated");
        window.location.reload();
      }
    } catch (error) {
      console.error("An error occurred while adding the client:", error);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleUpdateClient = async (client) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const updatedData = { ...formData };

      if (!updatedData.password?.trim()) {
        delete updatedData.password;
      }

      const response = await api.put(`/users/${client.id}`, updatedData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        alert("successfully updated");
        window.location.reload();
      }
    } catch (error) {
      console.error("An error occurred while updating the client:", error);
    }
    setShowEditModal(false);
  };

  const filterClient = (clientList || []).filter(
    (client) =>
      client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        alert("No token found, please login again.");
        return;
      }

      const response = await api.delete(`/users/delete/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        alert(response.data.message);
        setList((prevList) => prevList.filter((user) => user.id !== id));
      } else {
        alert(response.data.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("An error occurred while deleting the user:", error);
      alert("Something went wrong while deleting the user.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (selectedClient) {
      setFormData({
        first_name: selectedClient.first_name || "",
        last_name: selectedClient.last_name || "",
        email: selectedClient.email || "",
        password: "",
        phone_number: selectedClient.phone_number || "",
        role: "client",
      });
    }
  }, [selectedClient]);

  const getAvatarColor = (name) => {
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];
    const charCode = name ? name.charCodeAt(0) : 0;
    return colors[charCode % colors.length];
  };

  const getReliabilityBadge = (status) => {
    switch (status) {
      case "flagged":
        return { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5", dot: "#ef4444" };
      case "at_risk":
        return { bg: "#fffbeb", color: "#92400e", border: "#fcd34d", dot: "#f59e0b" };
      case "reliable":
      default:
        return { bg: "#ecfdf5", color: "#065f46", border: "#6ee7b7", dot: "#10b981" };
    }
  };

  return (
    <div className="slick-workspace p-4">
      {/* Header Block */}
      <div className="slick-header d-flex justify-content-between align-items-end mb-4">
        <div>
          <h1 className="slick-title">Clients</h1>
          <p className="slick-subtitle">Monitor customer demographic parameters, system activity, and registration logs</p>
        </div>
        <Button variant="none" className="slick-btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          <Plus size={16} /> Add Client
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
            placeholder="Search clients by name, matching initials, or email profiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        
      </div>

      {/* Main Table Container Wrapper */}
      <div className="slick-table-card">
        <Table responsive className="mb-0 slick-table">
          <thead>
            <tr>
              <th className="ps-4 text-center" style={{ width: '70px' }}>#</th>
              <th>Client Identity</th>
              <th className="resp-hide-mobile">Email Address</th>
              <th className="resp-hide-tablet">Phone Number</th>
              <th>Reliability</th>
              <th>Penalty Score</th>
              <th className="pe-4 text-end" style={{ width: '130px' }}>Controls</th>
            </tr>
          </thead>
          <tbody>
            {filterClient && filterClient.length > 0 ? (
              filterClient.map((client, index) => {
                const fullName = `${client.first_name} ${client.last_name}`;
                return (
                  <tr key={client.id}>
                    <td className="ps-4 text-center text-mono-sub">{index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div 
                          className="slick-avatar" 
                          style={{ backgroundColor: getAvatarColor(client.first_name) }}
                        >
                          {client.first_name?.[0]?.toUpperCase()}{client.last_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="slick-profile-name">{fullName}</div>
                          <div className="slick-profile-id">USR-{client.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="resp-hide-mobile">
                      <span className="slick-email">{client.email}</span>
                    </td>
                    <td className="resp-hide-tablet text-secondary fw-medium">{client.phone_number || "—"}</td>
                    <td>
                      {(() => {
                        const badge = getReliabilityBadge(client.reliability_status);
                        return (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.3rem 0.65rem",
                            borderRadius: "999px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "capitalize",
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot }} />
                            {client.reliability_status === "flagged" ? "Flagged" : client.reliability_status === "at_risk" ? "At Risk" : "Reliable"}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ flex: 1, maxWidth: 80, height: 5, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            borderRadius: 3,
                            background: (client.penalty_score || 0) > 0.4 ? "#ef4444" : (client.penalty_score || 0) > 0.15 ? "#f59e0b" : "#10b981",
                            width: `${Math.min((client.penalty_score || 0) * 100, 100)}%`,
                            transition: "width 0.3s",
                          }} />
                        </div>
                        <span style={{ fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600, color: "#475569", minWidth: 32 }}>
                          {((client.penalty_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="pe-4 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <Button variant="none" className="slick-action-btn slick-edit-btn" onClick={() => handleEditClient(client)}>
                          <Edit2 size={13} />
                        </Button>
                        <Button variant="none" className="slick-action-btn slick-delete-btn" onClick={() => handleDeleteClient(client.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-5 slick-empty-state">
                  No registered accounts matched the specified search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Add Client Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered className="matte-modal-ui slick-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Register New Client</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form>
            <div className="row g-3">
              <div className="col-6">
                <Form.Group>
                  <Form.Label className="matte-label">First name</Form.Label>
                  <Form.Control type="text" className="matte-input" name="first_name" value={formData.first_name} placeholder="John" onChange={handleInputChange} />
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group>
                  <Form.Label className="matte-label">Last name</Form.Label>
                  <Form.Control type="text" className="matte-input" name="last_name" value={formData.last_name} placeholder="Doe" onChange={handleInputChange} />
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mt-3 mb-3">
              <Form.Label className="matte-label">Phone number</Form.Label>
              <Form.Control type="number" className="matte-input" name="phone_number" value={formData.phone_number} placeholder="Enter phone number" onChange={handleInputChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Email</Form.Label>
              <Form.Control type="email" className="matte-input" name="email" value={formData.email} placeholder="john.doe@example.com" onChange={handleInputChange} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="matte-label">Password</Form.Label>
              <Form.Control type="password" className="matte-input" name="password" value={formData.password} placeholder="••••••••" onChange={handleInputChange} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="none" className="matte-modal-close" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="none" className="matte-modal-submit" onClick={handleAddClient}>Add Client</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Client Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered className="matte-modal-ui slick-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Edit Client Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedClient && (
            <Form>
              <div className="row g-3">
                <div className="col-6">
                  <Form.Group>
                    <Form.Label className="matte-label">First name</Form.Label>
                    <Form.Control type="text" className="matte-input" name="first_name" value={formData.first_name} onChange={handleInputChange} />
                  </Form.Group>
                </div>
                <div className="col-6">
                  <Form.Group>
                    <Form.Label className="matte-label">Last name</Form.Label>
                    <Form.Control type="text" className="matte-input" name="last_name" value={formData.last_name} onChange={handleInputChange} />
                  </Form.Group>
                </div>
              </div>
              <Form.Group className="mt-3 mb-3">
                <Form.Label className="matte-label">Phone no.</Form.Label>
                <Form.Control type="number" className="matte-input" name="phone_number" value={formData.phone_number} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="matte-label">Email</Form.Label>
                <Form.Control type="email" className="matte-input" name="email" value={formData.email} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="matte-label">Password (Leave blank to keep unchanged)</Form.Label>
                <Form.Control type="password" className="matte-input" name="password" value={formData.password} placeholder="Enter new password" onChange={handleInputChange} />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="none" className="matte-modal-close" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="none" className="matte-modal-submit" onClick={() => handleUpdateClient(selectedClient)}>Update Client</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ClientList;