import { compareMed } from '../../shared/compare.js';
import { medById } from '../../shared/meds.js';

const memoryCache = new Map();
const TTL_MS = 10 * 60 * 1000;

export async function onRequestPost(context) {
  const { request } = context;
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  const med = medById(payload?.medId);
  if (!med) return json({ error: 'Medicamento no encontrado.' }, 404);

  const fresh = new URL(request.url).searchParams.get('fresh') === '1';
  const now = Date.now();
  const cached = memoryCache.get(med.id);
  if (!fresh && cached && now - cached.time < TTL_MS) {
    return json(cached.value, 200, { 'cache-control': 'public, max-age=300' });
  }

  const cacheKey = new Request(`https://preciocerca-cache.internal/compare/${med.id}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (!fresh && cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const value = await hit.json();
      memoryCache.set(med.id, { time: now, value });
      return json(value, 200, { 'cache-control': 'public, max-age=300' });
    }
  }

  try {
    const value = await compareMed(med);
    memoryCache.set(med.id, { time: now, value });
    if (cache) {
      const response = new Response(JSON.stringify(value), {
        headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' }
      });
      context.waitUntil?.(cache.put(cacheKey, response));
    }
    return json(value, 200, { 'cache-control': 'public, max-age=300' });
  } catch (error) {
    return json(
      { error: 'No pudimos consultar las farmacias.', detail: String(error?.message || '') },
      502
    );
  }
}

export async function onRequestGet() {
  return json({ error: 'Usa POST con {"medId": "..."}.' }, 405);
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
