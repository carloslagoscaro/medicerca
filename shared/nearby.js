import { detectChain, chainByKey } from './chains.js';
import { distanceKm } from './geo.js';
import { fetchWithTimeout } from './adapters/common.js';

const PRIMARY_MIRROR = {
  url: 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  timeout: 22000
};
const FALLBACK_MIRRORS = [
  { url: 'https://overpass-api.de/api/interpreter', timeout: 10000 },
  { url: 'https://overpass.kumi.systems/api/interpreter', timeout: 12000 },
  { url: 'https://overpass.private.coffee/api/interpreter', timeout: 12000 },
  { url: 'https://overpass.osm.ch/api/interpreter', timeout: 10000 }
];

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeAddress(tags) {
  const street = tags['addr:street'] || '';
  const number = tags['addr:housenumber'] || '';
  return [street, number].filter(Boolean).join(' ').trim();
}

export function normalizePharmacy(element, center) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name = (tags.name || tags.brand || tags.operator || '').trim();
  if (!name) return null;

  const chainKey = detectChain(name, tags.brand || tags.operator || '');
  const chain = chainByKey(chainKey);
  const pharmacy = {
    id: `osm/${element.type}/${element.id}`,
    name,
    brand: tags.brand || '',
    chain: chainKey,
    chainName: chain.short,
    type: chain.type,
    lat,
    lon,
    address: normalizeAddress(tags),
    comuna: tags['addr:city'] || tags['addr:suburb'] || tags['addr:district'] || '',
    phone: /^[+\d\s()-]{6,}$/.test(tags.phone || tags['contact:phone'] || '')
      ? tags.phone || tags['contact:phone']
      : '',
    hours: tags.opening_hours || '',
    source: 'osm'
  };

  const distance = center ? distanceKm(center, pharmacy) : null;
  return { ...pharmacy, distance };
}

export function normalizeNearby(elements, center) {
  const list = elements
    .map((element) => normalizePharmacy(element, center))
    .filter(Boolean)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  const kept = [];
  for (const pharmacy of list) {
    const duplicate = kept.find((other) => {
      if (normalizeName(other.name) !== normalizeName(pharmacy.name)) return false;
      if (other.address && pharmacy.address) {
        return normalizeName(other.address) === normalizeName(pharmacy.address);
      }
      return distanceKm(other, pharmacy) < 0.12;
    });
    if (!duplicate) kept.push(pharmacy);
  }
  return kept.slice(0, 90);
}

async function queryMirror(mirror, body) {
  try {
    const response = await fetchWithTimeout(
      mirror.url,
      {
        method: 'POST',
        body,
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }
      },
      mirror.timeout
    );
    if (!response.ok) {
      return { url: mirror.url, error: `HTTP ${response.status}` };
    }
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { url: mirror.url, error: 'Respuesta no válida' };
    }
    const elements = Array.isArray(data.elements) ? data.elements : [];
    if (!elements.length && data.remark) {
      return { url: mirror.url, error: String(data.remark).slice(0, 120) };
    }
    return { url: mirror.url, elements };
  } catch (error) {
    return { url: mirror.url, error: String(error?.message || 'sin respuesta') };
  }
}

export async function fetchNearby(lat, lon, radius = 5000) {
  const query = `[out:json][timeout:25];nwr["amenity"="pharmacy"](around:${radius},${lat},${lon});out center tags 120;`;
  const body = new URLSearchParams({ data: query }).toString();
  const center = { lat, lon };

  let best = await queryMirror(PRIMARY_MIRROR, body);
  if (!best.elements?.length) {
    const fallbacks = await Promise.all(FALLBACK_MIRRORS.map((mirror) => queryMirror(mirror, body)));
    for (const result of fallbacks) {
      if ((result.elements?.length || 0) > (best.elements?.length || 0)) best = result;
    }
    if (!best.elements?.length) {
      const failure = fallbacks.find((result) => !result.elements && result.error);
      return {
        pharmacies: [],
        meta: {
          source: 'OpenStreetMap',
          fetchedAt: new Date().toISOString(),
          radius,
          count: 0
        },
        error: [best.error, failure?.error].filter(Boolean).join(' · ') || 'Sin farmacias para esta ubicación.'
      };
    }
  }

  const pharmacies = normalizeNearby(best.elements || [], center);
  return {
    pharmacies,
    meta: {
      source: 'OpenStreetMap',
      mirror: best.url,
      fetchedAt: new Date().toISOString(),
      radius,
      count: pharmacies.length
    }
  };
}
