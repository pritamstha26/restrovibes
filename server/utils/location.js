/**
 * Location utilities for RestroVibe
 * Includes the Haversine formula for calculating distances between coordinates
 */

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Convert latitude and longitude from degrees to radians
  const toRadians = (degree) => degree * (Math.PI / 180);

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
}

/**
 * Find nearby restaurants based on client location
 * @param {number} clientLat - Client latitude
 * @param {number} clientLng - Client longitude
 * @param {Array} restaurateurs - Array of restaurant objects with latitude and longitude
 * @param {number} maxDistance - Maximum distance in kilometers (optional, default: 10)
 * @returns {Array} Array of restaurants with calculated distance
 */
export function findNearbyRestaurateurs(
  clientLat,
  clientLng,
  restaurateurs,
  maxDistance = null,
) {
  // Validate inputs
  if (!Number.isFinite(clientLat) || !Number.isFinite(clientLng) || !Array.isArray(restaurateurs)) {
    return [];
  }

  // Calculate distance for each restaurant
  const restaurateursWithDistance = restaurateurs.map((restaurateur) => {
    const rLat = Number(restaurateur.latitude);
    const rLng = Number(restaurateur.longitude);

    // Skip restaurants without location data
    if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) {
      return { ...restaurateur, distance: Infinity };
    }

    const distance = calculateDistance(
      clientLat,
      clientLng,
      rLat,
      rLng,
    );

    return {
      ...restaurateur,
      distance: parseFloat(distance.toFixed(2)), // Round to 2 decimal places
    };
  });

  // Filter restaurants within the maximum distance (skip if no maxDistance)
  const nearbyRestaurateurs = maxDistance != null
    ? restaurateursWithDistance.filter(
        (r) =>
          r.distance !== Infinity &&
          r.distance <= maxDistance,
      )
    : restaurateursWithDistance.filter((r) => r.distance !== Infinity);

  // Sort by distance (closest first)
  return nearbyRestaurateurs.sort((a, b) => a.distance - b.distance);
}

/**
 * Get user-friendly distance text
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance text
 */
export function getDistanceText(distance) {
  if (distance < 1) {
    // Convert to meters if less than 1 km
    const meters = Math.round(distance * 1000);
    return `${meters} m`;
  } else {
    // Round to 1 decimal place if more than 1 km
    return `${distance.toFixed(1)} km`;
  }
}

/**
 * Generate Kathmandu valley area coordinates
 * Different neighborhoods in Kathmandu for more realistic data
 * @returns {Object} Object containing center coordinates and neighborhood names
 */
export function getKathmanduAreaCoordinates() {
  return {
    center: { lat: 27.7172, lng: 85.324 }, // Kathmandu city center
    radius: 0.1, // roughly 11 km
    neighborhoods: [
      { name: "Thamel", lat: 27.7154, lng: 85.3123 },
      { name: "Durbar Marg", lat: 27.7105, lng: 85.3189 },
      { name: "Baluwatar", lat: 27.7283, lng: 85.3362 },
      { name: "Lazimpat", lat: 27.7214, lng: 85.3228 },
      { name: "Maharajgunj", lat: 27.7364, lng: 85.3364 },
      { name: "Budhanilkantha", lat: 27.7773, lng: 85.3587 },
      { name: "Tokha", lat: 27.7854, lng: 85.3257 },
      { name: "Bansbari", lat: 27.7461, lng: 85.3397 },
      { name: "Gongabu", lat: 27.7361, lng: 85.3025 },
      { name: "Samakhusi", lat: 27.7281, lng: 85.3175 },
      { name: "Balaju", lat: 27.7358, lng: 85.3006 },
      { name: "Swayambhu", lat: 27.7147, lng: 85.2906 },
      { name: "Kalanki", lat: 27.6935, lng: 85.2803 },
      { name: "Thankot", lat: 27.6863, lng: 85.2042 },
      { name: "Naikap", lat: 27.691, lng: 85.2543 },
      { name: "Kirtipur", lat: 27.6747, lng: 85.2762 },
      { name: "Panga", lat: 27.6683, lng: 85.2775 },
      { name: "Chobhar", lat: 27.6566, lng: 85.2899 },
      { name: "Nayabazar", lat: 27.7197, lng: 85.311 },
      { name: "Kalimati", lat: 27.7016, lng: 85.3046 },
      { name: "Kuleshwor", lat: 27.6891, lng: 85.3019 },
      { name: "Sanepa", lat: 27.6803, lng: 85.3153 },
      { name: "Jawalakhel", lat: 27.6759, lng: 85.3177 },
      { name: "Pulchowk", lat: 27.6783, lng: 85.3214 },
      { name: "Jhamsikhel", lat: 27.6846, lng: 85.3156 },
      { name: "Ekantakuna", lat: 27.6697, lng: 85.31 },
      { name: "Lagankhel", lat: 27.6679, lng: 85.3264 },
      { name: "Chakupat", lat: 27.6812, lng: 85.3244 },
      { name: "Mangalbazar", lat: 27.6731, lng: 85.3252 },
      { name: "Patan", lat: 27.6698, lng: 85.3248 },
      { name: "Sunakothi", lat: 27.626, lng: 85.3302 },
      { name: "Lubhu", lat: 27.64, lng: 85.36 },
      { name: "Imadol", lat: 27.6559, lng: 85.3411 },
      { name: "Tikathali", lat: 27.6482, lng: 85.3521 },
      { name: "Thimi", lat: 27.6798, lng: 85.3855 },
      { name: "Katunje", lat: 27.6597, lng: 85.417 },
      { name: "Lokanthali", lat: 27.6741, lng: 85.361 },
      { name: "Kausaltar", lat: 27.6798, lng: 85.3685 },
      { name: "Gatthaghar", lat: 27.69, lng: 85.3798 },
      { name: "Mulpani", lat: 27.7081, lng: 85.3917 },
      { name: "Jorpati", lat: 27.7266, lng: 85.3754 },
      { name: "Sundarijal", lat: 27.7742, lng: 85.4268 },
      { name: "Gokarna", lat: 27.7411, lng: 85.39 },
      { name: "Kapan", lat: 27.7326, lng: 85.37 },
      { name: "Bouddha", lat: 27.7208, lng: 85.3618 },
      { name: "Chabahil", lat: 27.7134, lng: 85.3477 },
      { name: "Gaushala", lat: 27.7054, lng: 85.3457 },
      { name: "Battisputali", lat: 27.7036, lng: 85.3358 },
      { name: "Baneshwor", lat: 27.6977, lng: 85.3392 },
      { name: "Koteshwor", lat: 27.6779, lng: 85.3497 },
    ],
  };
}

/**
 * Generate a random location near a center point
 * @param {Object} center - Center coordinates {lat, lng}
 * @param {number} radius - Radius in degrees
 * @returns {Object} Random location {latitude, longitude}
 */
export function generateRandomLocation(center, radius) {
  // Generate a random angle in radians
  const angle = Math.random() * Math.PI * 2;

  // Generate a random radius (using square root for even distribution)
  const randomRadius = radius * Math.sqrt(Math.random());

  // Calculate the new point
  const latitude = center.lat + randomRadius * Math.cos(angle);
  const longitude = center.lng + randomRadius * Math.sin(angle);

  return { latitude, longitude };
}
