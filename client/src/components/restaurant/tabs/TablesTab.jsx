import React, { useState, useEffect } from "react";
import { Form, Alert, Spinner, Modal, Row, Col } from "react-bootstrap";
import {
  Upload,
  X,
  ImageIcon,
  Plus,
  Edit2,
  Trash2,
  Armchair,
  Users,
  CheckCircle2,
} from "lucide-react";
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
    } catch {
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
      <div className="matte-card text-center py-5">
        <Spinner animation="border" size="sm" />
        <p className="mt-2 text-muted small mb-0">Loading tables...</p>
      </div>
    );
  }

  const totalCapacity = tables.reduce((sum, t) => sum + Number(t.capacity), 0);
  const activeTables = tables.filter((t) => t.is_active).length;
  const imageCount = tables.reduce((sum, t) => sum + (t.images?.length || 0), 0);

  const kpis = [
    { label: "Total Tables", value: tables.length, icon: Armchair },
    { label: "Total Capacity", value: totalCapacity, icon: Users },
    { label: "Active Tables", value: activeTables, icon: CheckCircle2 },
    { label: "View Images", value: imageCount, icon: ImageIcon },
  ];

  return (
    <div className="d-grid gap-4">
      {/* Slick Header Block */}
      <div className="matte-card view-header-card">
        <div className="view-header-inner">
          <div>
            <h2 className="view-header-title">Tables &amp; Views</h2>
            <p className="view-header-subtitle">
              Configure seating inventory and curate ambiance photography for each table
            </p>
          </div>
          <button type="button" className="slick-add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Table
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <Row className="g-3">
        {kpis.map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <Col xs={6} md={3} key={kpi.label}>
              <div className="view-kpi">
                <div className="view-kpi-icon">
                  <KpiIcon size={19} />
                </div>
                <div>
                  <div className="view-kpi-value">{kpi.value}</div>
                  <div className="view-kpi-label">{kpi.label}</div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Table Cards Grid */}
      {tables.length === 0 ? (
        <div className="matte-card view-empty-state">
          <Armchair size={30} className="mb-2" />
          <p className="mb-0">No tables yet. Click "Add Table" to create your first table.</p>
        </div>
      ) : (
        <div className="view-grid">
          {tables.map((table) => (
            <div key={table.id} className="view-card">
              <div className="view-card-head">
                <div className="view-identity">
                  <div className="view-avatar">
                    <Armchair size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="view-name">Table {table.table_number}</div>
                    <div className="view-meta">
                      TBL-{table.id} · {table.capacity} guests
                    </div>
                  </div>
                </div>
                <div className="view-actions">
                  <span
                    className={`status-flag ${
                      table.is_active ? "status-flag-completed" : "status-flag-cancelled"
                    }`}
                  >
                    {table.is_active ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    className="view-icon-btn edit"
                    onClick={() => setEditingTable(table)}
                    aria-label={`Edit table ${table.table_number}`}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="view-icon-btn delete"
                    onClick={() => handleDeleteTable(table.id, table.table_number)}
                    aria-label={`Delete table ${table.table_number}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="view-gallery">
                <div className="view-gallery-head">
                  <span className="view-gallery-label">
                    <ImageIcon size={14} /> View Gallery
                    {table.images?.length > 0 && ` (${table.images.length})`}
                  </span>
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
                    className="view-upload-btn"
                    style={{ cursor: uploadingId === table.id ? "wait" : "pointer" }}
                  >
                    {uploadingId === table.id ? <Spinner size="sm" /> : <Upload size={13} />}
                    {uploadingId === table.id ? "Uploading..." : "Add"}
                  </label>
                </div>

                {table.images && table.images.length > 0 ? (
                  <div className="view-image-grid">
                    {table.images.map((img, idx) => (
                      <div key={idx} className="view-img-tile">
                        <img
                          src={`${API_BASE}${img}`}
                          alt={`Table ${table.table_number} view ${idx + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const parts = img.split("/");
                            handleImageDelete(table.id, parts[parts.length - 1]);
                          }}
                          className="view-img-del"
                          aria-label="Delete image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="view-img-empty">No view images uploaded yet</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered className="matte-modal-ui">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Add New Table</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form.Group className="mb-3">
            <Form.Label className="matte-label">Table Number</Form.Label>
            <Form.Control
              type="text"
              className="matte-input"
              placeholder="e.g. A1, B2, 1, 2, 3"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="matte-label">Capacity (guests)</Form.Label>
            <Form.Control
              type="number"
              min="1"
              className="matte-input"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <button type="button" className="matte-modal-close" onClick={() => setShowAddModal(false)}>
            Cancel
          </button>
          <button type="button" className="matte-modal-submit" onClick={handleAddTable} disabled={saving}>
            {saving ? "Saving..." : "Add Table"}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Edit Table Modal */}
      <Modal show={!!editingTable} onHide={() => setEditingTable(null)} centered className="matte-modal-ui">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="modal-heading">Modify Table</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {editingTable && (
            <>
              <Form.Group className="mb-3">
                <Form.Label className="matte-label">Table Number</Form.Label>
                <Form.Control
                  type="text"
                  className="matte-input"
                  value={editingTable.table_number}
                  onChange={(e) => setEditingTable({ ...editingTable, table_number: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="matte-label">Capacity (guests)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  className="matte-input"
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({ ...editingTable, capacity: Number(e.target.value) })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Active"
                  checked={editingTable.is_active}
                  onChange={(e) => setEditingTable({ ...editingTable, is_active: e.target.checked })}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <button type="button" className="matte-modal-close" onClick={() => setEditingTable(null)}>
            Discard
          </button>
          <button type="button" className="matte-modal-submit" onClick={handleEditTable} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
