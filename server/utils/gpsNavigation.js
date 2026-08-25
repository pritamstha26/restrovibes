/**
 * GPS Navigation Utilities for RestroVibe
 * Generates navigation URLs, calculates ETA, bearing, and compass direction.
 */

/**
 * Generate a Google Maps navigation URL
 * @param {number} lat - Destination latitude
 * @param {number} lng - Destination longitude
 * @param {object} options - { mode: 'driving'|'walking'|'transit'|'bicycling', originLat, originLng }
 * @returns {string} Google Maps URL
 */
export function generateGoogleMapsURL(lat, lng, options = {}) {
  const { mode = "driving", originLat, originLng } = options;
  const base = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams();

  params.set("destination", `${lat},${lng}`);

  if (originLat !== undefined && originLng !== undefined) {
    params.set("origin", `${originLat},${originLng}`);
  }

  const modeMap = {
    driving: "driving",
    walking: "walking",
    transit: "transit",
    bicycling: "bicycling",
  };
  params.set("travelmode", modeMap[mode] || "driving");

  return `${base}&${params.toString()}`;
}

/**
 * Generate an Apple Maps navigation URL
 * @param {number} lat - Destination latitude
 * @param {number} lng - Destination longitude
 * @param {string} name - Destination name
 * @param {object} options - { originLat, originLng, mode }
 * @returns {string} Apple Maps URL
 */
export function generateAppleMapsURL(lat, lng, name = "", options = {}) {
  const { originLat, originLng, mode = "d" } = options;

  let url = "https://maps.apple.com/?";
  const params = new URLSearchParams();

  if (originLat !== undefined && originLng !== undefined) {
    params.set("saddr", `${originLat},${originLng}`);
  }

  params.set("daddr", `${lat},${lng}`);
  params.set("dirflg", mode === "w" ? "w" : "d");

  if (name) {
    params.set("q", name);
  }

  return url + params.toString();
}

/**
 * Generate an OpenStreetMap URL
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} zoom - Zoom level (default 16)
 * @returns {string} OpenStreetMap URL
 */
export function generateOpenStreetMapURL(lat, lng, zoom = 16) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate ETA based on distance and travel mode
 * @param {number} currentLat - User's latitude
 * @param {number} currentLng - User's longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @param {number} speedKmh - Speed in km/h (default depends on mode)
 * @returns {object} { distanceKm, timeMinutes, formattedTime }
 */
export function calculateETA(currentLat, currentLng, destLat, destLng, speedKmh = 40) {
  const distanceKm = calculateDistance(currentLat, currentLng, destLat, destLng);
  const timeMinutes = (distanceKm / speedKmh) * 60;
  const hours = Math.floor(timeMinutes / 60);
  const mins = Math.round(timeMinutes % 60);

  let formattedTime;
  if (hours > 0) {
    formattedTime = `${hours}h ${mins}m`;
  } else {
    formattedTime = `${mins} min`;
  }

  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    timeMinutes: Math.round(timeMinutes),
    formattedTime,
  };
}

/**
 * Calculate bearing (direction) from point A to point B
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(lat1, lng1, lat2, lng2) {
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Convert bearing in degrees to compass direction
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Compass direction (N, NNE, NE, ENE, E, etc.)
 */
export function getCompassDirection(bearing) {
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Validate if coordinates are within reasonable bounds
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export function isValidCoordinates(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Format coordinates for display
 * @param {number} lat
 * @param {number} lng
 * @returns {string} Formatted coordinates
 */
export function formatCoordinates(lat, lng) {
  if (!isValidCoordinates(lat, lng)) return "Invalid coordinates";

  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}
