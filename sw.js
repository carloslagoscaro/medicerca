const VERSION = 'medicerca-v9';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const CORE = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/app.js',
  './src/ui.js',
  './src/store.js',
  './src/api.js',
  './src/nearby.js',
  './src/map.js',
  './shared/meds.js',
  './shared/chains.js',
  './shared/geo.js',
  './shared/matching.js',
  './shared/compare.js',
  './shared/nearby.js',
  './shared/adapters/common.js',
  './shared/adapters/ahumada.js',
  './shared/adapters/drsimi.js',
  './shared/adapters/salcobrand.js',
  './shared/adapters/ecofarmacias.js',
  './shared/adapters/araucomed.js',
  './shared/adapters/knop.js',
  './shared/adapters/cruzverde.js',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './assets/fonts/manrope-latin.woff2',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './data/pharmacies-chile.json',
  './data/live-prices.json'
].map((path) => new URL(path, self.location).href);

const INDEX_URL = new URL('./index.html', self.location).href;
const OFFLINE_URL = new URL('./', self.location).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(CORE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function offlineResponse() {
  return new Response(
    `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MediCerca sin conexión</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f1e6;color:#0b1220;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}main{max-width:420px;background:#fffdf8;border:1px solid rgba(11,18,32,.12);border-radius:24px;padding:28px;text-align:center}h1{font-size:24px;margin:0 0 10px}p{line-height:1.55;color:rgba(11,18,32,.7)}a{display:inline-block;margin-top:14px;background:#b6f04a;color:#0b1220;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:14px}</style></head><body><main><h1>Sin conexión</h1><p>No pudimos cargar MediCerca desde la red. Revisa tu conexión y vuelve a intentar. Tus precios anotados siguen guardados en este teléfono.</p><a href="${OFFLINE_URL}">Reintentar</a></main></body></html>`,
    {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    }
  );
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const response = await fetch(request);
          if (response && response.ok) cache.put(INDEX_URL, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(INDEX_URL, { ignoreSearch: true })) ||
            (await cache.match(INDEX_URL)) ||
            offlineResponse()
          );
        }
      })()
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});
