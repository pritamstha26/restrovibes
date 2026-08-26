export const DEFAULT_RESTAURANT_COORDS = [27.7172, 85.324];
export const DEFAULT_CLIENT_COORDS = [27.7172, 85.324];

export function haversineDistanceKm([lat1, lng1], [lat2, lng2]) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const deltaLat = toRad(lat2 - lat1);
  const deltaLng = toRad(lng2 - lng1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLng / 2) ** 2;

  const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * angle).toFixed(1));
}

export function calculateDynamicPrice({ basePrice = 80, distanceKm = 0, peakHour = false }) {
  const safeDistance = Math.max(distanceKm, 0);
  const zone = safeDistance <= 3 ? "Local" : safeDistance <= 8 ? "Mid-range" : "Long-range";
  const distanceFee = Number((safeDistance * 1.5).toFixed(0));
  const zoneSurcharge = zone === "Mid-range" ? 6 : zone === "Long-range" ? 12 : 0;
  const peakSurcharge = peakHour ? 8 : 0;
  const total = basePrice + distanceFee + zoneSurcharge + peakSurcharge;

  return {
    total: Math.round(total),
    distanceFee,
    zone,
    peakSurcharge,
    zoneSurcharge,
  };
}
