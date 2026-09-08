import React, { useState, useEffect } from "react";
import { Container, Spinner, Form, Button, Alert, Row, Col } from "react-bootstrap";
import {
  FaMapMarkerAlt,
  FaRoute,
  FaCompass,
  FaExternalLinkAlt,
  FaClock,
  FaShieldAlt,
  FaRedo,
  FaKey,
} from "react-icons/fa";
import api from "../../apis/api";
import { jwtDecode } from "jwt-decode";
import { usePolling } from "../../hooks/usePolling";
import "./dashboard.css";

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcETA(distanceKm, speedKmh = 40) {
  const mins = (distanceKm / speedKmh) * 60;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function getCompassDir(bearing) {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(bearing / 22.5) % 16];
}

function buildGoogleMapsURL(lat, lng, origin = null) {
  const base = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams();
  params.set("destination", `${lat},${lng}`);
  if (origin) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }
  params.set("travelmode", "driving");
  return `${base}&${params.toString()}`;
}

export default function GPSNavigation() {
  const [appointments, setAppointments] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualError, setManualError] = useState(null);
  const [locationSource, setLocationSource] = useState("gps");

  const NON_NAVIGABLE_STATUSES = ["cancelled", "completed", "no_show", "rejected"];

  const fetchAppointments = async () => {
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }
      const decoded = jwtDecode(token);
      const res = await api.get(`/appointments/client/${decoded.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const raw = res.data.data || [];
      const apps = raw
        .map((g) => (g.items && g.items.length ? g.items[0] : g))
        .filter(
          (a) =>
            a.restaurateur_lat &&
            a.restaurateur_lng &&
            !NON_NAVIGABLE_STATUSES.includes(a.status),
        );
      setAppointments(apps);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedLocation = async (token) => {
    try {
      const res = await api.get("/location/current", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 200 && res.data.success) {
        const { latitude, longitude } = res.data.data;
        if (latitude && longitude) {
          setUserLocation({ lat: Number(latitude), lng: Number(longitude) });
          setLocationSource("saved");
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  };

  const tryGeolocation = () => {
    setGeoError(null);
    setManualMode(false);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setManualMode(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationSource("gps");
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message);
        setLocationSource("manual");
        setManualMode(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
    );
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    setManualError(null);

    const lat = Number(manualLat);
    const lng = Number(manualLng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setManualError("Enter a valid latitude (-90 to 90).");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setManualError("Enter a valid longitude (-180 to 180).");
      return;
    }

    setUserLocation({ lat, lng });
    setLocationSource("manual");
    setManualMode(false);

    const token = sessionStorage.getItem("access_token");
    if (token) {
      api.put(
        "/location/update",
        { latitude: lat, longitude: lng, location_name: "" },
        { headers: { Authorization: `Bearer ${token}` } },
      ).catch(() => {});
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      setManualMode(true);
      setLocationSource("manual");
      return;
    }

    let decoded;
    try {
      decoded = jwtDecode(token);
    } catch {
      setLoading(false);
      setManualMode(true);
      setLocationSource("manual");
      return;
    }

    fetchAppointments().then(async () => {
      const saved = await fetchSavedLocation(token);
      if (!saved) {
        tryGeolocation();
      }
    });
  }, []);

  usePolling(fetchAppointments, 5000);

  if (loading) {
    return (
      <div className="slick-nav-shell">
        <div className="slick-nav-header">
          <h1 className="slick-nav-title">Navigate</h1>
        </div>
        <div className="slick-nav-body text-center py-5">
          <Spinner animation="border" size="sm" variant="dark" />
          <p className="text-muted mt-3 small font-monospace">LOADING NAVIGATION CONTEXT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="slick-nav-shell">
      <div className="slick-nav-header">
        <h1 className="slick-nav-title">Navigate</h1>
      </div>

      <div className="slick-nav-body">
        <div className="slick-metric-strip">
          <div className="slick-metric-chip">
            <div className="slick-metric-icon">
              <FaShieldAlt />
            </div>
            <div className="slick-metric-content">
              <span className="slick-metric-label">Location Status</span>
              <span className="slick-metric-value">
                {userLocation ? (
                  <span className="slick-badge slick-badge-success">
                    <span className="slick-badge-dot"></span>
                    Locked
                  </span>
                ) : (
                  <span className="slick-badge slick-badge-progress">
                    <span className="slick-badge-dot"></span>
                    {geoError ? "Denied" : "Scanning"}
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="slick-metric-chip">
            <div className="slick-metric-icon">
              <FaRoute />
            </div>
            <div className="slick-metric-content">
              <span className="slick-metric-label">Active Routes</span>
              <span className="slick-metric-value">{appointments.length}</span>
            </div>
          </div>
          <div className="slick-metric-chip">
            <div className="slick-metric-icon">
              <FaCompass />
            </div>
            <div className="slick-metric-content">
              <span className="slick-metric-label">Coordinate Source</span>
              <span className="slick-metric-value">
                {locationSource === "gps" ? "GPS" : locationSource === "saved" ? "Saved" : "Manual"}
              </span>
            </div>
          </div>
        </div>

        {geoError && !userLocation && (
          <Alert variant="warning" className="py-2 px-3 mb-3" style={{ fontSize: "0.85rem" }}>
            Location access was blocked or unavailable. Distance and ETA are hidden until you enable GPS or set coordinates manually.
            <div className="mt-2">
              <Button size="sm" variant="outline-primary" onClick={tryGeolocation}>
                <FaRedo className="me-1" />
                Retry GPS
              </Button>
              <Button size="sm" variant="primary" className="ms-2" onClick={() => setManualMode(true)}>
                <FaKey className="me-1" />
                Enter coordinates manually
              </Button>
            </div>
          </Alert>
        )}

        {manualMode && !userLocation && (
          <Alert variant="info" className="py-2 px-3 mb-3" style={{ fontSize: "0.85rem" }}>
            <Form onSubmit={handleManualSubmit}>
              <Row className="g-2 align-items-end">
                <Col md={4}>
                  <Form.Label className="mb-1">Latitude</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    placeholder="27.7172"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    required
                    min={-90}
                    max={90}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="mb-1">Longitude</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    placeholder="85.324"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    required
                    min={-180}
                    max={180}
                  />
                </Col>
                <Col md={4}>
                  <Button type="submit" variant="primary" className="w-100">
                    Set Location
                  </Button>
                </Col>
              </Row>
              {manualError && <div className="text-danger mt-2 small">{manualError}</div>}
            </Form>
          </Alert>
        )}

        {appointments.length === 0 ? (
          <div className="slick-empty">
            <FaRoute className="mb-2 text-muted" style={{ fontSize: "1.4rem" }} />
            <h5 className="fw-semibold mb-1">No Navigable Appointments</h5>
            <p className="text-muted small mb-0">Only appointments with known restaurant locations appear here.</p>
          </div>
        ) : (
          <div className="mt-2">
            {appointments.map((appt) => {
              const destLat = Number(appt.restaurateur_lat);
              const destLng = Number(appt.restaurateur_lng);
              const dist = userLocation
                ? haversineDistance(userLocation.lat, userLocation.lng, destLat, destLng)
                : null;
              const eta = dist ? calcETA(dist, 40) : null;
              const bearing = userLocation
                ? Math.atan2(
                    (destLng - userLocation.lng) * Math.cos((userLocation.lat * Math.PI) / 180),
                    destLat - userLocation.lat,
                  ) * (180 / Math.PI)
                : null;
              const compassDir = bearing !== null ? getCompassDir((bearing + 360) % 360) : null;
              const googleUrl = buildGoogleMapsURL(destLat, destLng, userLocation);

              return (
                <div className="slick-app-card" key={appt.id}>
                  <div className="slick-app-header">
                    <div className="slick-app-primary">
                      <div className="slick-app-icon">
                        <FaMapMarkerAlt />
                      </div>
                      <div className="flex-grow-1">
                        <h3 className="slick-app-title">{appt.restaurateur_name || "Restaurant"}</h3>
                        {appt.restaurateur_location && (
                          <div className="slick-app-location">
                            <FaMapMarkerAlt style={{ fontSize: "0.7rem" }} />
                            <span>{appt.restaurateur_location}</span>
                          </div>
                        )}
                        {appt.service_name && (
                          <div className="slick-app-meta">
                            <span className="slick-app-meta-item">
                              <FaClock style={{ fontSize: "0.7rem" }} />
                              {new Date(appt.date).toLocaleString("en-US", {
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </span>
                            <span className="slick-app-meta-item" style={{ textTransform: "capitalize" }}>
                              {appt.service_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                      {dist !== null && (
                        <span className="slick-badge slick-badge-success">
                          <span className="slick-badge-dot"></span>
                          {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                        </span>
                      )}
                      {compassDir && (
                        <span className="slick-badge slick-badge-neutral">
                          <span className="slick-badge-dot"></span>
                          {compassDir}
                        </span>
                      )}
                      {eta && (
                        <span className="slick-badge slick-badge-progress">
                          <span className="slick-badge-dot"></span>
                          {eta}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
                    <a className="slick-nav-btn" href={googleUrl} target="_blank" rel="noreferrer">
                      <FaExternalLinkAlt />
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}