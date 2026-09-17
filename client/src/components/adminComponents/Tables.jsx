import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Row, Col, Card, Spinner, Alert, InputGroup } from "react-bootstrap";
import { Plus, Edit2, Trash2, Store, Search } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import "./admin-panel.css";
import api from "../../apis/api";

const Tables = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, _setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [data, setData] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    restaurateur_id: "",
    table_number: "",
    capacity: 1,
    is_active: true,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("access_token");

    try {
      await api.post("/tables", { ...formData, restaurateur_id: Number(formData.restaurateur_id) }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Table added successfully");
      setShowAddModal(false);
      setFormData({ restaurateur_id: "", table_number: "", capacity: 1, is_active: true });
      await getData();
    } catch (err) {
      console.error("Error adding table:", err);
      alert(err.response?.data?.message || "Failed to add table");
    }
  };

  const handleEditTable = async () => {
    if (!selectedTable) return;
    const token = sessionStorage.getItem("access_token");
    try {
      await api.put(`/tables/${selectedTable.id}`, {
        table_number: selectedTable.table_number,
        capacity: selectedTable.capacity,
        is_active: selectedTable.is_active,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Table updated successfully");
      _setShowEditModal(false);
      setSelectedTable(null);
      await getData();
    } catch (err) {
      console.error("Error updating table:", err);
      alert(err.response?.data?.message || "Failed to update table");
    }
  };

  const handleDeleteTable = async (id, tableNumber) => {
    if (!window.confirm(`Delete Table ${tableNumber}?`)) return;
    const token = sessionStorage.getItem("access_token");
    try {
      await api.delete(`/tables/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Table deleted successfully");
      await getData();
    } catch (err) {
      console.error("Error deleting table:", err);
      alert(err.response?.data?.message || "Failed to delete table");
    }
  };

  const getData = async () => {
    try {
      setLoading(true);
      setError("");
      const token = sessionStorage.getItem("access_token");
      const [tablesResponse, usersResponse] = await Promise.all([
        api.get("/tables/all", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/users/all", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const loadedTables = tablesResponse.data?.data || tablesResponse.data || [];
      const loadedOwners = usersResponse.data?.data || usersResponse.data || [];
      setData(Array.isArray(loadedTables) ? loadedTables : []);
      setOwners(Array.isArray(loadedOwners) ? loadedOwners : []);
    } catch (err) {
      console.error("Error fetching tables:", err);
      setError("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const ownerMap = useMemo(() => {
    return owners.reduce((accumulator, owner) => {
      accumulator[owner.id] = `${owner.first_name || ""} ${owner.last_name || ""}`.trim() || `Owner ${owner.id}`;
      return accumulator;
    }, {});
  }, [owners]);

  const groupedTables = useMemo(() => {
    const groups = data.reduce((accumulator, table) => {
      const ownerKey = table.restaurateur_id ?? "unassigned";
      if (!accumulator[ownerKey]) {
        accumulator[ownerKey] = [];
      }
      accumulator[ownerKey].push(table);
      return accumulator;
    }, {});

    return Object.entries(groups).map(([ownerKey, tables]) => ({
      ownerKey,
      ownerLabel: ownerKey === "unassigned" ? "Unassigned Tables" : ownerMap[ownerKey] || `Owner ${ownerKey}`,
      tables,
    }));
  }, [data, ownerMap]);

  const ownerLocMap = useMemo(() => {
    return owners.reduce((accumulator, owner) => {
      accumulator[owner.id] = owner.location_name || "";
      return accumulator;
    }, {});
  }, [owners]);

  const filteredGroups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return groupedTables;
    return groupedTables.filter((g) => {
      const label = g.ownerLabel.toLowerCase();
      const loc = (ownerLocMap[Number(g.ownerKey)] || "").toLowerCase();
      return label.includes(q) || loc.includes(q);
    });
  }, [groupedTables, searchTerm, ownerLocMap]);

  return (
    <div className="slick-workspace p-4">
      <div className="slick-header d-flex justify-content-between align-items-end mb-4">
        <div>
          <h1 className="slick-title">Tables</h1>
          <p className="slick-subtitle">Manage seating configurations across all outlets</p>
        </div>
        <Button variant="none" className="slick-btn-primary" onClick={() => { setFormData({ restaurateur_id: owners[0]?.id || "", table_number: "", capacity: 1, is_active: true }); setShowAddModal(true); }}>
          <Plus size={16} /> Add Table
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

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {filteredGroups.length > 0 ? (
        filteredGroups.map((group) => (
          <Card key={group.ownerKey} className="slick-table-card mb-4 border-0">
            <Card.Header className="bg-transparent border-0 px-4 pt-4 pb-3 d-flex align-items-center justify-content-between">
              <div>
                <h3 className="h5 mb-1">{ownerLocMap[Number(group.ownerKey)] || group.ownerLabel}</h3>
                <p className="text-muted mb-0">
                  {ownerLocMap[Number(group.ownerKey)] ? `${group.ownerLabel} · ` : ""}
                  {group.tables.length} table{group.tables.length === 1 ? "" : "s"}
                </p>
              </div>
            </Card.Header>
            <Card.Body className="pt-0 px-0">
              <Table responsive className="mb-0 slick-table">
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
                  {group.tables.map((table, num) => (
                    <tr key={table.id}>
                      <td className="ps-4 text-center text-mono-sub">{num + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="slick-avatar" style={{ backgroundColor: "#6366f1", color: "#fff" }}>
                            <Store size={14} />
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
                          <Button variant="none" className="slick-action-btn slick-edit-btn" onClick={() => { setSelectedTable(table); _setShowEditModal(true); }}>
                            <Edit2 size={13} />
                          </Button>
                          <Button variant="none" className="slick-action-btn slick-delete-btn" onClick={() => handleDeleteTable(table.id, table.table_number)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ))
      ) : (
        <div className="slick-table-card text-center py-5 slick-empty-state">
          {loading ? <Spinner animation="border" size="sm" /> : searchTerm.trim() ? `No restaurants match "${searchTerm.trim()}".` : "No tables configured across outlets."}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered className="matte-modal-ui slick-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Add New Table</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddTable}>
          <Modal.Body className="pt-3">
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Owner Restaurant</Form.Label>
              <Form.Select className="matte-input" name="restaurateur_id" value={formData.restaurateur_id} onChange={handleChange} required>
                <option value="">Select restaurant</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>{owner.first_name} {owner.last_name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="matte-label">Table Number</Form.Label>
              <Form.Control type="text" className="matte-input" name="table_number" value={formData.table_number} onChange={handleChange} required placeholder="e.g. A1, 1, 2" />
            </Form.Group>
            <div className="row g-3">
              <div className="col-6">
                <Form.Group>
                  <Form.Label className="matte-label">Capacity (guests)</Form.Label>
                  <Form.Control type="number" className="matte-input" name="capacity" value={formData.capacity} onChange={handleChange} required min="1" />
                </Form.Group>
              </div>
              <div className="col-6 d-flex align-items-end">
                <Form.Check type="checkbox" label="Active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="none" className="matte-modal-close" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="none" className="matte-modal-submit" type="submit">Publish Table</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Table Modal */}
      <Modal show={!!selectedTable} onHide={() => { _setShowEditModal(false); setSelectedTable(null); }} centered className="matte-modal-ui slick-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Modify Table Attributes</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedTable && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="matte-label">Table Number</Form.Label>
                <Form.Control type="text" className="matte-input" value={selectedTable.table_number} onChange={(e) => setSelectedTable({ ...selectedTable, table_number: e.target.value })} />
              </Form.Group>
              <div className="row g-3">
                <div className="col-6">
                  <Form.Group>
                    <Form.Label className="matte-label">Capacity</Form.Label>
                    <Form.Control type="number" className="matte-input" value={selectedTable.capacity} onChange={(e) => setSelectedTable({ ...selectedTable, capacity: Number(e.target.value) })} min="1" />
                  </Form.Group>
                </div>
                <div className="col-6 d-flex align-items-end">
                  <Form.Check type="checkbox" label="Active" checked={selectedTable.is_active} onChange={(e) => setSelectedTable({ ...selectedTable, is_active: e.target.checked })} />
                </div>
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="none" className="matte-modal-close" onClick={() => { _setShowEditModal(false); setSelectedTable(null); }}>Discard</Button>
          <Button variant="none" className="matte-modal-submit" onClick={handleEditTable}>Save Alterations</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Tables;
