const R = 6371;

export function distanceKm(a, b) {
  if (!a?.lat || !a?.lon || !b?.lat || !b?.lon) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 0.95) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function walkingMinutes(km) {
  if (!Number.isFinite(km)) return null;
  return Math.max(1, Math.round((km * 1000) / 78));
}

export function balanceScore(price, km, { priceWeight = 0.65 } = {}) {
  if (!Number.isFinite(price)) return Number.POSITIVE_INFINITY;
  if (!Number.isFinite(km)) return price;
  const distancePenalty = Math.min(km, 3) * 260;
  return price + distancePenalty * (1 - priceWeight) * 3;
}

export function normalizeCoord(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { lat: latitude, lon: longitude };
}
