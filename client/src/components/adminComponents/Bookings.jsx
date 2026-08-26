import { useEffect, useState, useMemo } from "react";
import { Spinner, Alert } from "react-bootstrap";
import {
  CalendarCheck,
  Landmark,
  Scissors,
  Clock,
  User,
  RefreshCw,
} from "lucide-react";
import api from "../../apis/api";
import "./admin-panel.css";

const TABS = [
  { id: "pending", label: "Pending Requests" },
  { id: "all", label: "All Bookings" },
];

export default function AdminBookings() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const displayed = useMemo(() => {
    const base =
      activeTab === "pending"
        ? appointments.filter((a) => a.status === "pending")
        : appointments;
    const data = [...base];
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
  }, [appointments, activeTab, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>⇅</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = sessionStorage.getItem("access_token");
      if (!token) return;

      const response = await api.get("/appointments/all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        const rawData = response.data.data ?? response.data;
        const normalized = Array.isArray(rawData)
          ? rawData.map((apt) => ({
              ...apt,
              client_name:
                apt.client?.first_name && apt.client?.last_name
                  ? `${apt.client.first_name} ${apt.client.last_name}`
                  : apt.client_name,
              restaurateur_name:
                apt.restaurateurs?.first_name && apt.restaurateurs?.last_name
                  ? `${apt.restaurateurs.first_name} ${apt.restaurateurs.last_name}`
                  : apt.restaurateur_name,
              service_name: apt.service?.name || apt.service_name,
              duration: apt.service?.duration || apt.duration,
              price: apt.service?.price || apt.price,
            }))
          : [];
        setAppointments(normalized);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load booking records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const StatusBadge = ({ status }) => {
    let styleClass = "slick-badge ";
    switch (status) {
      case "pending":
        styleClass += "slick-badge-pending";
        break;
      case "accepted":
        styleClass += "slick-badge-accepted";
        break;
      case "confirmed":
        styleClass += "slick-badge-confirmed";
        break;
      case "in_progress":
        styleClass += "slick-badge-in_progress";
        break;
      case "completed":
        styleClass += "slick-badge-completed";
        break;
      case "cancelled":
        styleClass += "slick-badge-cancelled";
        break;
      case "rejected":
        styleClass += "slick-badge-rejected";
        break;
      case "no_show":
        styleClass += "slick-badge-no_show";
        break;
      case "late_arrival":
        styleClass += "slick-badge-late_arrival";
        break;
      default:
        styleClass += "slick-badge-secondary";
    }
    return (
      <span className={styleClass}>
        {status ? status.replace(/_/g, " ") : "N/A"}
      </span>
    );
  };

  const handleStatusUpdate = async (appointmentId, action) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (!window.confirm(`Mark this booking as ${action}?`)) return;

    try {
      setIsLoading(true);
      const response = await api.put(
        `/appointments/${appointmentId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        fetchBookings();
      }
    } catch (err) {
      console.error("Failed to update booking:", err);
      setError(`Failed to ${action} booking.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="slick-workspace p-4">
      <div className="slick-header mb-4">
        <h1 className="slick-title">Bookings</h1>
        <p className="slick-subtitle">
          Review and manage platform-wide appointment requests.
        </p>
      </div>

      <div className="d-flex gap-2 mb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="slick-btn-secondary"
            style={{
              borderRadius: "8px",
              fontWeight: activeTab === tab.id ? "600" : "500",
              backgroundColor:
                activeTab === tab.id ? "#0f172a" : "#ffffff",
              color: activeTab === tab.id ? "#ffffff" : "#334155",
              border:
                activeTab === tab.id ? "1px solid #0f172a" : "1px solid #e2e8f0",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="slick-table-card">
        <div className="p-4 border-bottom border-light d-flex justify-content-between align-items-center">
          <h5 className="m-0 fw-bold text-dark" style={{ fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
            {activeTab === "pending" ? "Pending Requests" : "All Bookings"}
          </h5>
          <button
            onClick={fetchBookings}
            className="slick-btn-secondary"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem" }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner animation="border" size="sm" className="text-secondary" style={{ width: "14px", height: "14px" }} />
            ) : (
              <RefreshCw size={13} />
            )}
          </button>
        </div>

        {error && <Alert className="alert-minimal text-danger m-3 p-2 small">{error}</Alert>}

        <div className="table-responsive">
          <table className="table mb-0 slick-table">
            <thead>
              <tr>
                <th className="ps-4" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("client_name")}>
                  Client <SortIcon field="client_name" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("restaurateur_name")}>
                  Provider / Shop <SortIcon field="restaurateur_name" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("service_name")}>
                  Selected Service <SortIcon field="service_name" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("date")}>
                  Scheduled Timestamp <SortIcon field="date" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("price")}>
                  Price <SortIcon field="price" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("status")} className="pe-4 text-end">
                  Live Status <SortIcon field="status" />
                </th>
                {activeTab === "pending" && <th className="pe-4 text-end">Action</th>}
              </tr>
            </thead>
            <tbody>
              {displayed.length > 0 ? (
                displayed.map((data) => (
                  <tr key={data.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-2">
                        <User size={13} className="text-slate-muted" />
                        <span className="slick-profile-name">{data.client_name || "Unknown Client"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Landmark size={13} className="text-slate-muted" />
                        <span className="text-secondary fw-medium">{data.restaurateur_name || "Merchant Hub"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Scissors size={13} className="text-slate-muted" />
                        <span className="text-dark fw-medium">{data.service_name || "Service Item Deleted"}</span>
                      </div>
                    </td>
                    <td className="text-mono-sub">
                      <div className="d-flex align-items-center gap-2">
                        <Clock size={12} />
                        {data.date ? new Date(data.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </div>
                    </td>
                    <td className="fw-semibold text-dark">Rs. {data.price || 0}</td>
                    <td className="pe-4 text-end">
                      <StatusBadge status={data.status} />
                    </td>
                    {activeTab === "pending" && (
                      <td className="pe-4 text-end">
                        <button
                          onClick={() => handleStatusUpdate(data.id, "confirm")}
                          className="slick-btn-primary"
                          style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem", marginRight: "0.5rem" }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(data.id, "cancel")}
                          className="slick-btn-secondary"
                          style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem", color: "#dc2626", borderColor: "#fee2e2" }}
                        >
                          Reject
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === "pending" ? "7" : "6"} className="text-center py-5 slick-empty-state">
                    {activeTab === "pending" ? "No pending requests requiring action." : "No bookings found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
