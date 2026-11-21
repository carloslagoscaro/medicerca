const COMPARE_TIMEOUT = 25000;
const NEARBY_TIMEOUT = 38000;

async function request(url, options = {}, timeout = COMPARE_TIMEOUT) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(options.headers || {})
      }
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function readError(response) {
  try {
    const data = await response.json();
    return data?.error || `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}

export async function fetchComparison(medId, { fresh = false } = {}) {
  const url = `/api/compare${fresh ? '?fresh=1' : ''}`;
  const response = await request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ medId })
  });
  if (!response.ok) throw new Error(await readError(response));
  const value = await response.json();
  if (!value || !Array.isArray(value.offers) || !Array.isArray(value.sources)) {
    throw new Error('Respuesta de precios incompleta.');
  }
  return value;
}

export async function fetchNearby(lat, lon, radius = 5000) {
  const url = `/api/nearby?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&r=${encodeURIComponent(radius)}`;
  const response = await request(url, { method: 'GET' }, NEARBY_TIMEOUT);
  if (!response.ok) throw new Error(await readError(response));
  const value = await response.json();
  if (!value || !Array.isArray(value.pharmacies)) {
    throw new Error('Respuesta de farmacias incompleta.');
  }
  return value;
}

export async function searchOnline(query) {
  const url = `/api/search?q=${encodeURIComponent(query)}`;
  const response = await request(url, { method: 'GET' }, COMPARE_TIMEOUT);
  if (!response.ok) throw new Error(await readError(response));
  const value = await response.json();
  if (!value || !Array.isArray(value.offers) || !Array.isArray(value.sources)) {
    throw new Error('Respuesta de búsqueda incompleta.');
  }
  return value;
}

let snapshotPromise = null;

export function loadSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = fetch('data/live-prices.json', { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }
  return snapshotPromise;
}

export async function snapshotValue(medId) {
  const snapshot = await loadSnapshot();
  return snapshot?.values?.[medId] || null;
}
