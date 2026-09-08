import React, { useState, useMemo } from "react";
import { Card, Table, Button } from "react-bootstrap";
import { RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import ClientRiskPopover from "./ClientRiskPopover";

const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  no_show: "No Show",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export default function ClientHistoryTab({ appointments, isLoading, onSync }) {
  const [expandedClient, setExpandedClient] = useState(null);

  const clients = useMemo(() => {
    const map = new Map();
    for (const app of appointments || []) {
      const id = app.client_id;
      if (id == null) continue;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: app.client_name || "Unknown Client",
          phone: app.phone || null,
          reliability: app.client_reliability_status || "reliable",
          penalty_score: app.client_penalty_score || 0,
          total_visits: 0,
          completed: 0,
          no_shows: 0,
          cancelled: 0,
          in_progress: 0,
          pending: 0,
          total_spent: 0,
          last_visit: null,
          history: [],
        });
      }
      const c = map.get(id);
      c.total_visits += 1;
      c.history.push(app);
      if (app.status === "completed") c.completed += 1;
      if (app.status === "no_show") c.no_shows += 1;
      if (app.status === "cancelled" || app.status === "rejected") c.cancelled += 1;
      if (app.status === "in_progress") c.in_progress += 1;
      if (app.status === "pending") c.pending += 1;
      c.total_spent += Number(app.price || 0);
      const d = new Date(app.date).getTime();
      if (!c.last_visit || d > new Date(c.last_visit).getTime()) c.last_visit = app.date;
    }
    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.last_visit) - new Date(a.last_visit));
    return list;
  }, [appointments]);

  const toggle = (id) => setExpandedClient((cur) => (cur === id ? null : id));

  return (
    <Card className="matte-card">
      <Card.Header className="matte-card-header">
        <h5 className="m-0 fw-bold header-title">Client History</h5>
        <Button variant="none" className="sync-btn-custom" onClick={onSync} disabled={isLoading}>
          <RefreshCw size={13} className={`me-1 ${isLoading ? "spin-icon" : ""}`} /> Refresh
        </Button>
      </Card.Header>
      <Card.Body className="p-0">
        {clients.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p className="mb-0">No client booking history yet.</p>
          </div>
        ) : (
          <Table responsive className="mb-0 premium-table">
            <thead>
              <tr>
                <th className="ps-4"></th>
                <th>Client</th>
                <th>Phone</th>
                <th>Visits</th>
                <th>Completed</th>
                <th>No-Shows</th>
                <th>Cancelled</th>
                <th>Total Spent</th>
                <th className="pe-4 text-end">Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const expanded = expandedClient === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr
                      style={{ cursor: "pointer" }}
                      onClick={() => toggle(c.id)}
                      className={expanded ? "client-history-row-open" : ""}
                    >
                      <td className="ps-4 text-muted">
                        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </td>
                      <td className="fw-medium text-dark">
                        {c.name}
                        <ClientRiskPopover clientId={c.id}>
                          <span
                            title={`Penalty score: ${c.penalty_score}`}
                            style={{
                              display: "inline-block",
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor:
                                c.reliability === "flagged" ? "#ef4444" : c.reliability === "at_risk" ? "#eab308" : "#22c55e",
                              marginLeft: 6,
                              verticalAlign: "middle",
                            }}
                          />
                        </ClientRiskPopover>
                      </td>
                      <td className="text-muted">{c.phone || "—"}</td>
                      <td>{c.total_visits}</td>
                      <td className="text-success">{c.completed}</td>
                      <td className={c.no_shows > 0 ? "text-danger fw-semibold" : ""}>{c.no_shows}</td>
                      <td className="text-muted">{c.cancelled}</td>
                      <td className="fw-semibold text-dark">Rs. {c.total_spent.toLocaleString()}</td>
                      <td className="pe-4 text-end text-muted">
                        {c.last_visit ? new Date(c.last_visit).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={9} className="p-0" style={{ background: "#fafafa" }}>
                          <div className="p-3">
                            <Table responsive size="sm" className="mb-0">
                              <thead>
                                <tr>
                                  <th>Service</th>
                                  <th>Date & Time</th>
                                  <th>Price</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(c.history || [])
                                  .slice()
                                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                                  .map((app) => (
                                    <tr key={app.id}>
                                      <td>{app.service_name}</td>
                                      <td className="text-muted">{new Date(app.date).toLocaleString()}</td>
                                      <td className="fw-medium">Rs. {Number(app.price || 0).toLocaleString()}</td>
                                      <td>
                                        <span className={`status-flag status-flag-${app.status}`}>
                                          {STATUS_LABEL[app.status] || app.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </Table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
