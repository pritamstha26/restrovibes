export async function reverseGeocode(lat, lng) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "restrovibe-client/1.0",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const address = data.address || {};

    const parts = [
      address.road || address.building || null,
      address.suburb || address.neighbourhood || address.village || null,
      address.city || address.town || address.county || null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(", ");
    }

    return data.display_name || null;
  } catch (error) {
    console.warn("Reverse geocode failed:", error);
    return null;
  }
}
