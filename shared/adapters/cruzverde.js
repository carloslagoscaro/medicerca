import { decodeEntities, fetchWithTimeout } from './common.js';

const BASE = 'https://api.cruzverde.cl';
const SITE = 'https://www.cruzverde.cl';
const SESSION_TTL = 8 * 60 * 1000;

// La tienda exige una sesión de invitado incluso para buscar precios públicos.
let session = null;
let sessionPromise = null;

function readSessionCookie(response) {
  const values = response.headers.getSetCookie?.();
  const entries = Array.isArray(values) ? values : [response.headers.get('set-cookie') || ''];
  for (const entry of entries) {
    const match = String(entry).match(/connect\.sid=[^;,\s]+/);
    if (match) return match[0];
  }
  return null;
}

function createSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const response = await fetchWithTimeout(
        `${BASE}/customer-service/login`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: SITE,
            referer: `${SITE}/`
          },
          body: '{}'
        },
        12000
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const cookie = readSessionCookie(response);
      if (!cookie) throw new Error('Sin sesión');
      return { cookie, expiresAt: Date.now() + SESSION_TTL };
    })().finally(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

async function currentSession() {
  if (session && session.expiresAt > Date.now()) return session;
  session = await createSession();
  return session;
}

async function requestSearch(url, cookie) {
  const response = await fetchWithTimeout(
    url,
    { headers: { cookie, accept: 'application/json' } },
    12000
  );
  if (response.status === 401) return { unauthorized: true };
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { data: await response.json() };
}

export async function search(query) {
  const url = `${BASE}/product-service/products/search?limit=20&offset=0&sort=&q=${encodeURIComponent(
    query
  )}`;

  let result = await requestSearch(url, (await currentSession()).cookie);
  if (result.unauthorized) {
    session = null;
    result = await requestSearch(url, (await currentSession()).cookie);
  }
  if (result.unauthorized) throw new Error('HTTP 401');

  return (result.data.hits || [])
    .map((hit) => {
      const name = decodeEntities(hit?.productName || hit?.image?.title || '');
      const sale = Number(hit?.prices?.['price-sale-cl']);
      const list = Number(hit?.prices?.['price-list-cl']);
      const price = Number.isFinite(sale) && sale > 0 ? sale : Number.isFinite(list) && list > 0 ? list : null;
      return {
        name,
        price,
        listPrice: price && Number.isFinite(list) && list > price ? list : null,
        url: `${SITE}/search?query=${encodeURIComponent(name)}`
      };
    })
    .filter((offer) => offer.name && offer.price);
}
