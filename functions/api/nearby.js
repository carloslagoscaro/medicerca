import { fetchNearby } from '../../shared/nearby.js';

const memoryCache = new Map();
const TTL_MS = 60 * 60 * 1000;

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const radius = Math.min(8000, Math.max(300, Number(url.searchParams.get('r')) || 5000));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return json({ error: 'Ubicación inválida.' }, 400);
  }

  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const now = Date.now();
  const cached = memoryCache.get(key);
  if (cached && now - cached.time < TTL_MS) {
    return json(cached.value, 200, { 'cache-control': 'public, max-age=3600' });
  }

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`https://preciocerca-cache.internal/nearby/${key}`);
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const value = await hit.json();
      memoryCache.set(key, { time: now, value });
      return json(value, 200, { 'cache-control': 'public, max-age=3600' });
    }
  }

  const value = await fetchNearby(lat, lon, radius);
  memoryCache.set(key, { time: now, value });
  if (cache && !value.error) {
    const response = new Response(JSON.stringify(value), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' }
    });
    context.waitUntil?.(cache.put(cacheKey, response));
  }
  return json(value, 200, { 'cache-control': 'public, max-age=1800' });
}

export async function onRequestPost() {
  return json({ error: 'Método no permitido.' }, 405);
}

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  });
}
