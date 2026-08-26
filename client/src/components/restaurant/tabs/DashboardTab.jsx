import React, { useMemo } from "react";
import { Row, Col, Card, Table, Button } from "react-bootstrap";
import { CalendarCheck, Clock, User, Scissors, Landmark, TrendingUp, RefreshCw } from "lucide-react";
import ClientRiskPopover from "./ClientRiskPopover";

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

export default function DashboardTab({ appointments, isLoading, onSync, sortField, sortDir, onSort }) {
  const totalRev = appointments
    .filter((a) => a.status === "confirmed" || a.status === "completed")
    .reduce((acc, current) => acc + parseInt(current.price || 0), 0);

  const sortedAppointments = useMemo(() => {
    const data = [...(appointments || [])];
    data.sort((a, b) => {
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
    return data;
  }, [appointments, sortField, sortDir]);

  return (
    <div>
      <Row className="g-4 mb-4">
        {[
          { title: "Total Bookings", val: appointments.length, type: "total" },
          { title: "Active Slots", val: appointments.filter((a) => a.status === "confirmed" || a.status === "pending").length, type: "active" },
          { title: "Completed Runs", val: appointments.filter((a) => a.status === "completed").length, type: "completed" },
          { title: "Gross Income", val: `Rs. ${totalRev}`, type: "revenue" },
        ].map((card, idx) => (
          <Col md={3} key={idx}>
            <Card className={`matte-stat-card card-${card.type}`}>
              <Card.Body>
                <h3 className="stat-value">{card.val}</h3>
                <p className="stat-title">{card.title}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="matte-card">
        <Card.Header className="matte-card-header">
          <h5 className="m-0 fw-bold header-title">Live Bookings Queue</h5>
          <Button variant="none" className="sync-btn-custom" onClick={onSync} disabled={isLoading}>
            <RefreshCw size={13} className={`me-1 ${isLoading ? "spin-icon" : ""}`} /> Sync Updates
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive className="mb-0 premium-table">
            <thead>
              <tr>
                <th className="ps-4" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("client_name")}>
                  Client Identifier <SortIcon field="client_name" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("service_name")}>
                  Service Requested <SortIcon field="service_name" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("date")}>
                  Date Scheduled <SortIcon field="date" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("price")}>
                  Pricing <SortIcon field="price" sortField={sortField} sortDir={sortDir} />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort("status")}>
                  Status Flag <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAppointments.slice(0, 6).map((app) => (
                <tr key={app.id}>
                  <td className="ps-4 fw-medium text-dark">
                    {app.client_name}
                    <ClientRiskPopover clientId={app.client_id}>
                      <RiskDot reliabilityStatus={app.client_reliability_status} />
                    </ClientRiskPopover>
                  </td>
                  <td>{app.service_name}</td>
                  <td className="text-muted">{new Date(app.date).toLocaleString()}</td>
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
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
