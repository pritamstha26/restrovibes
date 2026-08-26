import React, { useState, useEffect } from "react";
import { Card, Table, Button } from "react-bootstrap";
import { RefreshCw } from "lucide-react";
import ClientRiskPopover from "./ClientRiskPopover";
import StarRating from "../../StarRating";
import api from "../../../apis/api";

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>⇅</span>;
  return <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
};

const RELIABILITY_CONFIG = {
  reliable: { color: "#22c55e", label: "Reliable customer" },
  at_risk: { color: "#eab308", label: "At-risk customer — some booking issues" },
  flagged: { color: "#ef4444", label: "Flagged — frequent no-shows or late arrivals" },
};

const RiskDot = ({ reliabilityStatus }) => {
  const config = RELIABILITY_CONFIG[reliabilityStatus] || RELIABILITY_CONFIG.reliable;
  return (
    <span
      title={config.label}
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: config.color,
        marginLeft: 6,
        verticalAlign: "middle",
        boxShadow: `0 0 4px ${config.color}55`,
      }}
    />
  );
};

export default function AppointmentsTab({ appointments, isLoading, onSync, sortField, sortDir, onSort, onUpdateStatus }) {
  const [ratedIds, setRatedIds] = useState({});
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);

  useEffect(() => {
    const completed = (appointments || []).filter((a) => a.status === "completed");
    if (!completed.length) return;
    const fetchRatings = async () => {
      const token = sessionStorage.getItem("access_token");
      if (!token) return;
      const results = {};
      for (const app of completed) {
        try {
          const res = await api.get(`/ratings/appointment/${app.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const ratings = res.data?.data || [];
          const mine = ratings.find((r) => r.targetType === "client");
          if (mine) results[app.id] = mine.rating;
        } catch {}
      }
      setRatedIds(results);
    };
    fetchRatings();
  }, [appointments]);

  const handleSubmitRating = async () => {
    if (!ratingTarget || !ratingValue) return;
    try {
      const token = sessionStorage.getItem("access_token");
      await api.post("/ratings", {
        appointmentId: ratingTarget,
        rating: ratingValue,
        targetType: "client",
      }, { headers: { Authorization: `Bearer ${token}` } });
      setRatedIds((prev) => ({ ...prev, [ratingTarget]: ratingValue }));
      setRatingTarget(null);
      setRatingValue(0);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit rating");
    }
  };

  const activeAppointments = (appointments || [])
    .filter((app) => ["pending", "accepted", "in_progress", "completed"].includes(app.status))
    .sort((a, b) => {
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

  return (
    <Card className="matte-card">
      <Card.Header className="matte-card-header">
        <h5 className="m-0 fw-bold header-title">Active Bookings</h5>
        <Button variant="none" className="sync-btn-custom" onClick={onSync} disabled={isLoading}>
          <RefreshCw size={13} className={`me-1 ${isLoading ? "spin-icon" : ""}`} /> Refresh
        </Button>
      </Card.Header>
      <Card.Body className="p-0">
        {activeAppointments.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p className="mb-0">No active bookings requiring action.</p>
          </div>
        ) : (
          <Table responsive className="mb-0 premium-table">
            <thead>
              <tr>
                <th className="ps-4" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("client_name")}>
                  Client <SortIcon field="client_name" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("service_name")}>
                  Service <SortIcon field="service_name" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("date")}>
                  Date & Time <SortIcon field="date" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("duration")}>
                  Duration <SortIcon field="duration" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("price")}>
                  Price <SortIcon field="price" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("status")}>
                  Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                </th>
                <th className="pe-4 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeAppointments.map((app) => (
                <tr key={app.id}>
                  <td className="ps-4 fw-medium text-dark">
                    {app.client_name}
                    <ClientRiskPopover clientId={app.client_id}>
                      <RiskDot reliabilityStatus={app.client_reliability_status} />
                    </ClientRiskPopover>
                  </td>
                  <td>{app.service_name}</td>
                  <td className="text-muted">{new Date(app.date).toLocaleString()}</td>
                  <td>{app.duration} mins</td>
                  <td className="fw-semibold text-dark">Rs. {app.price}</td>
                  <td>
                    <span className={`status-flag status-flag-${app.status}`}>{app.status.replace(/_/g, " ")}</span>
                    {app.competing_count > 1 && (
                      <span
                        title={`${app.competing_count} clients competing for this slot`}
                        style={{
                          display: "inline-block",
                          marginLeft: 6,
                          padding: "1px 6px",
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          borderRadius: 8,
                          background: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fcd34d",
                          verticalAlign: "middle",
                        }}
                      >
                        {app.competing_count} competing
                      </span>
                    )}
                  </td>
                  <td className="pe-4 text-end">
                    {app.status === "pending" && (
                      <>
                        <Button variant="none" className="control-btn btn-confirm me-1" onClick={() => onUpdateStatus(app.id, "confirm", "Appointment confirmed!", "success")}>
                          ✓ Accept
                        </Button>
                        <Button variant="none" className="control-btn btn-cancel" onClick={() => { if (window.confirm("Reject this booking?")) onUpdateStatus(app.id, "cancel", "Appointment rejected", "warning") }}>
                          ✕ Reject
                        </Button>
                      </>
                    )}
                    {app.status === "accepted" && (
                      <>
                        <Button variant="none" className="control-btn btn-confirm me-1" onClick={() => onUpdateStatus(app.id, "arrived", "Client marked as arrived", "success")}>
                          ✓ Arrived
                        </Button>
                        <Button variant="none" className="control-btn btn-cancel" onClick={() => { if (window.confirm("Mark this client as NO SHOW? This will affect their booking score.")) onUpdateStatus(app.id, "no-show", "Client marked as no-show", "danger") }}>
                          ✕ No Show
                        </Button>
                      </>
                    )}
                    {app.status === "in_progress" && (
                      <>
                        <Button variant="none" className="control-btn btn-confirm me-1" onClick={() => onUpdateStatus(app.id, "complete", "Appointment completed", "success")}>
                          ✓ Complete
                        </Button>
                        <Button variant="none" className="control-btn btn-cancel" onClick={() => { if (window.confirm("Mark this client as NO SHOW? This will affect their booking score.")) onUpdateStatus(app.id, "no-show", "Client marked as no-show", "danger") }}>
                          ✕ No Show
                        </Button>
                      </>
                    )}
                    {app.status === "completed" && (
                      ratedIds[app.id] != null ? (
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          Rated <StarRating value={ratedIds[app.id]} readonly size={14} />
                        </span>
                      ) : ratingTarget === app.id ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <StarRating value={ratingValue} onChange={setRatingValue} size={16} />
                          <Button variant="none" className="control-btn btn-confirm" style={{ fontSize: "0.7rem", padding: "2px 8px" }} onClick={handleSubmitRating}>✓</Button>
                          <Button variant="none" className="control-btn btn-cancel" style={{ fontSize: "0.7rem", padding: "2px 8px" }} onClick={() => { setRatingTarget(null); setRatingValue(0); }}>✕</Button>
                        </span>
                      ) : (
                        <Button variant="none" className="control-btn btn-confirm" onClick={() => { setRatingTarget(app.id); setRatingValue(0); }}>
                          ★ Rate Client
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
