import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareMed } from '../shared/compare.js';
import { medById } from '../shared/meds.js';
import { fetchNearby } from '../shared/nearby.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8790);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const compareCache = new Map();
const nearbyCache = new Map();

function sendJson(res, value, status = 200) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*'
  });
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function handleCompare(req, res, url) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, { error: 'Solicitud inválida.' }, 400);
  }
  const med = medById(payload?.medId);
  if (!med) return sendJson(res, { error: 'Medicamento no encontrado.' }, 404);

  const fresh = url.searchParams.get('fresh') === '1';
  const hit = compareCache.get(med.id);
  if (!fresh && hit && Date.now() - hit.time < 10 * 60 * 1000) {
    return sendJson(res, hit.value);
  }

  console.log(`[precios] ${med.name} ${med.strength}`);
  const value = await compareMed(med);
  compareCache.set(med.id, { time: Date.now(), value });
  console.log(
    '[precios]',
    value.offers.map((offer) => `${offer.chainShort} $${offer.price}`).join(' · ') || 'sin ofertas'
  );
  sendJson(res, value);
}

async function handleNearby(res, url) {
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const radius = Math.min(8000, Math.max(300, Number(url.searchParams.get('r')) || 5000));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return sendJson(res, { error: 'Ubicación inválida.' }, 400);
  }
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const hit = nearbyCache.get(key);
  if (hit && Date.now() - hit.time < 60 * 60 * 1000) return sendJson(res, hit.value);

  console.log(`[mapa] farmacias cerca de ${lat},${lon} (${radius} m)`);
  const value = await fetchNearby(lat, lon, radius);
  nearbyCache.set(key, { time: Date.now(), value });
  console.log('[mapa]', value.pharmacies.length, 'farmacias');
  sendJson(res, value);
}

async function serveStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const data = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'POST' && url.pathname === '/api/compare') return await handleCompare(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/nearby') return await handleNearby(res, url);
    if (url.pathname === '/api/health') {
      return sendJson(res, { ok: true, time: new Date().toISOString() });
    }
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res, url);
    res.writeHead(405);
    res.end('Método no permitido');
  } catch (error) {
    console.error(error);
    sendJson(res, { error: 'Error interno.', detail: String(error?.message || '') }, 500);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PrecioCerca Farmacias · http://localhost:${PORT}`);
  console.log('Prueba con ubicación de ejemplo: Huechuraba (-33.3616, -70.6704)');
});
