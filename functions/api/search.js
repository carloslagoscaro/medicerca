import { searchProducts } from '../../shared/compare.js';

const memoryCache = new Map();
const TTL_MS = 5 * 60 * 1000;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const query = String(url.searchParams.get('q') || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  if (query.length < 2) {
    return json({ error: 'Escribe al menos dos letras.' }, 400);
  }

  const key = query.toLowerCase();
  const now = Date.now();
  const cached = memoryCache.get(key);
  if (cached && now - cached.time < TTL_MS) {
    return json(cached.value, 200, { 'cache-control': 'public, max-age=120' });
  }

  try {
    const value = await searchProducts(query);
    memoryCache.set(key, { time: now, value });
    if (memoryCache.size > 80) {
      const oldest = [...memoryCache.entries()].sort((a, b) => a[1].time - b[1].time).slice(0, 20);
      for (const [entry] of oldest) memoryCache.delete(entry);
    }
    return json(value, 200, { 'cache-control': 'public, max-age=120' });
  } catch (error) {
    return json(
      { error: 'No pudimos buscar en las farmacias.', detail: String(error?.message || '') },
      502
    );
  }
}

export async function onRequestPost() {
  return json({ error: 'Usa GET /api/search?q=medicamento.' }, 405);
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
