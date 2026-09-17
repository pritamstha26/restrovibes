// import { Edit2, Plus, Trash2, Search } from "lucide-react";
// import { useEffect, useState } from "react";
// import { Table, Button, Badge, Modal, Form, InputGroup } from "react-bootstrap";

// import "./admin-panel.css";
// import { useAppointments } from "../../context/Appointment_context";
// import api from "../../apis/api";
// export const RestaurantList = () => {
//   const { restaurateursList, setList } = useAppointments();
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedrestaurant, setSelectedrestaurant] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [formData, setFormData] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     password: "",
//     phone_number: "",
//     role: "restaurateurs",
//   });

//   const handleAddrestaurant = async () => {
//     // Add restaurant logic would go here
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
//       console.error("An error occurred while adding the restaurant:", error);
//     }

//     setShowAddModal(false);
//   };

//   const handleEditrestaurant = (restaurateur) => {
//     setSelectedrestaurant(restaurateur);
//     setShowEditModal(true);
//   };

//   const handleUpdaterestaurant = async (rest) => {
//     try {
//       const token = sessionStorage.getItem("access_token");

//       const updatedData = { ...formData };

//       // Remove password field if it's empty or only whitespace
//       if (!updatedData.password?.trim()) {
//         delete updatedData.password;
//       }

//       const response = await api.put(`/users/${rest.id}`, updatedData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       if (response.status === 200) {
//         alert("successfully updated");

//         window.location.reload();
//       }
//     } catch (error) {
//       console.error(
//         "An error occurred while updating the restaurateurs:",
//         error,
//       );
//     }
//     setShowEditModal(false);
//   };

//   const filterRestaurant = restaurateursList?.filter(
//     (restaurateur) =>
//       restaurateur.first_name
//         .toLowerCase()
//         .includes(searchTerm.toLowerCase()) ||
//       restaurateur.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       restaurateur.last_name.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const handleDeleterestaurant = async (r_id) => {
//     if (!window.confirm("Are you sure you want to delete this restaurateur?"))
//       return;

//     try {
//       const token = sessionStorage.getItem("access_token");

//       const response = await api.delete(`/users/delete/${r_id}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (response.status === 200) {
//         setList((prevList) =>
//           prevList.filter((restaurateur) => restaurateur.id !== r_id),
//         );
//         alert("Restaurateur deleted successfully");
//       } else {
//         alert("Failed to delete restaurateur");
//       }
//     } catch (error) {
//       if (
//         error.response &&
//         error.response.status === 400 &&
//         error.response.data.message.includes("appointments")
//       ) {
//         alert("Cannot delete a restaurateur who has existing appointments.");
//       } else {
//         console.error(
//           "An error occurred while deleting the restaurateur:",
//           error,
//         );
//         alert("An unexpected error occurred while deleting the restaurateur.");
//       }
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
//     if (selectedrestaurant) {
//       setFormData({
//         first_name: selectedrestaurant.first_name,
//         last_name: selectedrestaurant.last_name,
//         email: selectedrestaurant.email,
//         password: "",
//         phone_number: selectedrestaurant.phone_number,
//       });
//     }
//   }, [selectedrestaurant]);

//   return (
//     <div className="restaurant-list p-3">
//       <div className="page-title d-flex justify-content-between align-items-center">
//         <div>
//           <h2>Restaurateur List</h2>
//           <p className="text-muted">Manage your restaurateur</p>
//         </div>
//         <Button variant="primary" onClick={() => setShowAddModal(true)}>
//           <Plus size={20} /> Add New restaurateur
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
//             {filterRestaurant?.map((restaurateur, num) => (
//               <tr key={restaurateur.id}>
//                 <td className="py-3">{num + 1}</td>
//                 <td className="py-3">
//                   {restaurateur.first_name} {restaurateur.last_name}
//                 </td>
//                 <td className="py-3">
//                   <div>{restaurateur.email}</div>
//                 </td>

//                 <td className="py-3">{restaurateur.phone_number}</td>
//                 <td className="action-buttons d-flex justify-content-around py-3  ">
//                   <Button
//                     variant="outline-primary"
//                     size="sm"
//                     onClick={() => handleEditrestaurant(restaurateur)}
//                   >
//                     <Edit2 size={20} />
//                   </Button>
//                   <Button
//                     variant="outline-danger"
//                     size="sm"
//                     onClick={() => handleDeleterestaurant(restaurateur.id)}
//                   >
//                     <Trash2 size={20} />
//                   </Button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>
//       </div>

//       {/* Add restaurant Modal */}
//       <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
//         <Modal.Header closeButton>
//           <Modal.Title>Add New restaurateur</Modal.Title>
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
//           <Button variant="primary" onClick={handleAddrestaurant}>
//             Add restaurateur
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       {/* Edit restaurant Modal */}
//       <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
//         <Modal.Header closeButton>
//           <Modal.Title>Edit restaurateur</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           {selectedrestaurant && (
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
//             onClick={() => handleUpdaterestaurant(selectedrestaurant)}
//           >
//             Update restaurateur
//           </Button>
//         </Modal.Footer>
//       </Modal>
//     </div>
//   );
// };

// export default RestaurantList;



import { Edit2, Plus, Trash2, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Table, Button, Modal, Form, InputGroup } from "react-bootstrap";

import "./admin-panel.css";
import { useAppointments } from "../../context/Appointment_context";
import api from "../../apis/api";

export const RestaurantList = () => {
  const { restaurateursList, setList } = useAppointments();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedrestaurant, setSelectedrestaurant] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    role: "restaurateurs",
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone_number: "",
      role: "restaurateurs",
    });
  };

  const handleAddrestaurant = async () => {
    try {
      const token = sessionStorage.getItem("access_token");
      const addData = { ...formData };

      const response = await api.post(`/auth/register`, addData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 201) {
        alert("Successfully registered!");
        window.location.reload();
      }
    } catch (error) {
      console.error("An error occurred while adding the restaurant:", error);
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleEditrestaurant = (restaurateur) => {
    setSelectedrestaurant(restaurateur);
    setShowEditModal(true);
  };

  const handleUpdaterestaurant = async (rest) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const updatedData = { ...formData };

      if (!updatedData.password?.trim()) {
        delete updatedData.password;
      }

      const response = await api.put(`/users/${rest.id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200) {
        alert("Successfully updated");
        window.location.reload();
      }
    } catch (error) {
      console.error("An error occurred while updating the restaurateurs:", error);
    }
    setShowEditModal(false);
  };

  const filterRestaurant = restaurateursList?.filter(
    (restaurateur) =>
      restaurateur.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurateur.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurateur.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleterestaurant = async (r_id) => {
    if (!window.confirm("Are you sure you want to delete this restaurateur?"))
      return;

    try {
      const token = sessionStorage.getItem("access_token");
      const response = await api.delete(`/users/delete/${r_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        setList((prevList) => prevList.filter((restaurateur) => restaurateur.id !== r_id));
        alert("Restaurateur deleted successfully");
      } else {
        alert("Failed to delete restaurateur");
      }
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data.message.includes("appointments")) {
        alert("Cannot delete a restaurateur who has existing appointments.");
      } else {
        console.error("An error occurred while deleting the restaurateur:", error);
        alert("An unexpected error occurred while deleting the restaurateur.");
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (selectedrestaurant) {
      setFormData({
        first_name: selectedrestaurant.first_name || "",
        last_name: selectedrestaurant.last_name || "",
        email: selectedrestaurant.email || "",
        password: "",
        phone_number: selectedrestaurant.phone_number || "",
        role: "restaurateurs",
      });
    }
  }, [selectedrestaurant]);

  // Utility to generate a clean, colorful initial avatar background
  const getAvatarColor = (name) => {
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];
    const charCode = name ? name.charCodeAt(0) : 0;
    return colors[charCode % colors.length];
  };

  return (
    <div className="slick-workspace p-4">
      {/* Header Block */}
      <div className="slick-header d-flex justify-content-between align-items-end mb-4">
        <div>
          <h1 className="slick-title">Restaurateurs</h1>
          <p className="slick-subtitle">Manage system workspace access privileges and profiles</p>
        </div>
        <Button variant="none" className="slick-btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          <Plus size={16} /> Add Merchant
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
            placeholder="Filter database registries by name, matching initials, or emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        
      </div>

      {/* Modern Data Canvas Card */}
      <div className="slick-table-card">
        <Table responsive className="mb-0 slick-table">
          <thead>
            <tr>
              <th className="ps-4 text-center" style={{ width: '70px' }}>#</th>
              <th>Merchant Profile</th>
              <th>Email Address</th>
              <th>Secure Contact</th>
              <th className="pe-4 text-end" style={{ width: '130px' }}>Controls</th>
            </tr>
          </thead>
          <tbody>
            {filterRestaurant && filterRestaurant.length > 0 ? (
              filterRestaurant.map((restaurateur, index) => {
                const fullName = `${restaurateur.first_name} ${restaurateur.last_name}`;
                return (
                  <tr key={restaurateur.id}>
                    <td className="ps-4 text-center text-mono-sub">{index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div 
                          className="slick-avatar" 
                          style={{ backgroundColor: getAvatarColor(restaurateur.first_name) }}
                        >
                          {restaurateur.first_name?.[0]?.toUpperCase()}{restaurateur.last_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="slick-profile-name">{fullName}</div>
                          <div className="slick-profile-id">UUID-{restaurateur.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="slick-email">{restaurateur.email}</span>
                    </td>
                    <td className="text-secondary fw-medium">{restaurateur.phone_number || "—"}</td>
                    <td className="pe-4 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <Button variant="none" className="slick-action-btn slick-edit-btn" onClick={() => handleEditrestaurant(restaurateur)}>
                          <Edit2 size={13} />
                        </Button>
                        <Button variant="none" className="slick-action-btn slick-delete-btn" onClick={() => handleDeleterestaurant(restaurateur.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-5 slick-empty-state">
                  No active merchants found matching the provided configuration filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Add Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered className="matte-modal-ui slick-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Register New Merchant</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form>
            <div className="row g-3">
              <div className="col-6">
                <Form.Group>
                  <Form.Label className="matte-label">Given Name</Form.Label>
                  <Form.Control type="text" className="matte-input" name="first_name" value={formData.first_name} placeholder="John" onChange={handleInputChange} />
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group>
                  <Form.Label className="matte-label">Surname</Form.Label>
                  <Form.Control type="text" className="matte-input" name="last_name" value={formData.last_name} placeholder="Doe" onChange={handleInputChange} />
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mt-3 mb-3">
              <Form.Label className="matte-label">Secure Primary Telephone</Form.Label>
              <Form.Control type="text" className="matte-input" name="phone_number" value={formData.phone_number} placeholder="98XXXXXXXX" onChange={handleInputChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Email Anchor</Form.Label>
              <Form.Control type="email" className="matte-input" name="email" value={formData.email} placeholder="john.doe@example.com" onChange={handleInputChange} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="matte-label">Initial Access Password</Form.Label>
              <Form.Control type="password" className="matte-input" name="password" value={formData.password} placeholder="••••••••" onChange={handleInputChange} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="none" className="matte-modal-close" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="none" className="matte-modal-submit" onClick={handleAddrestaurant}>Provision Registry</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered className="matte-modal-ui slick-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Modify Profile Attributes</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedrestaurant && (
            <Form>
              <div className="row g-3">
                <div className="col-6">
                  <Form.Group>
                    <Form.Label className="matte-label">Given Name</Form.Label>
                    <Form.Control type="text" className="matte-input" name="first_name" value={formData.first_name} onChange={handleInputChange} />
                  </Form.Group>
                </div>
                <div className="col-6">
                  <Form.Group>
                    <Form.Label className="matte-label">Surname</Form.Label>
                    <Form.Control type="text" className="matte-input" name="last_name" value={formData.last_name} onChange={handleInputChange} />
                  </Form.Group>
                </div>
              </div>
              <Form.Group className="mt-3 mb-3">
                <Form.Label className="matte-label">Contact Stream Phone</Form.Label>
                <Form.Control type="text" className="matte-input" name="phone_number" value={formData.phone_number} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="matte-label">Email Address Connection</Form.Label>
                <Form.Control type="email" className="matte-input" name="email" value={formData.email} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="matte-label">Force Change Password (Leave blank to preserve)</Form.Label>
                <Form.Control type="password" className="matte-input" name="password" value={formData.password} placeholder="Enter changes or leave blank" onChange={handleInputChange} />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="none" className="matte-modal-close" onClick={() => setShowEditModal(false)}>Discard</Button>
          <Button variant="none" className="matte-modal-submit" onClick={() => handleUpdaterestaurant(selectedrestaurant)}>Apply Mutations</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RestaurantList;