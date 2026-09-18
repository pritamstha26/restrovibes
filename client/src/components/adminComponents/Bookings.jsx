import { useEffect, useState, useMemo } from "react";
import { Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  Landmark,
  UtensilsCrossed,
  Clock,
  User,
  RefreshCw,
  Shuffle,
  BarChart3,
  Settings2,
} from "lucide-react";
import api from "../../apis/api";
import "./admin-panel.css";

const slotToTime = (slot) =>
  `${String(Math.floor(slot / 4)).padStart(2, "0")}:${String((slot % 4) * 15).padStart(2, "0")}`;

const TABS = [
  { id: "pending", label: "Pending Requests" },
  { id: "all", label: "All Bookings" },
];

export default function AdminBookings() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [pools, setPools] = useState([]);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [resolvingKey, setResolvingKey] = useState(null);
  const [lotteryResult, setLotteryResult] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const [demoData, setDemoData] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoConfig, setDemoConfig] = useState(null);

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
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      setPoolsLoading(true);
      const token = sessionStorage.getItem("access_token");
      if (!token) return;
      const response = await api.get("/lottery/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPools(response.data?.pools || []);
    } catch (err) {
      console.error("Error fetching lottery pools:", err);
    } finally {
      setPoolsLoading(false);
    }
  };

  const fetchDemo = async () => {
    try {
      setDemoLoading(true);
      const token = sessionStorage.getItem("access_token");
      if (!token) return;
      const response = await api.get("/lottery/demo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDemoData(response.data);
      setDemoConfig(response.data.config);
      setShowDemo(true);
    } catch (err) {
      console.error("Error fetching demo dashboard:", err);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleResolveLottery = async (pool) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;
    const key = `${pool.restaurantId}-${pool.bookingDate}-${pool.timeSlot}`;
    try {
      setResolvingKey(key);
      const response = await api.post(
        "/lottery/resolve",
        {
          restaurantId: pool.restaurantId,
          bookingDate: pool.bookingDate,
          timeSlot: pool.timeSlot,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = response.data || {};
      if (data.winner) {
        setLotteryResult(
          `Winner: user #${data.winner.userId} — ${data.winnerChance} chance ` +
          `(weight ${Math.round(data.winner.weight)}) across ${data.totalEntries} entrant(s).`,
        );
      } else {
        setLotteryResult(data.message || "Resolved — lone entrant did not secure the slot.");
      }
      await fetchPools();
      fetchBookings();
    } catch (err) {
      console.error("Failed to resolve lottery:", err);
      setLotteryResult(err.response?.data?.message || "Failed to resolve lottery.");
    } finally {
      setResolvingKey(null);
    }
  };

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

  const getClientReliabilityStyle = (status) => {
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

      <div className="slick-table-card mb-3">
        <div className="p-3 border-bottom border-light d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <Shuffle size={15} className="text-slate-muted" />
            <h6 className="m-0 fw-bold text-dark" style={{ fontSize: "0.85rem" }}>
              Weighted Lottery — Pending Contests
            </h6>
          </div>
          <div className="d-flex gap-2">
            <button
              onClick={fetchDemo}
              className="slick-btn-secondary"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
              disabled={demoLoading}
            >
              {demoLoading ? (
                <Spinner animation="border" size="sm" className="text-secondary" style={{ width: "14px", height: "14px" }} />
              ) : (
                <BarChart3 size={12} />
              )}
              {showDemo ? "Refresh Demo" : "📊 Demo Dashboard"}
            </button>
            <button
              onClick={() => navigate("/admin/lottery-demo")}
              className="slick-btn-primary"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
            >
              <BarChart3 size={12} /> Full Visualizer
            </button>
            <button
              onClick={fetchPools}
              className="slick-btn-secondary"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
              disabled={poolsLoading}
            >
              {poolsLoading ? (
                <Spinner animation="border" size="sm" className="text-secondary" style={{ width: "14px", height: "14px" }} />
              ) : (
                <RefreshCw size={12} />
              )}
            </button>
          </div>
        </div>
        {showDemo && demoData && (
          <div className="p-3 mb-2 border-bottom border-light" style={{ background: "#f8fafc" }}>
            <h6 className="m-0 fw-bold text-dark mb-2" style={{ fontSize: "0.8rem" }}>
              <Settings2 size={12} className="inline" /> Lottery Configuration
            </h6>
            <div className="d-flex flex-wrap gap-3" style={{ fontSize: "0.75rem" }}>
              <span><strong>Cutoff:</strong> {demoConfig?.lotteryCutoffMinutes} min</span>
              <span><strong>Min Gap:</strong> {demoConfig?.minGapMinutes} min</span>
              <span><strong>Half-life:</strong> {demoConfig?.agingHalfLifeHours}h</span>
              <span><strong>Max Boost:</strong> ×{demoConfig?.maxMultiplier}</span>
              <span><strong>Scheduler:</strong> {demoConfig?.schedulerIntervalMs}ms</span>
            </div>
          </div>
        )}
        {showDemo && demoData?.recentResults?.length > 0 && (
          <div className="p-3 mb-3 border-bottom border-light" style={{ background: "#f8fafc" }}>
            <h6 className="m-0 fw-bold text-dark mb-2" style={{ fontSize: "0.8rem" }}>
              Recent Resolutions
            </h6>
            <div className="table-responsive">
              <table className="table mb-0 slick-table" style={{ fontSize: "0.75rem" }}>
                <thead>
                  <tr>
                    <th className="ps-3">Date</th>
                    <th>Slot</th>
                    <th>Winner</th>
                    <th>Losers</th>
                    <th>Earliest Entry</th>
                  </tr>
                </thead>
                <tbody>
                  {demoData.recentResults.map((r, i) => (
                    <tr key={i}>
                      <td className="ps-3">{r.booking_date}</td>
                      <td className="text-mono-sub">{slotToTime(r.preferred_time_slot)}</td>
                      <td>#{r.winners}</td>
                      <td>#{r.losers}</td>
                      <td>{r.earliest_entry ? new Date(r.earliest_entry).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {lotteryResult && (
          <Alert className="alert-minimal m-3 mb-0 p-2 small">{lotteryResult}</Alert>
        )}
        {pools.length === 0 ? (
          <div className="text-center py-4 slick-empty-state">
            No pending lottery contests. Run <code>npm run demo:lottery</code> to stage one.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 slick-table">
              <thead>
                <tr>
                  <th className="ps-4">Restaurant</th>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Entrants</th>
<th>Resolution</th>
                      <th>Boost</th>
                      <th>Countdown</th>
                      <th className="pe-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool) => {
                  const key = `${pool.restaurantId}-${pool.bookingDate}-${pool.timeSlot}`;
                  return (
                    <tr key={key}>
                      <td className="ps-4">#{pool.restaurantId}</td>
                      <td>{pool.bookingDate}</td>
                      <td className="text-mono-sub">{slotToTime(pool.timeSlot)}</td>
                      <td>
                        <span className="slick-badge slick-badge-pending">{pool.competitors}</span>
                      </td>
                      <td className="text-muted">
                        {new Date(pool.resolutionTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}{" "}
                        {pool.closed ? (
                          <span className="text-danger">• closed</span>
                        ) : (
                          <span className="text-success">• open</span>
                        )}
                      </td>
                      <td className="text-mono-sub">{pool.agingBoost}×</td>
                      <td className="text-mono-sub" style={{ color: pool.countdown?.closed ? "#dc2626" : "#059669", fontWeight: 700 }}>
                        {pool.countdown ? `${pool.countdown.remainingMinutes}m ${pool.countdown.remainingSeconds}s` : "—"}
                      </td>
                      <td className="pe-4 text-end">
                        <button
                          className="slick-btn-primary"
                          style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
                          disabled={resolvingKey === key}
                          onClick={() => handleResolveLottery(pool)}
                        >
                          {resolvingKey === key ? "Resolving…" : "Resolve now"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                <th className="resp-hide-tablet" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("restaurateur_name")}>
                  Provider / Shop <SortIcon field="restaurateur_name" />
                </th>
                <th className="resp-hide-mobile" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("service_name")}>
                  Selected Service <SortIcon field="service_name" />
                </th>
                <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("date")}>
                  Scheduled Timestamp <SortIcon field="date" />
                </th>
                <th className="resp-hide-mobile" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("price")}>
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
                        <div>
                          <span className="slick-profile-name">{data.client_name || "Unknown Client"}</span>
                          {data.client?.reliability_status && (
                            <div style={{ marginTop: 4 }}>
                              {(() => {
                                const st = getClientReliabilityStyle(data.client.reliability_status);
                                return (
                                  <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "999px",
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    textTransform: "capitalize",
                                    background: st.bg,
                                    color: st.color,
                                    border: `1px solid ${st.border}`,
                                  }}>
                                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot }} />
                                    {data.client.reliability_status === "flagged" ? "Flagged" : data.client.reliability_status === "at_risk" ? "At Risk" : "Reliable"}
                                    <span style={{ opacity: 0.8 }}>· {((data.client.penalty_score || 0) * 100).toFixed(0)}%</span>
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="resp-hide-tablet">
                      <div className="d-flex align-items-center gap-2">
                        <Landmark size={13} className="text-slate-muted" />
                        <span className="text-secondary fw-medium">{data.restaurateur_name || "Merchant Hub"}</span>
                      </div>
                    </td>
                    <td className="resp-hide-mobile">
                      <div className="d-flex align-items-center gap-2">
                        <UtensilsCrossed size={13} className="text-slate-muted" />
                        <span className="text-dark fw-medium">{data.service_name || "Service Item Deleted"}</span>
                      </div>
                    </td>
                    <td className="text-mono-sub">
                      <div className="d-flex align-items-center gap-2">
                        <Clock size={12} />
                        {data.date ? new Date(data.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </div>
                    </td>
                    <td className="resp-hide-mobile fw-semibold text-dark">Rs. {data.price || 0}</td>
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
