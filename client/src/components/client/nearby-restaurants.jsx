import React, { useState, useEffect } from "react";
import {
  FaLocationArrow,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaSearch,
  FaUtensils,
} from "react-icons/fa";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../apis/api";
import { reverseGeocode } from "../../utils/geocode";
import { useNavigate } from "react-router-dom";
import RestaurantProfile from "./restaurant-profile";
import "../client/dashboard.css";

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
};

const NearbyRestaurants = () => {
  const navigate = useNavigate();
  const [restaurateurs, setRestaurateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [selectedRestaurateur, setSelectedRestaurateur] = useState(null);
  const [showRestaurateurProfile, setShowRestaurateurProfile] = useState(false);

  const lerp = (a, b, t) => a + (b - a) * Math.min(Math.max(t, 0), 1);

  const lerpColor = (c1, c2, t) => {
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(lerp(r1, r2, t)), g = Math.round(lerp(g1, g2, t)), b = Math.round(lerp(b1, b2, t));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };

  const getDistanceStyle = (distance) => {
    const n = Number(distance);
    if (!Number.isFinite(n)) return { color: "#6b7280", fillColor: "#9ca3af", fillOpacity: 0.6, radius: 8, pulse: false };
    const stops = [
      { d: 0,  fill: "#22c55e", border: "#15803d", radius: 14 },
      { d: 2,  fill: "#22c55e", border: "#15803d", radius: 12 },
      { d: 5,  fill: "#eab308", border: "#a16207", radius: 10 },
      { d: 10, fill: "#f97316", border: "#c2410c", radius: 9 },
      { d: 25, fill: "#ef4444", border: "#b91c1c", radius: 8 },
      { d: 50, fill: "#a855f7", border: "#6b21a8", radius: 7 },
    ];
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (n >= stops[i].d && n <= stops[i + 1].d) {
        lo = stops[i]; hi = stops[i + 1]; break;
      }
    }
    if (n > stops[stops.length - 1].d) { lo = hi = stops[stops.length - 1]; }
    const t = hi.d === lo.d ? 0 : (n - lo.d) / (hi.d - lo.d);
    return {
      fillColor: lerpColor(lo.fill, hi.fill, t),
      color: lerpColor(lo.border, hi.border, t),
      fillOpacity: lerp(0.9, 0.65, t),
      radius: lerp(lo.radius, hi.radius, t),
      pulse: n <= 2,
    };
  };

  const getRestaurantPoint = (r) => {
    const lat = Number(r.latitude || r.dataValues?.latitude);
    const lng = Number(r.longitude || r.dataValues?.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return [lat, lng];
  };

  const userMapCenter = userLocation
    ? [Number(userLocation.latitude), Number(userLocation.longitude)]
    : null;

  const mapCenter =
    userMapCenter ||
    restaurateurs.map(getRestaurantPoint).find(Boolean) || [27.7172, 85.324];

  useEffect(() => {
    if (navigator.geolocation) setLocationEnabled(true);
  }, []);

  useEffect(() => {
    fetchUserLocation();
  }, []);

  const fetchUserLocation = async () => {
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        fetchNearbyRestaurateurs(null, null, searchRadius);
        return;
      }
      const response = await api.get("/location/current");
      if (response.status === 200 && response.data.success) {
        const { latitude: rawLat, longitude: rawLng, location_name } = response.data.data;
        const latitude = Number(rawLat);
        const longitude = Number(rawLng);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setUserLocation({ latitude, longitude, location_name });
          fetchNearbyRestaurateurs(latitude, longitude, searchRadius);
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setUserLocation({ latitude, longitude });
              fetchNearbyRestaurateurs(latitude, longitude, searchRadius);
            },
            () => {
              setError("Location access blocked. Showing all restaurants.");
              fetchNearbyRestaurateurs(null, null, searchRadius);
            }
          );
        } else {
          setError("Location unavailable. Showing all restaurants.");
          fetchNearbyRestaurateurs(null, null, searchRadius);
        }
      }
    } catch (err) {
      console.error("Error fetching user location:", err);
      fetchNearbyRestaurateurs(null, null, searchRadius);
    }
  };

  const handleGetCurrentLocation = () => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location_name = (await reverseGeocode(latitude, longitude)) || "";
        setUserLocation({ latitude, longitude, location_name });
        const token = sessionStorage.getItem("access_token");
        if (token) {
          api.put(
            "/location/update",
            { latitude, longitude, location_name },
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch(() => {});
        }
        fetchNearbyRestaurateurs(latitude, longitude, searchRadius);
      },
      (err) => {
        setLoading(false);
        const msgs = {
          1: "You denied the location request.",
          2: "Location information is unavailable.",
          3: "Location request timed out.",
        };
        setError("Error detecting location. " + (msgs[err.code] || "Unknown error."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const fetchNearbyRestaurateurs = async (latitude, longitude, maxDistance) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (latitude != null && longitude != null) {
        params.latitude = latitude;
        params.longitude = longitude;
        if (maxDistance != null) params.maxDistance = maxDistance;
      }
      const response = await api.get("/location/nearby-restaurateurs", { params });
      if (response.status === 200) {
        const raw = response.data.data || [];
        const data = raw.map((item) => {
          const b = item.dataValues || item;
          return {
            id: b.id || b.user_id || b.restaurateur_id,
            first_name: b.first_name || b.name || "",
            last_name: b.last_name || "",
            phone_number: b.phone_number || b.phone || "",
            email: b.email || "",
            location_name: b.location_name || b.location || "",
            latitude: Number(b.latitude),
            longitude: Number(b.longitude),
            distance: b.distance != null ? Number(b.distance) : null,
            duration: b.duration != null ? Number(b.duration) : null,
            seat_capacity: b.seat_capacity,
            raw: b,
            dataValues: b,
          };
        });
        setRestaurateurs(data);
        if (data.length === 0) {
          setError("No restaurants found. Try adjusting your search radius.");
        }
      }
    } catch (error) {
      console.error("Error fetching nearby restaurateurs:", error);
      setError("Failed to fetch restaurants. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getDistanceBadgeStyle = (distance) => {
    const n = Number(distance);
    if (!Number.isFinite(n)) return { color: "#475569", background: "#f1f5f9", border: "#e2e8f0" };
    if (n <= 2)  return { color: "#065f46", background: "#ecfdf5", border: "#d1fae5" };
    if (n <= 5)  return { color: "#713f12", background: "#fefce8", border: "#fef08a" };
    if (n <= 10) return { color: "#7c2d12", background: "#fff7ed", border: "#fed7aa" };
    if (n <= 25) return { color: "#7f1d1d", background: "#fef2f2", border: "#fecaca" };
    return                     { color: "#581c87", background: "#faf5ff", border: "#e9d5ff" };
  };

  const getDistanceText = (d) => {
    const n = Number(d);
    if (!Number.isFinite(n)) return "";
    return n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`;
  };

  const getDurationText = (secs) => {
    const n = Number(secs);
    if (!Number.isFinite(n) || n <= 0) return "";
    const mins = Math.round(n / 60);
    if (mins < 1) return "<1 min";
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  const activeRestaurants = restaurateurs.filter(
    (r) => r.latitude != null && r.longitude != null
  );

  const makeGradientIcon = (distStyle, isPulse) => {
    const size = distStyle.radius * 2.2;
    const grad = `linear-gradient(135deg, ${distStyle.fillColor}, ${distStyle.color})`;
    const pulseRing = isPulse
      ? `<div class="nr-marker-ring" style="border-color:${distStyle.fillColor};width:${size + 16}px;height:${size + 16}px;"></div>`
      : "";
    const html = `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size + 16}px;height:${size + 16}px;">
        ${pulseRing}
        <div style="
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          background:${grad};
          border:2.5px solid ${distStyle.color};
          box-shadow:0 2px 8px ${distStyle.color}55, 0 0 0 2px rgba(255,255,255,0.6);
          position:relative;
          z-index:2;
        "></div>
      </div>`;
    return L.divIcon({
      html,
      className: "",
      iconSize: [size + 16, size + 16],
      iconAnchor: [(size + 16) / 2, (size + 16) / 2],
      popupAnchor: [0, -(size / 2 + 4)],
    });
  };

  return (
    <div className="nr-page">
      {/* ── Header ───────────────────────────────────── */}
      <div className="nr-header">
        <div className="nr-header-inner">
          <div>
            <h1 className="nr-title">Find Nearby Restaurants</h1>
            <p className="nr-subtitle">
              Discover restaurants close to you and book instantly
            </p>
          </div>
          {userLocation && (
            <div className="nr-user-pill">
              <FaMapMarkerAlt style={{ fontSize: "0.7rem", color: "#10b981" }} />
              <span className="nr-user-pill-text">
                {userLocation.location_name || `${Number(userLocation.latitude).toFixed(4)}, ${Number(userLocation.longitude).toFixed(4)}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Search Bar ───────────────────────────────── */}
      <div className="nr-toolbar">
        <div className="nr-toolbar-inner">
          <div className="nr-search-bar">
            <div className="nr-radius-select">
              <FaSearch style={{ fontSize: "0.75rem", opacity: 0.5 }} />
              <select
                value={searchRadius ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  setSearchRadius(val);
                  if (userLocation) {
                    fetchNearbyRestaurateurs(
                      userLocation.latitude,
                      userLocation.longitude,
                      val
                    );
                  }
                }}
              >
                <option value="">All</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
              </select>
            </div>
            <button
              className="nr-btn nr-btn-locate"
              onClick={handleGetCurrentLocation}
              disabled={!locationEnabled || loading}
            >
              <FaLocationArrow />
              <span>{loading ? "Locating..." : "Use My Location"}</span>
            </button>
          </div>
          {!loading && activeRestaurants.length > 0 && (
            <div className="nr-results-count">
              {activeRestaurants.length} restaurant{activeRestaurants.length !== 1 ? "s" : ""} found
            </div>
          )}
        </div>
      </div>

      {/* ── Map (Top, Full Width) ────────────────────── */}
      <div className="nr-map-wrapper">
        <div className="nr-map-container">
          <MapContainer
            center={mapCenter}
            zoom={userLocation ? 13 : 12}
            scrollWheelZoom={false}
            className="nr-map"
          >
            <RecenterMap center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url={import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
            />
            {userMapCenter && (
              <CircleMarker
                center={userMapCenter}
                radius={10}
                pathOptions={{
                  color: "#3b82f6",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.85,
                }}
              >
                <Popup>You are here</Popup>
              </CircleMarker>
            )}
            {activeRestaurants.map((r) => {
              const point = getRestaurantPoint(r);
              if (!point) return null;
              const name = `${r.first_name || ""} ${r.last_name || ""}`.trim();
              const distStyle = getDistanceStyle(r.distance);
              const rid = r.id || r.dataValues?.id;
              return (
                <Marker
                  key={r.id}
                  position={point}
                  icon={makeGradientIcon(distStyle, distStyle.pulse)}
                >
                  <Popup>
                    <div className="nr-popup-content">
                      <strong className="nr-popup-name">{name || "Restaurant"}</strong>
                      <span className="nr-popup-distance" style={{ color: distStyle.fillColor }}>
                        {getDistanceText(r.distance)}{r.duration ? ` · ${getDurationText(r.duration)}` : ""} away
                      </span>
                      {r.location_name && (
                        <span className="nr-popup-location">{r.location_name}</span>
                      )}
                      <div className="nr-popup-actions">
                        <button
                          className="nr-popup-btn nr-popup-btn-profile"
                          onClick={() => {
                            setSelectedRestaurateur(rid);
                            sessionStorage.setItem("selected_restaurateur_id", rid);
                            setShowRestaurateurProfile(true);
                          }}
                        >
                          Profile
                        </button>
                        <button
                          className="nr-popup-btn nr-popup-btn-book"
                          onClick={() => navigate(`/book/${rid}`)}
                        >
                          Book Table
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          <div className="nr-map-legend">
            <span className="nr-legend-label">Distance</span>
            <div className="nr-legend-gradient-bar" />
            <div className="nr-legend-range">
              <span>Near</span>
              <span>Far</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards Section ────────────────────────────── */}
      <div className="nr-cards-section">
        <div className="nr-cards-section-inner">
          {/* Loading */}
          {loading && (
            <div className="nr-loading">
              <div className="nr-loading-pulse" />
              <div className="nr-loading-pulse" />
              <div className="nr-loading-pulse" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="nr-error-banner">
              <span>{error}</span>
            </div>
          )}

          {/* Cards Grid */}
          {!loading && activeRestaurants.length > 0 && (
            <div className="nr-cards-grid">
              {activeRestaurants.map((r, i) => {
                const id = r.id || r.dataValues?.id;
                const fn = r.first_name || "";
                const ln = r.last_name || "";
                const full = `${fn} ${ln}`.trim();
                const initials = (fn?.[0] || "") + (ln?.[0] || "");
                const dist = r.distance;
                const loc = r.location_name;
                const phone = r.phone_number;
                const email = r.email;

                return (
                  <div
                    className="nr-card"
                    key={r.id}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="nr-card-top">
                      <div className="nr-card-accent" />
                      <div className="nr-card-identity">
                        <div className="nr-avatar">
                          {initials || <FaUtensils />}
                        </div>
                        <div className="nr-card-info">
                          <h3 className="nr-card-name">
                            {full || "Unnamed Restaurant"}
                          </h3>
                          {dist != null && (
                            <span className="nr-distance-badge" style={getDistanceBadgeStyle(dist)}>
                              <FaLocationArrow style={{ fontSize: "0.55rem" }} />
                              {getDistanceText(dist)}{r.duration ? ` · ${getDurationText(r.duration)}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="nr-card-body">
                      {loc && (
                        <div className="nr-detail-row">
                          <FaMapMarkerAlt className="nr-detail-icon" />
                          <span className="nr-detail-text">{loc}</span>
                        </div>
                      )}
                      {phone && (
                        <div className="nr-detail-row">
                          <FaPhoneAlt className="nr-detail-icon" />
                          <span className="nr-detail-text">{phone}</span>
                        </div>
                      )}
                      {email && (
                        <div className="nr-detail-row">
                          <FaEnvelope className="nr-detail-icon" />
                          <span className="nr-detail-text nr-truncate">{email}</span>
                        </div>
                      )}
                    </div>

                    <div className="nr-card-actions">
                      <button
                        className="nr-btn nr-btn-ghost"
                        onClick={() => {
                          setSelectedRestaurateur(id);
                          sessionStorage.setItem("selected_restaurateur_id", id);
                          setShowRestaurateurProfile(true);
                        }}
                      >
                        Profile
                      </button>
                      <button
                        className="nr-btn nr-btn-reserve"
                        onClick={() => navigate(`/book/${id}`)}
                      >
                        Reserve a Table
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty: no location */}
          {!loading && !userLocation && restaurateurs.length === 0 && (
            <div className="nr-empty">
              <div className="nr-empty-icon">
                <FaLocationArrow />
              </div>
              <h3>Set your location</h3>
              <p>Enable location access or search manually to find nearby restaurants.</p>
              <button
                className="nr-btn nr-btn-dark"
                onClick={handleGetCurrentLocation}
                disabled={!locationEnabled}
              >
                <FaLocationArrow /> Enable Location
              </button>
            </div>
          )}

          {/* Empty: has location but no results */}
          {!loading && userLocation && restaurateurs.length === 0 && (
            <div className="nr-empty">
              <div className="nr-empty-icon">
                <FaSearch />
              </div>
              <h3>No restaurants nearby</h3>
              <p>Try increasing your search radius or moving to a different area.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Restaurant Profile Overlay ─────────────────── */}
      {showRestaurateurProfile && selectedRestaurateur && (
        <div className="nr-profile-overlay">
          <div className="nr-profile-header">
            <h3>Restaurant Profile</h3>
            <button
              className="nr-btn nr-btn-ghost"
              onClick={() => setShowRestaurateurProfile(false)}
            >
              Back to Search
            </button>
          </div>
          <RestaurantProfile restaurantId={selectedRestaurateur} />
        </div>
      )}
    </div>
  );
};

export default NearbyRestaurants;
