import { useState, useEffect, useMemo } from "react";
import { Spinner, Alert, Carousel, Modal } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import api from "../apis/api";
import {
  FaChair,
  FaUsers,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaImage,
  FaArrowLeft,
  FaUtensils,
  FaStar,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaUser,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../components/client/dashboard.css";

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const cleaned = String(timeStr).trim().slice(0, 5);
  const parts = cleaned.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function generateTimeSlots(openingTime, closingTime) {
  const openMin = parseTimeToMinutes(openingTime);
  const closeMin = parseTimeToMinutes(closingTime);
  if (openMin === null || closeMin === null || openMin >= closeMin) {
    return Array.from({ length: 17 }, (_, i) => {
      const h = i + 6;
      return `${String(h).padStart(2, "0")}:00`;
    });
  }
  const slots = [];
  for (let min = openMin; min < closeMin; min += 60) {
    const h = Math.floor(min / 60);
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

function generateMinuteOptions(selectedHour, closingTime, durationMinutes = 0) {
  if (!selectedHour) return [];
  const hourNum = Number(selectedHour.split(":")[0]);
  const baseMin = hourNum * 60;
  const closeMin = parseTimeToMinutes(closingTime) || 24 * 60;
  const minutes = [0, 15, 30, 45];
  return minutes
    .filter((m) => {
      const slotStart = baseMin + m;
      return slotStart < closeMin && slotStart + durationMinutes <= closeMin;
    })
    .map((m) => `${String(hourNum).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

function formatDateShort(d) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateInput(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateRange(count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth <= breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function BookTablePage() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [bookingTime, setBookingTime] = useState("09:00");
  const [partySize, setPartySize] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [timeOptions, setTimeOptions] = useState([]);
  const [slotAvailable, setSlotAvailable] = useState(null);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  const [minuteOptions, setMinuteOptions] = useState([]);

  const API_BASE =
    api.defaults.baseURL?.replace("/api", "") || "http://localhost:5000";
  const dateOptions = useMemo(() => getDateRange(14), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const restaurantResponse = await api.get(
          `/restaurateurs-services/${restaurantId}`
        );
        if (restaurantResponse.status === 200) {
          const restData = restaurantResponse.data.data;
          setRestaurant(restData);

          const openTime = restData?.opening_time || "09:00:00";
          const closeTime = restData?.closing_time || "18:00:00";
          const hourSlots = generateTimeSlots(openTime, closeTime);
          setTimeOptions(hourSlots);

          setSelectedHour(null);
          setMinuteOptions([]);
          setBookingTime("");

          if (hourSlots.length > 0) {
            setSelectedHour(hourSlots[0]);
          }
        }

        const tablesResponse = await api.get(
          `/tables/restaurant/${restaurantId}`
        );
        if (tablesResponse.status === 200) {
          setTables(tablesResponse.data.data || []);
        }

        const servicesResponse = await api.get("/restaurateurs-services/all");
        if (servicesResponse.status === 200) {
          const all = servicesResponse.data || [];
          const filtered = Array.isArray(all)
            ? all.filter(
                (s) =>
                  String(s.restaurateur_id || s.restaurateurId) ===
                  String(restaurantId)
              )
            : [];
          setServices(filtered);
        }
      } catch (err) {
        setError("Failed to load restaurant data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) fetchData();
    else setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (!selectedHour || !restaurant) {
      setMinuteOptions([]);
      return;
    }
    const closeTime = restaurant?.closing_time || "18:00:00";
    const duration = selectedService?.duration || 45;
    const mins = generateMinuteOptions(selectedHour, closeTime, duration);
    setMinuteOptions(mins);

    if (bookingTime && !mins.includes(bookingTime)) {
      setBookingTime(mins.length > 0 ? mins[0] : "");
    }
  }, [selectedHour, restaurant, selectedService]);

  useEffect(() => {
    if (!selectedTable || !selectedService || !bookingTime) {
      setSlotAvailable(null);
      return;
    }

    let cancelled = false;
    const check = async () => {
      setCheckingSlot(true);
      try {
        const [hours, minutes] = bookingTime.split(":").map(Number);
        const dateObj = new Date(bookingDate);
        dateObj.setHours(hours, minutes, 0, 0);

        const params = new URLSearchParams({
          table_id: selectedTable.id,
          restaurateur_id: restaurantId,
          date: dateObj.toISOString(),
          duration: String(selectedService.duration || 45),
        });

        const res = await api.get(`/appointments/check-availability?${params}`);
        if (cancelled) return;

        const available = res.data?.available ?? true;
        setSlotAvailable(available);
        if (!available) {
          setShowSlotModal(true);
        }
      } catch {
        if (!cancelled) setSlotAvailable(null);
      } finally {
        if (!cancelled) setCheckingSlot(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [bookingDate, bookingTime, selectedTable, selectedService, restaurantId]);

  const handleBookTable = async () => {
    if (!selectedTable || !restaurant || !selectedService) return;
    setBookingInProgress(true);
    setError(null);

    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        setError("Please log in to book a table.");
        setBookingInProgress(false);
        return;
      }

      const [hours, minutes] = bookingTime.split(":").map(Number);
      const appointmentDate = new Date(bookingDate);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const response = await api.post(
        "/appointments",
        {
          service_id: selectedService.id,
          date: appointmentDate.toISOString(),
          restaurateurs_id: restaurant.id,
          party_size: partySize,
          table_id: selectedTable.id,
          clientType: "regular",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 201) {
        setShowSuccessModal(true);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to book table. Please try again."
      );
      console.error(err);
    } finally {
      setBookingInProgress(false);
    }
  };

  const totalPrice = selectedService ? selectedService.price * partySize : 0;
  const hasLocation =
    restaurant?.latitude != null && restaurant?.longitude != null;
  const canSubmit =
    hasLocation &&
    selectedTable &&
    selectedService &&
    partySize > 0 &&
    partySize <= (selectedTable?.capacity || 0) &&
    selectedTable?.is_active;

  const activeTables = tables.filter((t) => t.is_active);
  const inactiveTables = tables.filter((t) => !t.is_active);

  if (loading) {
    return (
      <div className="bk-page">
        <div className="bk-skeleton-header" />
        <div className="bk-skeleton-body">
          <div className="bk-skeleton-card" />
          <div className="bk-skeleton-card" />
          <div className="bk-skeleton-sidebar" />
        </div>
      </div>
    );
  }

  if (error && !restaurant) {
    return (
      <div className="bk-page">
        <div className="bk-empty-state">
          <div className="bk-empty-icon">
            <FaTimes />
          </div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="bk-btn bk-btn-primary" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bk-page">
      {/* Header */}
      <div className="bk-header">
        <div className="bk-header-inner">
          <button className="bk-back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <div className="bk-header-info">
            <h1 className="bk-restaurant-name">
              {restaurant?.first_name} {restaurant?.last_name}
            </h1>
            <div className="bk-header-meta">
              {restaurant?.location_name && (
                <span className="bk-meta-item">
                  <FaMapMarkerAlt /> {restaurant.location_name}
                </span>
              )}
              {restaurant?.seat_capacity && (
                <span className="bk-meta-item">
                  <FaChair /> {restaurant.seat_capacity} seats
                </span>
              )}
              {restaurant?.rating != null && (
                <span className="bk-meta-item bk-rating-badge">
                  <FaStar /> {Number(restaurant.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bk-container">
          <div className="bk-alert bk-alert-error">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="bk-alert-close">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      <div className="bk-container">
        <div className="bk-layout">
          {/* Left Column: Tables + Services */}
          <div className="bk-content">
            {/* Date Selector Strip */}
            <div className="bk-section">
              <h2 className="bk-section-title">
                <FaCalendarAlt /> Pick a Date
              </h2>
              <div className="bk-date-strip">
                {dateOptions.map((d) => {
                  const isSelected =
                    formatDateInput(d) === formatDateInput(bookingDate);
                  const isToday =
                    formatDateInput(d) === formatDateInput(new Date());
                  return (
                    <button
                      key={formatDateInput(d)}
                      className={`bk-date-chip ${isSelected ? "bk-date-chip-active" : ""}`}
                      onClick={() => setBookingDate(d)}
                    >
                      <span className="bk-date-weekday">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="bk-date-day">{d.getDate()}</span>
                      <span className="bk-date-month">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      {isToday && <span className="bk-date-today">Today</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selector — Step 1: Hour */}
            <div className="bk-section">
              <h2 className="bk-section-title">
                <FaClock /> Pick a Time
              </h2>

              {/* Hour chips */}
              <div className="bk-time-grid">
                {(timeOptions.length > 0 ? timeOptions : []).map((h) => {
                  const hourLabel = h.split(":")[0];
                  return (
                    <button
                      key={h}
                      className={`bk-time-chip ${selectedHour === h ? "bk-time-chip-active" : ""}`}
                      onClick={() => {
                        setSelectedHour(h);
                        setBookingTime("");
                        setSlotAvailable(null);
                      }}
                    >
                      {hourLabel}:00
                    </button>
                  );
                })}
                {timeOptions.length === 0 && !loading && (
                  <p className="bk-hint-text">
                    No available time slots for this restaurant.
                  </p>
                )}
              </div>

              {/* Step 2: Minutes (appear after hour selection) */}
              {selectedHour && minuteOptions.length > 0 && (
                <div className="bk-minute-reveal" key={selectedHour}>
                  <span className="bk-muted-label" style={{ marginBottom: "0.5rem", display: "block" }}>
                    {selectedHour.split(":")[0]}:00 — select minutes
                  </span>
                  <div className="bk-time-grid">
                    {minuteOptions.map((t, i) => (
                      <button
                        key={t}
                        className={`bk-time-chip bk-minute-chip ${bookingTime === t ? "bk-time-chip-active" : ""} ${bookingTime === t && slotAvailable === false ? "bk-time-chip-unavailable" : ""}`}
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={() => setBookingTime(t)}
                      >
                        {t}
                        {bookingTime === t && checkingSlot && (
                          <span className="bk-time-checking" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {slotAvailable === false && !checkingSlot && (
                <div className="bk-alert bk-alert-error" style={{ marginTop: "0.75rem" }}>
                  <FaExclamationTriangle style={{ fontSize: "0.8rem" }} />
                  <span>This table is already booked at <strong>{bookingTime}</strong>. Pick another time.</span>
                </div>
              )}
            </div>

            {/* Tables */}
            <div className="bk-section">
              <div className="bk-section-header">
                <h2 className="bk-section-title">
                  <FaChair /> Select a Table
                </h2>
                <span className="bk-section-count">
                  {activeTables.length} available
                </span>
              </div>

              {tables.length === 0 ? (
                <div className="bk-empty-card">
                  <FaChair className="bk-empty-card-icon" />
                  <p>No tables configured for this restaurant yet.</p>
                </div>
              ) : activeTables.length === 0 ? (
                <div className="bk-empty-card">
                  <FaChair className="bk-empty-card-icon" />
                  <p>All tables are currently unavailable.</p>
                </div>
              ) : (
                <div className="bk-tables-grid">
                  {activeTables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      isSelected={selectedTable?.id === table.id}
                      onSelect={() => {
                        setSelectedTable(table);
                        setPartySize(1);
                        setError(null);
                      }}
                      API_BASE={API_BASE}
                    />
                  ))}
                </div>
              )}

              {inactiveTables.length > 0 && (
                <div className="bk-section" style={{ marginTop: "1.5rem" }}>
                  <p className="bk-muted-label" style={{ marginBottom: "0.75rem" }}>
                    Unavailable ({inactiveTables.length})
                  </p>
                  <div className="bk-tables-grid bk-tables-grid-disabled">
                    {inactiveTables.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        isSelected={false}
                        onSelect={() => {}}
                        API_BASE={API_BASE}
                        disabled
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Services */}
            <div className="bk-section">
              <div className="bk-section-header">
                <h2 className="bk-section-title">
                  <FaUtensils /> Choose a Service
                </h2>
              </div>

              {services.length === 0 ? (
                <div className="bk-empty-card">
                  <FaUtensils className="bk-empty-card-icon" />
                  <p>No services available for this restaurant.</p>
                </div>
              ) : (
                <div className="bk-services-grid">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      className={`bk-service-card ${selectedService?.id === service.id ? "bk-service-card-active" : ""}`}
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="bk-service-top">
                        <span className="bk-service-name">{service.name}</span>
                        <span className="bk-service-price">
                          Rs. {service.price}
                        </span>
                      </div>
                      <div className="bk-service-bottom">
                        <span className="bk-service-duration">
                          <FaClock /> {service.duration} min
                        </span>
                        {selectedService?.id === service.id && (
                          <span className="bk-service-check">
                            <FaCheckCircle />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Booking Summary (Sticky) */}
          <div className="bk-sidebar">
            <div className="bk-summary-card">
              <h3 className="bk-summary-title">Booking Summary</h3>

              {/* Date & Time */}
              <div className="bk-summary-row">
                <div className="bk-summary-label">Date</div>
                <div className="bk-summary-value">
                  {formatDateShort(bookingDate)}
                </div>
              </div>
              <div className="bk-summary-row">
                <div className="bk-summary-label">Time</div>
                <div className="bk-summary-value">{bookingTime}</div>
              </div>

              <div className="bk-summary-divider" />

              {/* Selected Table */}
              {selectedTable ? (
                <div className="bk-summary-highlight">
                  <div className="bk-summary-row">
                    <div className="bk-summary-label">Table</div>
                    <div className="bk-summary-value">
                      Table {selectedTable.table_number}
                    </div>
                  </div>
                  <div className="bk-summary-row">
                    <div className="bk-summary-label">Capacity</div>
                    <div className="bk-summary-value">
                      {selectedTable.capacity} seats
                    </div>
                  </div>

                  {/* Seat Visualizer */}
                  <div className="bk-seat-viz">
                    {Array.from({ length: selectedTable.capacity }, (_, i) => (
                      <div
                        key={i}
                        className={`bk-seat ${i < partySize ? "bk-seat-filled" : ""}`}
                      >
                        <FaUser />
                      </div>
                    ))}
                  </div>

                  {/* Party Size Control */}
                  <div className="bk-party-control">
                    <span className="bk-summary-label">Party Size</span>
                    <div className="bk-stepper">
                      <button
                        className="bk-stepper-btn"
                        onClick={() =>
                          setPartySize((p) => Math.max(1, p - 1))
                        }
                        disabled={partySize <= 1}
                      >
                        -
                      </button>
                      <span className="bk-stepper-value">{partySize}</span>
                      <button
                        className="bk-stepper-btn"
                        onClick={() =>
                          setPartySize((p) =>
                            Math.min(selectedTable.capacity, p + 1)
                          )
                        }
                        disabled={partySize >= selectedTable.capacity}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {partySize > selectedTable.capacity && (
                    <div className="bk-warning-text">
                      Exceeds table capacity of {selectedTable.capacity}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bk-summary-empty">
                  <FaChair />
                  <span>Select a table</span>
                </div>
              )}

              <div className="bk-summary-divider" />

              {/* Selected Service */}
              {selectedService ? (
                <div className="bk-summary-row">
                  <div className="bk-summary-label">Service</div>
                  <div className="bk-summary-value bk-summary-service">
                    <span>{selectedService.name}</span>
                    <span className="bk-service-unit-price">
                      Rs. {selectedService.price} x {partySize}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bk-summary-empty">
                  <FaUtensils />
                  <span>Choose a service</span>
                </div>
              )}

              <div className="bk-summary-divider" />

              {/* Total */}
              <div className="bk-summary-total">
                <span>Total</span>
                <span className="bk-total-price">
                  Rs. {totalPrice.toLocaleString()}
                </span>
              </div>

              {/* Submit */}
              {!hasLocation && (
                <div className="bk-alert bk-alert-error" style={{ marginBottom: "0.75rem" }}>
                  <FaExclamationTriangle style={{ fontSize: "0.8rem" }} />
                  <span>This restaurant hasn't set its location yet. Bookings are temporarily unavailable.</span>
                </div>
              )}
              <button
                className={`bk-btn bk-btn-primary bk-btn-full ${bookingInProgress ? "bk-btn-loading" : ""}`}
                onClick={handleBookTable}
                disabled={!canSubmit || bookingInProgress || slotAvailable === false || checkingSlot}
              >
                {bookingInProgress ? (
                  <>
                    <Spinner animation="border" size="sm" /> Booking...
                  </>
                ) : checkingSlot ? (
                  <>
                    <Spinner animation="border" size="sm" /> Checking...
                  </>
                ) : (
                  <>
                    <FaCheckCircle /> Confirm Booking
                  </>
                )}
              </button>

              {slotAvailable === false && !checkingSlot && (
                <p className="bk-hint-text" style={{ color: "#dc2626" }}>
                  Selected time slot is unavailable
                </p>
              )}

              {!canSubmit && !bookingInProgress && slotAvailable !== false && (
                <p className="bk-hint-text">
                  {!hasLocation
                    ? "Restaurant location not set"
                    : !selectedTable
                      ? "Select a table to continue"
                      : !selectedService
                        ? "Choose a service"
                        : partySize > (selectedTable?.capacity || 0)
                          ? "Reduce party size"
                          : "Complete all fields"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        show={showSuccessModal}
        centered
        backdrop="static"
        className="bk-success-modal"
      >
        <div className="bk-success-content">
          <div className="bk-success-icon-wrap">
            <FaCheckCircle />
          </div>
          <h2 className="bk-success-title">Booking Confirmed!</h2>
          <p className="bk-success-text">
            Your table has been successfully booked for{" "}
            <strong>{formatDateShort(bookingDate)}</strong> at{" "}
            <strong>{bookingTime}</strong>.
          </p>
          <div className="bk-success-details">
            <div className="bk-success-detail">
              <span>Table</span>
              <strong>Table {selectedTable?.table_number}</strong>
            </div>
            <div className="bk-success-detail">
              <span>Guests</span>
              <strong>{partySize}</strong>
            </div>
            <div className="bk-success-detail">
              <span>Service</span>
              <strong>{selectedService?.name}</strong>
            </div>
            <div className="bk-success-detail">
              <span>Total</span>
              <strong>Rs. {totalPrice.toLocaleString()}</strong>
            </div>
          </div>
          <button
            className="bk-btn bk-btn-primary bk-btn-full"
            onClick={() => navigate("/client/dashboard", { replace: true })}
          >
            View My Bookings
          </button>
        </div>
      </Modal>

      {/* Slot Unavailable Modal */}
      <Modal
        show={showSlotModal}
        centered
        backdrop="static"
        className="bk-success-modal"
        onHide={() => setShowSlotModal(false)}
      >
        <div className="bk-success-content">
          <div className="bk-success-icon-wrap" style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 8px 24px rgba(220,38,38,0.3)" }}>
            <FaExclamationTriangle />
          </div>
          <h2 className="bk-success-title">Slot Unavailable</h2>
          <p className="bk-success-text">
            Table <strong>{selectedTable?.table_number}</strong> is already booked at <strong>{bookingTime}</strong> on <strong>{formatDateShort(bookingDate)}</strong>.
            Please select a different time or table.
          </p>
          <div className="bk-success-details">
            <div className="bk-success-detail">
              <span>Table</span>
              <strong>Table {selectedTable?.table_number}</strong>
            </div>
            <div className="bk-success-detail">
              <span>Time</span>
              <strong>{bookingTime}</strong>
            </div>
            <div className="bk-success-detail">
              <span>Date</span>
              <strong>{formatDateShort(bookingDate)}</strong>
            </div>
          </div>
          <button
            className="bk-btn bk-btn-primary bk-btn-full"
            onClick={() => setShowSlotModal(false)}
          >
            Pick Another Time
          </button>
        </div>
      </Modal>
    </div>
  );
}

function TableCard({ table, isSelected, onSelect, API_BASE, disabled }) {
  const [imgIdx, setImgIdx] = useState(0);
  const hasImages = table.images && table.images.length > 0;
  const imgCount = hasImages ? table.images.length : 0;

  return (
    <div
      className={`bk-table-card ${isSelected ? "bk-table-card-selected" : ""} ${disabled ? "bk-table-card-disabled" : ""}`}
      onClick={disabled ? undefined : onSelect}
    >
      {/* Image Section */}
      {hasImages && (
        <div className="bk-table-card-img-wrap">
          <div
            className="bk-table-card-img-track"
            style={{ transform: `translateX(-${imgIdx * 100}%)` }}
          >
            {table.images.map((img, idx) => (
              <img
                key={idx}
                src={`${API_BASE}${img}`}
                alt={`Table ${table.table_number} view ${idx + 1}`}
                className="bk-table-card-img"
              />
            ))}
          </div>
          {imgCount > 1 && (
            <div className="bk-img-controls">
              <button
                className="bk-img-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx((i) => (i - 1 + imgCount) % imgCount);
                }}
              >
                <FaChevronLeft />
              </button>
              <div className="bk-img-dots">
                {table.images.map((_, i) => (
                  <span
                    key={i}
                    className={`bk-img-dot ${i === imgIdx ? "bk-img-dot-active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImgIdx(i);
                    }}
                  />
                ))}
              </div>
              <button
                className="bk-img-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx((i) => (i + 1) % imgCount);
                }}
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="bk-table-card-body">
        <div className="bk-table-card-top">
          <div>
            <h4 className="bk-table-card-name">Table {table.table_number}</h4>
            <span className="bk-table-card-capacity">
              <FaUsers /> {table.capacity} seats
            </span>
          </div>
          {isSelected && (
            <div className="bk-table-card-check">
              <FaCheckCircle />
            </div>
          )}
        </div>

        {/* Seat dots */}
        <div className="bk-table-card-seats">
          {Array.from({ length: Math.min(table.capacity, 12) }, (_, i) => (
            <span key={i} className="bk-table-seat-dot" />
          ))}
          {table.capacity > 12 && (
            <span className="bk-table-seat-more">+{table.capacity - 12}</span>
          )}
        </div>
      </div>
    </div>
  );
}
