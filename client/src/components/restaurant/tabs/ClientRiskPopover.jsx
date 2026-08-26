import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../../apis/api";

const RELIABILITY_COLORS = {
  reliable: { bg: "#22c55e", label: "Reliable" },
  at_risk: { bg: "#eab308", label: "At Risk" },
  flagged: { bg: "#ef4444", label: "Flagged" },
};

export default function ClientRiskPopover({ clientId, children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = (e) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    }
    if (profile) { setOpen(true); return; }
    fetchProfile();
  };

  const fetchProfile = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const res = await api.get(`/appointments/client/${clientId}/risk-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data?.data || res.data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const r = RELIABILITY_COLORS[profile?.reliability_status] || RELIABILITY_COLORS.reliable;

  return (
    <>
      <span ref={triggerRef} onClick={toggle} style={{ cursor: "pointer" }}>
        {children}
      </span>
      {open && createPortal(
        <div style={{
          position: "fixed", top: pos.top, left: pos.left, transform: "translateX(-50%)",
          zIndex: 99999, width: 260, background: "#fff",
          borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: 14,
          fontSize: "0.75rem", lineHeight: 1.5, border: `2px solid ${r.bg}33`,
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 12, color: "#94a3b8" }}>Loading...</div>
          ) : profile ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: r.bg, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                  {profile.first_name} {profile.last_name}
                </span>
                <span style={{
                  marginLeft: "auto", padding: "1px 6px", borderRadius: 6,
                  background: `${r.bg}22`, color: r.bg, fontWeight: 600, fontSize: "0.65rem",
                }}>
                  {r.label}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginBottom: 10 }}>
                <Stat label="Completed" value={profile.total_completed_bookings || 0} color="#22c55e" />
                <Stat label="No-Shows" value={profile.total_no_shows || 0} color="#ef4444" />
                <Stat label="Late Arrivals" value={profile.total_late_arrivals || 0} color="#f59e0b" />
                <Stat label="Late Cancels" value={profile.total_late_cancellations || 0} color="#f97316" />
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#64748b" }}>Penalty Score</span>
                  <span style={{ fontWeight: 600, color: "#ef4444" }}>
                    {((profile.penalty_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "#e2e8f0", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2, background: "#ef4444", transition: "width 0.3s",
                    width: `${Math.min((profile.penalty_score || 0) * 100, 100)}%`,
                  }} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 12, color: "#94a3b8" }}>No data</div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: "0.65rem" }}>{label}</div>
      <div style={{ fontWeight: 700, color, fontSize: "0.9rem" }}>{value}</div>
    </div>
  );
}
