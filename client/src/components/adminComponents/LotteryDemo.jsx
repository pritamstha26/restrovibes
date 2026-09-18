import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart3, Trophy, XCircle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import api from "../../apis/api";
import "./lotteryDemo.css";

function slotToTime(slot) {
  const hours = Math.floor(slot / 4);
  const minutes = (slot % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const dd = Math.floor(s / 86400);
  const hh = Math.floor((s % 86400) / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (dd > 0) return `${dd}d ${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  if (hh > 0) return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  return `${pad(mm)}:${pad(ss)}`;
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (["accepted", "won"].includes(s)) return "lottery-demo__status lottery-demo__status--accepted";
  if (s === "pending") return "lottery-demo__status lottery-demo__status--pending";
  if (["cancelled", "lost", "expired"].includes(s)) return "lottery-demo__status lottery-demo__status--cancelled";
  return "lottery-demo__status";
}

export default function LotteryDemo() {
  const [pools, setPools] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [winner, setWinner] = useState(null);
  const [resolved, setResolved] = useState(false);
  const [resolveResult, setResolveResult] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Role-aware: admins + restaurants can resolve, clients get read-only
  // countdowns (backend enforces the same rule).
  const role = useMemo(() => {
    try {
      const token = sessionStorage.getItem("access_token");
      return token ? jwtDecode(token).role : null;
    } catch {
      return null;
    }
  }, []);
  const canResolve = role === "admin" || role === "restaurateurs";

  useEffect(() => {
    let id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("access_token");
      const response = await api.get("/lottery/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPools(response.data?.pools || []);
      setAppointments(response.data?.pendingAppointments || []);
      setAllAppointments(response.data?.allAppointments || []);
    } catch (err) {
      console.error("Error fetching lottery pools:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const resolveLottery = useCallback(async (pool) => {
    const key = `${pool.restaurantId}-${pool.bookingDate}-${pool.timeSlot}`;
    try {
      setResolving(key);
      const token = sessionStorage.getItem("access_token");
      const response = await api.post(
        "/lottery/resolve",
        {
          restaurantId: pool.restaurantId,
          bookingDate: pool.bookingDate,
          timeSlot: pool.timeSlot,
          // Draw as-of the pool's resolution time (slot start − 1h cutoff)
          // instead of making the admin pick a date by hand.
          resolveAt: pool.resolutionTime,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResolveResult(response.data);
      setWinner(response.data.winner || null);
      setResolved(true);
      fetchPools();
    } catch (err) {
      console.error("Failed to resolve lottery:", err);
    } finally {
      setResolving(null);
    }
  }, [fetchPools]);

  const poolsWithCountdown = useMemo(() => {
    return pools.map((pool) => {
      const nowDate = new Date(now);
      const resolutionTime = new Date(pool.resolutionTime);
      const remainingMs = Math.max(0, resolutionTime.getTime() - nowDate.getTime());
      const remainingSec = Math.ceil(remainingMs / 1000);
      const remainingMin = Math.ceil(remainingMs / 60000);
      const closed = remainingMs <= 0;
      return {
        ...pool,
        countdown: { remainingMs, remainingSeconds: remainingSec, remainingMinutes: remainingMin, closed },
        countdownStr: formatCountdown(remainingSec),
      };
    });
  }, [pools, now]);

  const activePools = poolsWithCountdown.filter((p) => !p.countdown.closed);
  const closedPools = poolsWithCountdown.filter((p) => p.countdown.closed);

  return (
    <div className="lottery-demo">
      <div className="lottery-demo__header">
        <h2><BarChart3 size={22} /> Lottery Dashboard</h2>
        <div className="lottery-demo__controls">
          <button onClick={fetchPools} className="slick-btn-primary" style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }} disabled={loading}>
            <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading && pools.length === 0 && appointments.length === 0 ? (
        <div className="text-center py-4 slick-empty-state">
          <Loader2 size={24} className="spin" /> Loading lottery pools...
        </div>
      ) : pools.length === 0 && appointments.length === 0 ? (
        <div className="text-center py-4 slick-empty-state">
          No pending lottery contests and no pending appointments. Book a table, or run <code>npm run demo:lottery</code> to stage a lottery.
        </div>
      ) : (
        <>
          {activePools.map((pool) => (
            <div key={`${pool.restaurantId}-${pool.bookingDate}-${pool.timeSlot}`} className="lottery-demo__countdown">
              <div className="lottery-demo__countdown-label">⏳ {pool.restaurantName || `Restaurant #${pool.restaurantId}`} — {slotToTime(pool.timeSlot)}</div>
              <div className="lottery-demo__countdown-timer">{pool.countdownStr}</div>
              <div className="lottery-demo__countdown-info">
                {pool.competitors} competitor{pool.competitors !== 1 ? "s" : ""} ({(pool.entrants || []).map((e) => e.userName || `User #${e.userId}`).join(", ")}) · {pool.bookingDate} · Resolution: {new Date(pool.resolutionTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              {pool.eligibleCount === 0 && pool.blockedBy && (
                <div className="lottery-demo__countdown-info" style={{ color: "#fbbf24", fontWeight: 700, marginTop: "0.5rem" }}>
                  ⚠ Blocked by {pool.blockedBy.status} booking #{pool.blockedBy.appointmentId} ({pool.blockedBy.clientName || `User #${pool.blockedBy.clientId}`}) — resolving now releases entrants with no winner. Cancel it in Bookings first, or pick a free slot.
                </div>
              )}
              {!resolved && canResolve && (
                <button
                  onClick={() => {
                    if (pool.eligibleCount === 0 && pool.blockedBy) {
                      const ok = window.confirm(
                        `This pool is blocked by ${pool.blockedBy.status} booking #${pool.blockedBy.appointmentId} (${pool.blockedBy.clientName || `User #${pool.blockedBy.clientId}`}). Resolving now will release entrants with NO winner. Resolve anyway?`
                      );
                      if (!ok) return;
                    }
                    resolveLottery(pool);
                  }}
                  className="slick-btn-primary"
                  style={{ fontSize: "0.85rem", padding: "0.5rem 1.5rem", marginTop: "0.75rem" }}
                  disabled={resolving === `${pool.restaurantId}-${pool.bookingDate}-${pool.timeSlot}`}
                  title={`Draw as of ${new Date(pool.resolutionTime).toLocaleString()} (1h before slot)`}
                >
                  {resolving === `${pool.restaurantId}-${pool.bookingDate}-${pool.timeSlot}` ? <><Loader2 size={14} className="spin" /> Resolving...</> : <><Trophy size={16} /> Resolve (1h before slot)</>}
                </button>
              )}
            </div>
          ))}

          {closedPools.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h5 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#64748b", marginBottom: "0.75rem" }}>Closed Pools</h5>
              {closedPools.map((pool) => (
                <div key={`${pool.restaurantId}-${pool.bookingDate}-${pool.timeSlot}`} className="lottery-demo__countdown lottery-demo__countdown--closed">
                  <div className="lottery-demo__countdown-label">⚡ {slotToTime(pool.timeSlot)} — Closed</div>
                  <div className="lottery-demo__countdown-timer">00:00</div>
                  <div className="lottery-demo__countdown-info">
                    {pool.competitors} competitor{pool.competitors !== 1 ? "s" : ""} · Resolved
                  </div>
                </div>
              ))}
            </div>
          )}

              {resolved && resolveResult && (
            <div className="lottery-demo__result">
              <h5><Trophy size={18} /> Result</h5>
              {resolveResult.resolvedAt && (
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.75rem" }}>
                  Drawn as of {new Date(resolveResult.resolvedAt).toLocaleString()}
                </div>
              )}
              {resolveResult.winner ? (
                <>
                  <div className="lottery-demo__result-winner">
                    <CheckCircle size={18} style={{ color: "#34d399" }} />
                    <span className="lottery-demo__winner-name">
                      Winner: {resolveResult.winner.userName || `User #${resolveResult.winner.userId}`} — {resolveResult.winnerChance} chance
                    </span>
                  </div>
                  <div className="lottery-demo__result-entrants">
                    <div className="lottery-demo__result-row lottery-demo__result-row--won">
                      <span>{resolveResult.winner.userName || `User #${resolveResult.winner.userId}`} (entry #{resolveResult.winner.entryId})</span>
                      <CheckCircle size={14} style={{ color: "#34d399" }} />
                      <span className="lottery-demo__result-weight">
                        {Number(resolveResult.winner.weight).toFixed(0)} · won of {resolveResult.totalEntries}
                      </span>
                    </div>
                    {(resolveResult.losers || []).map((loser) => (
                      <div key={loser.entryId} className="lottery-demo__result-row">
                        <span>{loser.userName || `User #${loser.userId}`} (entry #{loser.entryId})</span>
                        <XCircle size={14} style={{ color: "#94a3b8" }} />
                        <span className="lottery-demo__result-weight">{Number(loser.weight).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="lottery-demo__result-winner" style={{ background: "#fef3c7", borderColor: "#fbbf24", color: "#92400e" }}>
                  <XCircle size={18} style={{ color: "#f59e0b" }} />
                  <span className="lottery-demo__winner-name">
                    No winner — {resolveResult.message || "no pending entries found"}
                  </span>
                </div>
              )}
              <button onClick={() => { setResolved(false); setWinner(null); setResolveResult(null); }} className="slick-btn-primary" style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", marginTop: "0.5rem" }}>
                Dismiss
              </button>
            </div>
          )}
        </>
      )}

      {/* Real-time pending appointments (these only become lottery pools once contested) */}
      {appointments.length > 0 && (
        <div className="lottery-demo__chart">
          <h5><CheckCircle size={14} /> Pending Appointments ({appointments.length}) — live</h5>
          <div className="lottery-demo__result-entrants">
            {appointments.map((a) => (
              <div key={a.id} className="lottery-demo__result-row">
                <span>
                  Appt #{a.id} · {a.restaurantName || `Restaurant #${a.restaurantId}`} · {a.clientName || `Client #${a.clientId}`} ·{" "}
                  {new Date(a.date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" "}({slotToTime(a.timeSlot)})
                </span>
                <span className={statusClass(a.status)}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All appointments across every status, newest first */}
      {allAppointments.length > 0 && (
        <div className="lottery-demo__chart">
          <h5><CheckCircle size={14} /> All Appointments ({allAppointments.length})</h5>
          <div className="lottery-demo__result-entrants">
            {allAppointments.map((a) => (
              <div key={`all-${a.id}`} className="lottery-demo__result-row">
                <span>
                  Appt #{a.id} · {a.restaurantName || `Restaurant #${a.restaurantId}`} · {a.clientName || `Client #${a.clientId}`} ·{" "}
                  {new Date(a.date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" "}({slotToTime(a.timeSlot)})
                </span>
                <span className={statusClass(a.status)}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formula Display */}
      <div className="lottery-demo__formula">
        <h5>How It Works</h5>
        <div className="lottery-demo__formula-grid">
          <div className="lottery-demo__formula-card"><code>W = base + flex×50 + loy×30 − pen×200</code><span>Base weight — fixed per entry</span></div>
          <div className="lottery-demo__formula-card"><code>aging(t) = 1 − 0.5<sup>t/6</sup></code><span>Exponential aging (half-life 6h)</span></div>
          <div className="lottery-demo__formula-card"><code>boost = 1 + min(aging×3, 3)</code><span>Multiplier cap</span></div>
          <div className="lottery-demo__formula-card"><code>W<sub>eff</sub> = W × boost</code><span>Effective weight</span></div>
        </div>
      </div>
    </div>
  );
}
