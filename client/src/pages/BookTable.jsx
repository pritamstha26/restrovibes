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
} from "react-icons/fa";
import "../components/client/dashboard.css";

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

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
          setRestaurant(restaurantResponse.data.data);
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
  const canSubmit =
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

            {/* Time Selector */}
            <div className="bk-section">
              <h2 className="bk-section-title">
                <FaClock /> Pick a Time
              </h2>
              <div className="bk-time-grid">
                {HOUR_OPTIONS.map((t) => (
                  <button
                    key={t}
                    className={`bk-time-chip ${bookingTime === t ? "bk-time-chip-active" : ""}`}
                    onClick={() => setBookingTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
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
              <button
                className={`bk-btn bk-btn-primary bk-btn-full ${bookingInProgress ? "bk-btn-loading" : ""}`}
                onClick={handleBookTable}
                disabled={!canSubmit || bookingInProgress}
              >
                {bookingInProgress ? (
                  <>
                    <Spinner animation="border" size="sm" /> Booking...
                  </>
                ) : (
                  <>
                    <FaCheckCircle /> Confirm Booking
                  </>
                )}
              </button>

              {!canSubmit && !bookingInProgress && (
                <p className="bk-hint-text">
                  {!selectedTable
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
