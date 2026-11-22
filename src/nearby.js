import { chainByKey, detectChain } from '../shared/chains.js';
import { distanceKm } from '../shared/geo.js';
import { fetchNearby } from './api.js';
import {
  getNearbyCache,
  HOME_LOCATION,
  isHomeLocation,
  nearbyCacheKey,
  saveNearbyCache
} from './store.js';

let bundledPromise = null;
let bundled = null;

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizePharmacy(pharmacy, location) {
  const chain = chainByKey(pharmacy.chain || detectChain(pharmacy.name, pharmacy.brand));
  const address =
    pharmacy.address || [pharmacy.street, pharmacy.number].filter(Boolean).join(' ').trim();
  return {
    id: pharmacy.id || `osm/${pharmacy.lat}/${pharmacy.lon}`,
    name: pharmacy.name || pharmacy.brand || 'Farmacia',
    brand: pharmacy.brand || '',
    chain: chain.key,
    chainName: chain.short,
    type: chain.type,
    lat: Number(pharmacy.lat),
    lon: Number(pharmacy.lon),
    address,
    comuna: pharmacy.comuna || '',
    region: pharmacy.region || '',
    phone: pharmacy.phone || '',
    hours: pharmacy.hours || '',
    source: pharmacy.source || 'osm',
    distance: distanceKm(location, pharmacy)
  };
}

function prepareList(list, location) {
  return list
    .map((pharmacy) => normalizePharmacy(pharmacy, location))
    .filter((pharmacy) => Number.isFinite(pharmacy.lat) && Number.isFinite(pharmacy.lon))
    .filter((pharmacy) => Number.isFinite(pharmacy.distance))
    .sort((a, b) => a.distance - b.distance);
}

export function preloadBundled() {
  if (!bundledPromise) {
    bundledPromise = fetch('data/pharmacies-chile.json', { cache: 'force-cache' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        bundled = data;
        return data;
      })
      .catch(() => null);
  }
  return bundledPromise;
}

function bundledRaw() {
  return bundled?.pharmacies || [];
}

export function bundledNearby(location, radius = 5000) {
  if (!bundled) return [];
  return prepareList(bundledRaw(), location).filter((pharmacy) => pharmacy.distance <= radius / 1000);
}

export function bundledMeta() {
  return {
    center: bundled?.center || HOME_LOCATION,
    generatedAt: bundled?.generatedAt || null,
    count: bundledRaw().length,
    license: bundled?.license || '© OpenStreetMap contributors (ODbL)'
  };
}

let comunaIndex = null;

export function comunaOptions() {
  if (!bundled) return [];
  if (!comunaIndex) {
    const groups = new Map();
    for (const pharmacy of bundledRaw()) {
      const name = String(pharmacy.comuna || '').trim();
      const lat = Number(pharmacy.lat);
      const lon = Number(pharmacy.lon);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const key = normalizeName(name);
      const entry = groups.get(key) || { name, lat: 0, lon: 0, count: 0 };
      entry.lat += lat;
      entry.lon += lon;
      entry.count += 1;
      groups.set(key, entry);
    }
    comunaIndex = [...groups.values()]
      .map((entry) => ({
        name: entry.name,
        lat: entry.lat / entry.count,
        lon: entry.lon / entry.count,
        count: entry.count
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }
  return comunaIndex;
}

export function findComuna(value) {
  const query = normalizeName(value);
  if (!query) return null;
  const list = comunaOptions();
  return (
    list.find((comuna) => normalizeName(comuna.name) === query) ||
    list.find((comuna) => normalizeName(comuna.name).startsWith(query)) ||
    list.find((comuna) => normalizeName(comuna.name).includes(query)) ||
    null
  );
}

function isDuplicate(a, b) {
  if (normalizeName(a.name) !== normalizeName(b.name)) return false;
  if (a.address && b.address && normalizeName(a.address) === normalizeName(b.address)) return true;
  return distanceKm(a, b) < 0.12;
}

function mergeWithBundled(primary, location, radius) {
  const merged = [...primary];
  const extras = preparedBundled(location, radius);
  for (const pharmacy of extras) {
    if (!merged.some((existing) => isDuplicate(existing, pharmacy))) {
      merged.push(pharmacy);
    }
  }
  return merged.sort((a, b) => a.distance - b.distance);
}

function preparedBundled(location, radius) {
  return prepareList(bundledRaw(), location).filter((pharmacy) => pharmacy.distance <= radius / 1000);
}

const inflight = new Map();

export async function getNearby(location, radius = 5000, { force = false } = {}) {
  const key = nearbyCacheKey(location, radius);
  if (!force) {
    const cached = getNearbyCache(key);
    if (cached) {
      return {
        pharmacies: prepareList(cached.pharmacies, location).filter(
          (pharmacy) => pharmacy.distance <= radius / 1000
        ),
        meta: { ...(cached.value?.meta || {}), cached: true, count: cached.pharmacies.length },
        source: 'cache'
      };
    }
  }

  const inFlightKey = `${key}:${force ? 'force' : 'normal'}`;
  if (inflight.has(inFlightKey)) return inflight.get(inFlightKey);

  const promise = (async () => {
    await preloadBundled();
    if (!force) {
      const bundledNow = preparedBundled(location, radius);
      if (bundledNow.length) {
        return {
          pharmacies: bundledNow,
          meta: {
            source: 'Datos guardados',
            cached: true,
            count: bundledNow.length,
            fetchedAt: bundled?.generatedAt || null
          },
          source: 'bundled'
        };
      }
    }
    try {
      const value = await fetchNearby(location.lat, location.lon, radius);
      const live = prepareList(value.pharmacies, location);
      const merged = mergeWithBundled(live, location, radius);
      saveNearbyCache(key, value, merged);
      return {
        pharmacies: merged,
        meta: { ...(value.meta || {}), cached: false, count: merged.length },
        source: 'live'
      };
    } catch (error) {
      const fallback = preparedBundled(location, radius);
      if (fallback.length) {
        return {
          pharmacies: fallback,
          meta: { source: 'Datos guardados', cached: true, count: fallback.length },
          source: 'bundled',
          error
        };
      }
      throw error;
    }
  })();

  inflight.set(inFlightKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(inFlightKey);
  }
}

export function nearestForChain(pharmacies, chainKey) {
  return (
    pharmacies
      .filter((pharmacy) => pharmacy.chain === chainKey)
      .sort((a, b) => a.distance - b.distance)[0] || null
  );
}

export function nearbyCoverageLabel(pharmacies, location) {
  if (!pharmacies.length) return 'Sin farmacias para mostrar';
  if (isHomeLocation(location)) return `${pharmacies.length} farmacias cerca de tu referencia`;
  return `${pharmacies.length} farmacias a tu alrededor`;
}
