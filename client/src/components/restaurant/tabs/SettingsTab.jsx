import React from "react";
import { Card } from "react-bootstrap";

export default function SettingsTab({ profileForm, onChange, onSubmit }) {
  return (
    <div className="d-grid gap-4">
      <Card className="matte-card">
        <Card.Header className="matte-card-header">
          <h5 className="m-0 fw-bold header-title">Business Hours</h5>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <div className="text-muted small mb-1">Opening</div>
              <div className="fw-semibold text-dark">{profileForm.opening_time || "09:00"}</div>
            </div>
            <div className="col-md-6">
              <div className="text-muted small mb-1">Closing</div>
              <div className="fw-semibold text-dark">{profileForm.closing_time || "18:00"}</div>
            </div>
            <div className="col-12">
              <div className="text-muted small">
                Clients can only book inside this window. Update the times below to change availability.
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="matte-card">
        <Card.Header className="matte-card-header"><h5 className="m-0 fw-bold header-title">Operator Profile Matrix</h5></Card.Header>
        <Card.Body className="p-4">
          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="matte-label">Given Name</label>
                <input type="text" className="form-control matte-input" name="first_name" value={profileForm.first_name} onChange={onChange} required />
              </div>
              <div className="col-md-6">
                <label className="matte-label">Surname</label>
                <input type="text" className="form-control matte-input" name="last_name" value={profileForm.last_name} onChange={onChange} required />
              </div>
              <div className="col-md-6">
                <label className="matte-label">Contact Stream Phone</label>
                <input type="text" className="form-control matte-input" name="phone_number" value={profileForm.phone_number} onChange={onChange} required />
              </div>
              <div className="col-md-6">
                <label className="matte-label">Email Anchor</label>
                <input type="email" className="form-control matte-input" name="email" value={profileForm.email} onChange={onChange} required />
              </div>
              <div className="col-md-6">
                <label className="matte-label">Opening Time</label>
                <input type="time" className="form-control matte-input" name="opening_time" value={profileForm.opening_time} onChange={onChange} required />
              </div>
              <div className="col-md-6">
                <label className="matte-label">Closing Time</label>
                <input type="time" className="form-control matte-input" name="closing_time" value={profileForm.closing_time} onChange={onChange} required />
              </div>
              <div className="col-12">
                <label className="matte-label">Update Access Phrase (Leave blank if keeping current)</label>
                <input type="password" className="form-control matte-input" name="password" placeholder="••••••••" value={profileForm.password} onChange={onChange} />
              </div>
            </div>
            <button type="submit" className="matte-submit-btn px-4 mt-3" style={{ border: "none", borderRadius: "6px", cursor: "pointer" }}>Commit Mutations</button>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
