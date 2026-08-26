import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { forwardGeocode, reverseGeocode } from "../../utils/geocode";
import api from "../../apis/api";
import "./location-setup.css";

const pinIcon = new L.DivIcon({
  className: "ls-pin",
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
  html: `<div class="ls-pin-head"></div><div class="ls-pin-base"></div>`,
});

const DEFAULT_CENTER = [27.7172, 85.324];

function MapClickHandler({ onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function LocationSetup({ onSaved, onSkip }) {
  const [address, setAddress] = useState("");
  const [markerPos, setMarkerPos] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState("");

  const handleSearch = useCallback(async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setError(null);
    try {
      const result = await forwardGeocode(address.trim());
      if (result) {
        setMarkerPos([result.latitude, result.longitude]);
        setResolvedAddress(result.display_name);
      } else {
        setError("Address not found. Try a more specific location.");
      }
    } catch {
      setError("Geocoding failed. Try again.");
    } finally {
      setGeocoding(false);
    }
  }, [address]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setGeocoding(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMarkerPos([latitude, longitude]);
        const name = await reverseGeocode(latitude, longitude);
        if (name) {
          setAddress(name);
          setResolvedAddress(name);
        }
        setGeocoding(false);
      },
      () => {
        setError("Could not detect your location. Please search manually.");
        setGeocoding(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleMapPositionChange = useCallback(
    async (pos) => {
      setMarkerPos(pos);
      const name = await reverseGeocode(pos[0], pos[1]);
      if (name) {
        setAddress(name);
        setResolvedAddress(name);
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!markerPos) {
      setError("Please select a location on the map.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("access_token");
      const res = await api.put(
        "/location/update",
        {
          latitude: markerPos[0],
          longitude: markerPos[1],
          location_name: resolvedAddress || address || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 200) {
        onSaved?.();
      }
    } catch {
      setError("Failed to save location. Try again.");
    } finally {
      setSaving(false);
    }
  }, [markerPos, resolvedAddress, address, onSaved]);

  return (
    <div className="ls-overlay">
      <div className="ls-modal">
        <div className="ls-modal-header">
          <div>
            <h2 className="ls-title">Set your business location</h2>
            <p className="ls-subtitle">
              Search your address or click on the map to pin your location.
            </p>
          </div>
        </div>

        <div className="ls-body">
          <div className="ls-search-row">
            <input
              className="ls-input"
              type="text"
              placeholder="Search business address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              className="ls-btn ls-btn-search"
              onClick={handleSearch}
              disabled={geocoding || !address.trim()}
            >
              {geocoding ? "..." : "Search"}
            </button>
            <button
              className="ls-btn ls-btn-geo"
              onClick={handleUseMyLocation}
              disabled={geocoding}
              title="Use current location"
            >
              📍
            </button>
          </div>

          <div className="ls-map-wrap">
            <MapContainer
              center={markerPos || DEFAULT_CENTER}
              zoom={markerPos ? 15 : 12}
              className="ls-map"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url={import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
              />
              <RecenterMap center={markerPos} />
              <MapClickHandler onPositionChange={handleMapPositionChange} />
              {markerPos && (
                <Marker position={markerPos} icon={pinIcon} />
              )}
            </MapContainer>
          </div>

          {markerPos && (
            <div className="ls-selected">
              <span className="ls-selected-label">Pinned location</span>
              <span className="ls-selected-coords">
                {markerPos[0].toFixed(5)}, {markerPos[1].toFixed(5)}
              </span>
            </div>
          )}

          {error && <div className="ls-error">{error}</div>}
        </div>

        <div className="ls-footer">
          <button className="ls-btn ls-btn-skip" onClick={onSkip} disabled={saving}>
            Skip for now
          </button>
          <button
            className="ls-btn ls-btn-save"
            onClick={handleSave}
            disabled={saving || !markerPos}
          >
            {saving ? "Saving..." : "Save location"}
          </button>
        </div>
      </div>
    </div>
  );
}
