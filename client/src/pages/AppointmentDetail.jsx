import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaUtensils,
  FaTag,
  FaMoneyBillWave,
  FaPhone,
  FaEnvelope,
  FaLocationArrow,
  FaTimesCircle,
  FaCheckCircle,
  FaHourglassHalf,
  FaExclamationTriangle,
  FaSpinner,
  FaStar,
  FaRoute,
} from "react-icons/fa";
import api from "../apis/api";
import StarRating from "../components/StarRating";
import "../components/client/dashboard.css";

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15, { animate: true });
    }
  }, [center, map]);
  return null;
};

const statusConfig = {
  pending: {
    label: "Pending",
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
    icon: FaHourglassHalf,
  },
  accepted: {
    label: "Accepted",
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#93c5fd",
    icon: FaCheckCircle,
  },
  confirmed: {
    label: "Confirmed",
    color: "#10b981",
    bg: "#ecfdf5",
    border: "#6ee7b7",
    icon: FaCheckCircle,
  },
  in_progress: {
    label: "In Progress",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#c4b5fd",
    icon: FaSpinner,
  },
  completed: {
    label: "Completed",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    icon: FaCheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    icon: FaTimesCircle,
  },
  no_show: {
    label: "No Show",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fca5a5",
    icon: FaExclamationTriangle,
  },
  rejected: {
    label: "Rejected",
    color: "#be185d",
    bg: "#fdf2f8",
    border: "#f9a8d4",
    icon: FaTimesCircle,
  },
  late_arrival: {
    label: "Late Arrival",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    icon: FaExclamationTriangle,
  },
  overstayed: {
    label: "Overstayed",
    color: "#9333ea",
    bg: "#faf5ff",
    border: "#d8b4fe",
    icon: FaHourglassHalf,
  },
};

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [existingRating, setExistingRating] = useState(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/appointments/${id}`);
        if (response.status === 200) {
          const data = response.data?.data || response.data;
          const appt = Array.isArray(data) ? data[0] : data;
          setAppointment(appt);
          setTimeout(() => setMapReady(true), 300);

          if (appt?.status === "completed") {
            try {
              const ratingRes = await api.get(`/ratings/appointment/${appt.id}`);
              const ratings = ratingRes.data?.data || [];
              const myExisting = ratings.find((r) => r.targetType === "restaurateur");
              if (myExisting) {
                setExistingRating(myExisting);
                setMyRating(myExisting.rating);
                setRatingSubmitted(true);
              }
            } catch {}
          }
        } else {
          setError("Appointment not found");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load appointment");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAppointment();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this appointment?"))
      return;
    try {
      setCancelInProgress(true);
      const response = await api.put(`/appointments/${id}/cancel`, {});
      if (response.status === 200) {
        setAppointment((prev) => ({ ...prev, status: "cancelled" }));
      } else {
        alert(response.data?.message || "Failed to cancel appointment");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error cancelling appointment");
    } finally {
      setCancelInProgress(false);
    }
  };

  const handleNavigate = () => {
    const lat =
      appointment.restaurateurs?.latitude ||
      appointment.restaurateur_lat;
    const lng =
      appointment.restaurateurs?.longitude ||
      appointment.restaurateur_lng;
    if (lat && lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        "_blank",
      );
    }
  };

  const handleSubmitRating = async (starValue) => {
    if (!appointment) return;
    try {
      const res = await api.post("/ratings", {
        appointmentId: appointment.id,
        rating: starValue,
        targetType: "restaurateur",
      });
      if (res.status === 200) {
        setMyRating(starValue);
        setRatingSubmitted(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit rating");
    }
  };

  if (loading) {
    return (
      <div className="v-dashboard-root">
        <div className="v-nav-scope">
          <div className="v-scope-container">
            <div className="v-scope-switcher">
              <span className="v-org">Appointments</span>
              <span className="v-slash">/</span>
              <span className="v-project">Loading...</span>
            </div>
          </div>
        </div>
        <div className="ap-detail-skeleton">
          <div className="ap-skel-block" style={{ height: 320 }} />
          <div className="ap-skel-block" style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="v-dashboard-root">
        <div className="v-nav-scope">
          <div className="v-scope-container">
            <div className="v-scope-switcher">
              <span className="v-org">Appointments</span>
              <span className="v-slash">/</span>
              <span className="v-project">Error</span>
            </div>
          </div>
        </div>
        <div className="ap-detail-skeleton">
          <div className="ap-error-card">
            <div className="ap-error-icon">
              <FaExclamationTriangle />
            </div>
            <h3>Appointment Not Found</h3>
            <p>{error || "The appointment you're looking for doesn't exist."}</p>
            <button className="ap-btn ap-btn-primary" onClick={() => navigate("/client")}>
              <FaArrowLeft /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const appt = appointment;
  const restName =
    appt.restaurateur_name ||
    (appt.restaurateurs?.first_name && appt.restaurateurs?.last_name
      ? `${appt.restaurateurs.first_name} ${appt.restaurateurs.last_name}`
      : "Restaurant");
  const serviceName = appt.service_name || appt.service?.name || "Service";
  const servicePrice = appt.price || appt.service?.price || appt.booked_price || 0;
  const serviceDuration = appt.duration || appt.service?.duration || 0;
  const locationName =
    appt.restaurateur_location || appt.restaurateurs?.location_name || null;
  const lat = Number(
    appt.restaurateur_lat || appt.restaurateurs?.latitude,
  );
  const lng = Number(
    appt.restaurateur_lng || appt.restaurateurs?.longitude,
  );
  const hasCoords = lat && lng && !Number.isNaN(lat) && !Number.isNaN(lng);
  const status = statusConfig[appt.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const canCancel =
    appt.status !== "cancelled" &&
    appt.status !== "completed" &&
    appt.status !== "no_show";

  const formattedDate = new Date(appt.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = new Date(appt.date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const endTimeStr = appt.end_time
    ? new Date(appt.end_time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <div className="v-dashboard-root">
      {/* Scope bar */}
      <div className="v-nav-scope">
        <div className="v-scope-container">
          <div className="v-scope-switcher">
            <span className="v-org">Appointments</span>
            <span className="v-slash">/</span>
            <span className="v-project">{serviceName}</span>
          </div>
        </div>
      </div>

      <div className="ap-detail-container">
        {/* Top row: Back + Status + Actions */}
        <div className="ap-top-bar">
          <button className="ap-back-btn" onClick={() => navigate("/client")}>
            <FaArrowLeft />
          </button>
          <div className="ap-top-info">
            <h1 className="ap-top-title">{serviceName}</h1>
            <p className="ap-top-subtitle">{restName}</p>
          </div>
          <div className="ap-top-actions">
            <div
              className="ap-status-badge"
              style={{
                color: status.color,
                background: status.bg,
                borderColor: status.border,
              }}
            >
              <StatusIcon />
              <span>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="ap-detail-grid">
          {/* Left column: Details */}
          <div className="ap-col-main">
            {/* Info Card */}
            <div className="ap-card">
              <div className="ap-card-header">
                <h2 className="ap-card-heading">Appointment Details</h2>
              </div>
              <div className="ap-card-body">
                <div className="ap-detail-row">
                  <div className="ap-detail-icon-wrap">
                    <FaCalendarAlt />
                  </div>
                  <div className="ap-detail-content">
                    <span className="ap-detail-label">Date</span>
                    <span className="ap-detail-value">{formattedDate}</span>
                  </div>
                </div>

                <div className="ap-detail-row">
                  <div className="ap-detail-icon-wrap">
                    <FaClock />
                  </div>
                  <div className="ap-detail-content">
                    <span className="ap-detail-label">Time</span>
                    <span className="ap-detail-value">
                      {formattedTime}
                      {endTimeStr && (
                        <span className="ap-detail-muted">
                          {" "}
                          — {endTimeStr}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="ap-detail-row">
                  <div className="ap-detail-icon-wrap">
                    <FaUtensils />
                  </div>
                  <div className="ap-detail-content">
                    <span className="ap-detail-label">Service</span>
                    <span className="ap-detail-value">{serviceName}</span>
                  </div>
                </div>

                <div className="ap-detail-row">
                  <div className="ap-detail-icon-wrap">
                    <FaTag />
                  </div>
                  <div className="ap-detail-content">
                    <span className="ap-detail-label">Duration</span>
                    <span className="ap-detail-value">
                      {serviceDuration} minutes
                    </span>
                  </div>
                </div>

                <div className="ap-detail-row">
                  <div className="ap-detail-icon-wrap">
                    <FaMoneyBillWave />
                  </div>
                  <div className="ap-detail-content">
                    <span className="ap-detail-label">Total Cost</span>
                    <span className="ap-detail-value ap-detail-price">
                      NPR {servicePrice}
                    </span>
                  </div>
                </div>

                <div className="ap-detail-row">
                  <div className="ap-detail-icon-wrap">
                    <FaUsers />
                  </div>
                  <div className="ap-detail-content">
                    <span className="ap-detail-label">Party Size</span>
                    <span className="ap-detail-value">
                      {appt.party_size || 1}{" "}
                      {(appt.party_size || 1) === 1 ? "person" : "people"}
                    </span>
                  </div>
                </div>

                {appt.clientType && appt.clientType !== "regular" && (
                  <div className="ap-detail-row">
                    <div className="ap-detail-icon-wrap ap-detail-icon-highlight">
                      <FaStar />
                    </div>
                    <div className="ap-detail-content">
                      <span className="ap-detail-label">Client Type</span>
                      <span className="ap-detail-value ap-detail-capitalize">
                        {appt.clientType.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Provider Card */}
            <div className="ap-card">
              <div className="ap-card-header">
                <h2 className="ap-card-heading">Provider</h2>
              </div>
              <div className="ap-card-body">
                <div className="ap-provider-row">
                  <div className="ap-provider-avatar">
                    {restName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ap-provider-info">
                    <span className="ap-provider-name">{restName}</span>
                    {locationName && (
                      <span className="ap-provider-location">
                        <FaMapMarkerAlt /> {locationName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ap-provider-contacts">
                  {appt.restaurateurs?.email && (
                    <a
                      className="ap-contact-chip"
                      href={`mailto:${appt.restaurateurs.email}`}
                    >
                      <FaEnvelope /> {appt.restaurateurs.email}
                    </a>
                  )}
                  {appt.restaurateurs?.phone_number && (
                    <a
                      className="ap-contact-chip"
                      href={`tel:${appt.restaurateurs.phone_number}`}
                    >
                      <FaPhone /> {appt.restaurateurs.phone_number}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Map + Actions */}
          <div className="ap-col-side">
            {/* Map Card */}
            {hasCoords && (
              <div className="ap-card ap-map-card">
                <div className="ap-card-header">
                  <h2 className="ap-card-heading">
                    <FaMapMarkerAlt className="ap-heading-icon" /> Location
                  </h2>
                </div>
                <div className="ap-map-wrapper">
                  {mapReady && (
                    <MapContainer
                      center={[lat, lng]}
                      zoom={15}
                      scrollWheelZoom={false}
                      className="ap-leaflet-map"
                      attributionControl={false}
                    >
                      <TileLayer url={import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                      <CircleMarker
                        center={[lat, lng]}
                        radius={10}
                        pathOptions={{
                          color: "#4f46e5",
                          fillColor: "#6366f1",
                          fillOpacity: 0.25,
                          weight: 3,
                        }}
                      >
                        <Popup>
                          <strong>{restName}</strong>
                          <br />
                          {locationName}
                        </Popup>
                      </CircleMarker>
                      <CircleMarker
                        center={[lat, lng]}
                        radius={4}
                        pathOptions={{
                          color: "#4f46e5",
                          fillColor: "#4f46e5",
                          fillOpacity: 1,
                          weight: 0,
                        }}
                      />
                    </MapContainer>
                  )}
                </div>
                {locationName && (
                  <div className="ap-map-address">
                    <FaMapMarkerAlt /> {locationName}
                  </div>
                )}
              </div>
            )}

            {/* Summary + Actions Card */}
            <div className="ap-card ap-actions-card">
              <div className="ap-card-body">
                <div className="ap-summary-rows">
                  <div className="ap-summary-line">
                    <span>Service</span>
                    <span>{serviceName}</span>
                  </div>
                  <div className="ap-summary-line">
                    <span>Duration</span>
                    <span>{serviceDuration}m</span>
                  </div>
                  <div className="ap-summary-divider" />
                  <div className="ap-summary-total">
                    <span>Total</span>
                    <span className="ap-summary-price">NPR {servicePrice}</span>
                  </div>
                </div>

                <div className="ap-action-buttons">
                  {hasCoords && (
                    <button className="ap-btn ap-btn-navigate" onClick={handleNavigate}>
                      <FaLocationArrow /> Get Directions
                    </button>
                  )}
                  {canCancel && (
                    <button
                      className="ap-btn ap-btn-cancel"
                      onClick={handleCancel}
                      disabled={cancelInProgress}
                    >
                      {cancelInProgress ? (
                        <>
                          <FaSpinner className="ap-spin" /> Cancelling...
                        </>
                      ) : (
                        <>
                          <FaTimesCircle /> Cancel Appointment
                        </>
                      )}
                    </button>
                  )}
                  <button
                    className="ap-btn ap-btn-back"
                    onClick={() => navigate("/client")}
                  >
                    <FaRoute /> Back to Dashboard
                  </button>
                </div>

                {appt.status === "completed" && (
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginTop: 12 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                      {ratingSubmitted ? "Your Rating" : "Rate this experience"}
                    </div>
                    <StarRating
                      value={myRating}
                      onChange={handleSubmitRating}
                      readonly={ratingSubmitted}
                      size={24}
                    />
                    {ratingSubmitted && (
                      <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 4 }}>
                        Thank you for your feedback!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
