import React, { useState, useEffect } from "react";
import { Card, Form, Button, Alert, Spinner, Table, Modal } from "react-bootstrap";
import { Upload, X, ImageIcon } from "lucide-react";
import api from "../../../apis/api";
export default function TablesTab({ restaurateurId }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({ table_number: "", capacity: 1, is_active: true });
  const [uploadingId, setUploadingId] = useState(null);

  const API_BASE = api.defaults.baseURL?.replace("/api", "") || "http://localhost:5000";

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tables/restaurant/${restaurateurId}`);
      if (response.data.success) {
        setTables(response.data.data || []);
      }
    } catch (err) {
      setError("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurateurId) fetchTables();
  }, [restaurateurId]);

  const handleAddTable = async () => {
    if (!formData.table_number || !formData.capacity) {
      setError("Table number and capacity are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await api.post("/tables", {
        restaurateur_id: restaurateurId,
        table_number: formData.table_number,
        capacity: formData.capacity,
        is_active: formData.is_active,
      });
      if (response.data.success) {
        setSuccess(`Table ${formData.table_number} added`);
        setShowAddModal(false);
        setFormData({ table_number: "", capacity: 1, is_active: true });
        fetchTables();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add table");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTable = async () => {
    if (!editingTable) return;
    setSaving(true);
    setError("");
    try {
      const response = await api.put(`/tables/${editingTable.id}`, {
        table_number: editingTable.table_number,
        capacity: editingTable.capacity,
        is_active: editingTable.is_active,
      });
      if (response.data.success) {
        setSuccess(`Table ${editingTable.table_number} updated`);
        setEditingTable(null);
        fetchTables();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update table");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTable = async (tableId, tableNumber) => {
    if (!window.confirm(`Delete Table ${tableNumber}?`)) return;
    try {
      const response = await api.delete(`/tables/${tableId}`);
      if (response.data.success) {
        setSuccess(`Table ${tableNumber} deleted`);
        fetchTables();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete table");
    }
  };

  const handleImageUpload = async (tableId, files) => {
    if (!files || files.length === 0) return;
    setUploadingId(tableId);
    setError("");
    try {
      const formDataObj = new FormData();
      Array.from(files).forEach((f) => formDataObj.append("images", f));
      const token = sessionStorage.getItem("access_token");
      const res = await api.post(`/uploads/tables/${tableId}/images`, formDataObj, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, images: res.data.images } : t)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload images");
    } finally {
      setUploadingId(null);
    }
  };

  const handleImageDelete = async (tableId, filename) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const res = await api.delete(`/uploads/tables/${tableId}/images/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, images: res.data.images } : t)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete image");
    }
  };

  if (loading) {
    return (
      <Card className="matte-card">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" size="sm" />
          <p className="mt-2 text-muted small">Loading tables...</p>
        </Card.Body>
      </Card>
    );
  }

  const totalCapacity = tables.reduce((sum, t) => sum + Number(t.capacity), 0);

  return (
    <div className="d-grid gap-4">
      <Card className="matte-card">
        <Card.Header className="matte-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="m-0 fw-bold header-title">Tables & Views</h5>
              <small className="text-muted">Manage tables and upload view images for each table</small>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>Add Table</Button>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}

          <div className="mb-3">
            <strong>Total Capacity:</strong>{" "}
            {tables.length > 0 ? `${totalCapacity} guests across ${tables.length} tables` : "No tables configured"}
          </div>

          {tables.length === 0 ? (
            <Alert variant="info">No tables yet. Click "Add Table" to create your first table.</Alert>
          ) : (
            <div className="d-flex flex-column gap-4">
              {tables.map((table) => (
                <Card key={table.id} className="border">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="m-0">Table {table.table_number}</h6>
                        <small className="text-muted">Capacity: {table.capacity} guests</small>
                      </div>
                      <div className="d-flex gap-2">
                        <span className={`badge ${table.is_active ? "bg-success" : "bg-secondary"}`}>
                          {table.is_active ? "Active" : "Inactive"}
                        </span>
                        <Button variant="outline-primary" size="sm" onClick={() => setEditingTable(table)}>Edit</Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteTable(table.id, table.table_number)}>Delete</Button>
                      </div>
                    </div>

                    <div className="border-top pt-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <small className="fw-semibold d-flex align-items-center gap-1">
                          <ImageIcon size={14} /> View Images
                        </small>
                        <div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            id={`img-upload-${table.id}`}
                            style={{ display: "none" }}
                            onChange={(e) => handleImageUpload(table.id, e.target.files)}
                          />
                          <label
                            htmlFor={`img-upload-${table.id}`}
                            className="btn btn-outline-secondary btn-sm mb-0 d-inline-flex align-items-center gap-1"
                            style={{ cursor: uploadingId === table.id ? "wait" : "pointer" }}
                          >
                            {uploadingId === table.id ? <Spinner size="sm" /> : <Upload size={14} />}
                            {uploadingId === table.id ? "Uploading..." : "Add"}
                          </label>
                        </div>
                      </div>

                      {table.images && table.images.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2">
                          {table.images.map((img, idx) => (
                            <div key={idx} className="position-relative" style={{ width: 120, height: 90, borderRadius: 6, overflow: "hidden", border: "1px solid #dee2e6" }}>
                              <img
                                src={`${API_BASE}${img}`}
                                alt={`Table ${table.table_number} view ${idx + 1}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const parts = img.split("/");
                                  handleImageDelete(table.id, parts[parts.length - 1]);
                                }}
                                className="position-absolute top-0 end-0 m-1 d-flex align-items-center justify-content-center"
                                style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", padding: 0 }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <small className="text-muted">No images uploaded yet</small>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add Table Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Add Table</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Table Number</Form.Label>
            <Form.Control type="text" placeholder="e.g. A1, B2, 1, 2, 3" value={formData.table_number} onChange={(e) => setFormData({ ...formData, table_number: e.target.value })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Capacity (guests)</Form.Label>
            <Form.Control type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Check type="checkbox" label="Active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddTable} disabled={saving}>{saving ? "Saving..." : "Add Table"}</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Table Modal */}
      <Modal show={!!editingTable} onHide={() => setEditingTable(null)} centered>
        <Modal.Header closeButton><Modal.Title>Edit Table</Modal.Title></Modal.Header>
        <Modal.Body>
          {editingTable && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Table Number</Form.Label>
                <Form.Control type="text" value={editingTable.table_number} onChange={(e) => setEditingTable({ ...editingTable, table_number: e.target.value })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Capacity (guests)</Form.Label>
                <Form.Control type="number" min="1" value={editingTable.capacity} onChange={(e) => setEditingTable({ ...editingTable, capacity: Number(e.target.value) })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" label="Active" checked={editingTable.is_active} onChange={(e) => setEditingTable({ ...editingTable, is_active: e.target.checked })} />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingTable(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleEditTable} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
