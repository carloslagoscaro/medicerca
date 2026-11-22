import { distanceKm } from '../shared/geo.js';

export const HOME_LOCATION = Object.freeze({
  lat: -33.3616,
  lon: -70.6704,
  label: 'Huechuraba',
  source: 'home',
  at: '2026-11-21T00:00:00.000Z'
});

const LOCATION_KEY = 'medicerca.location.v1';
const MANUAL_KEY = 'medicerca.manual.v1';
const COMPARE_KEY = 'medicerca.compare.v1';
const NEARBY_KEY = 'medicerca.nearby.v1';
const PREFS_KEY = 'medicerca.prefs.v1';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function validCoord(value, max) {
  return Number.isFinite(value) && Math.abs(value) <= max;
}

function coordOrNull(value, max) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= max ? number : null;
}

export function getLocation() {
  const stored = readJson(LOCATION_KEY, null);
  if (
    stored &&
    validCoord(stored.lat, 90) &&
    validCoord(stored.lon, 180) &&
    typeof stored.label === 'string'
  ) {
    return {
      lat: stored.lat,
      lon: stored.lon,
      label: stored.label,
      source: stored.source === 'gps' ? 'gps' : 'home',
      at: stored.at || null,
      accuracy: Number.isFinite(stored.accuracy) ? stored.accuracy : null
    };
  }
  return { ...HOME_LOCATION };
}

export function setLocation(location) {
  const value = {
    lat: Number(location.lat),
    lon: Number(location.lon),
    label: location.label || 'Mi ubicación',
    source: location.source === 'gps' ? 'gps' : 'home',
    at: new Date().toISOString(),
    accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null
  };
  if (!validCoord(value.lat, 90) || !validCoord(value.lon, 180)) {
    throw new Error('Ubicación inválida.');
  }
  writeJson(LOCATION_KEY, value);
  emit('medicerca:location', value);
  return value;
}

export function useHomeLocation() {
  const value = { ...HOME_LOCATION, at: new Date().toISOString() };
  writeJson(LOCATION_KEY, value);
  emit('medicerca:location', value);
  return value;
}

export function isHomeLocation(location) {
  return distanceKm(location, HOME_LOCATION) < 0.7;
}

export function locationLabel(location) {
  if (!location || location.source === 'home') return HOME_LOCATION.label;
  return location.label || 'Mi ubicación';
}

export function isInstalled() {
  const matches = (query) => {
    try {
      return window.matchMedia?.(query)?.matches === true;
    } catch {
      return false;
    }
  };
  return (
    matches('(display-mode: standalone)') ||
    matches('(display-mode: minimal-ui)') ||
    window.navigator.standalone === true
  );
}

export function geolocationState() {
  return new Promise((resolve) => {
    if (typeof navigator.permissions?.query !== 'function') {
      resolve('unknown');
      return;
    }
    try {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => resolve(status.state))
        .catch(() => resolve('unknown'));
    } catch {
      resolve('unknown');
    }
  });
}

function positionOnce(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function locationError(error) {
  const installed = isInstalled();
  if (error?.code === 1) {
    return new Error(
      installed
        ? 'Falta el permiso de ubicación. En Ajustes del teléfono abre Aplicaciones → MediCerca → Permisos → Ubicación y elige Permitir. Luego pulsa “Usar mi GPS”.'
        : 'No diste permiso de ubicación. Puedes activarlo en los ajustes del navegador o explorar Huechuraba como referencia.'
    );
  }
  if (error?.code === 3) {
    return new Error('La ubicación tardó demasiado. Intenta otra vez o usa Huechuraba como referencia.');
  }
  return new Error(
    installed
      ? 'No pudimos obtener tu ubicación. Revisa que la ubicación del teléfono esté encendida e intenta cerca de una ventana.'
      : 'No pudimos obtener tu ubicación. Intenta al aire libre o usa la referencia.'
  );
}

export async function requestLocation() {
  if (!('geolocation' in navigator)) {
    throw new Error('Este navegador no entrega ubicación. Puedes explorar Huechuraba como referencia.');
  }

  let position;
  try {
    position = await positionOnce({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  } catch (error) {
    if (error?.code === 1) throw locationError(error);
    try {
      position = await positionOnce({ enableHighAccuracy: false, timeout: 12000, maximumAge: 0 });
    } catch (fallback) {
      throw locationError(fallback?.code === 1 ? fallback : error);
    }
  }

  return setLocation({
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    accuracy: position.coords.accuracy,
    label: 'Mi ubicación',
    source: 'gps'
  });
}

export function manualPrices() {
  const value = readJson(MANUAL_KEY, []);
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry) =>
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.medId === 'string' &&
        typeof entry.pharmacy === 'string' &&
        Number.isFinite(Number(entry.price)) &&
        Number(entry.price) > 0
    )
    .map((entry) => ({
      ...entry,
      price: Number(entry.price),
      units: Number.isFinite(Number(entry.units)) && Number(entry.units) > 0 ? Number(entry.units) : null,
      lat: coordOrNull(entry.lat, 90),
      lon: coordOrNull(entry.lon, 180)
    }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function manualForMed(medId) {
  return manualPrices().filter((entry) => entry.medId === medId);
}

export function manualCount() {
  return manualPrices().length;
}

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function addManualPrice(entry) {
  const item = {
    id: newId(),
    medId: String(entry.medId || ''),
    medName: String(entry.medName || ''),
    medStrength: String(entry.medStrength || ''),
    pharmacy: String(entry.pharmacy || '').trim(),
    chain: String(entry.chain || 'barrio'),
    price: Number(entry.price),
    units: Number.isFinite(Number(entry.units)) && Number(entry.units) > 0 ? Number(entry.units) : null,
    address: String(entry.address || '').trim(),
    lat: coordOrNull(entry.lat, 90),
    lon: coordOrNull(entry.lon, 180),
    createdAt: new Date().toISOString()
  };
  const list = manualPrices();
  list.unshift(item);
  writeJson(MANUAL_KEY, list);
  emit('medicerca:manual', list);
  return item;
}

export function removeManualPrice(id) {
  const list = manualPrices();
  const index = list.findIndex((entry) => entry.id === id);
  if (index < 0) return null;
  const [removed] = list.splice(index, 1);
  writeJson(MANUAL_KEY, list);
  emit('medicerca:manual', list);
  return removed;
}

export function restoreManualPrice(entry) {
  if (!entry) return null;
  const list = manualPrices();
  if (list.some((item) => item.id === entry.id)) return entry;
  list.push(entry);
  writeJson(MANUAL_KEY, list);
  emit('medicerca:manual', list);
  return entry;
}

export function manualPharmacies() {
  const groups = new Map();
  for (const entry of manualPrices()) {
    const key = `${entry.pharmacy.toLowerCase()}|${(entry.address || '').toLowerCase()}`;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      if (!current.entries.some((e) => e.medId === entry.medId)) current.entries.push(entry);
    } else {
      groups.set(key, {
        id: `manual-${key}`,
        name: entry.pharmacy,
        address: entry.address,
        chain: entry.chain,
        lat: entry.lat,
        lon: entry.lon,
        count: 1,
        entries: [entry]
      });
    }
  }
  return [...groups.values()];
}

export function manualPharmacyStats() {
  const list = manualPrices();
  const pharmacies = new Set(list.map((entry) => entry.pharmacy.toLowerCase().trim()));
  return { prices: list.length, pharmacies: pharmacies.size };
}

export function getCachedComparison(medId) {
  const map = readJson(COMPARE_KEY, {});
  const entry = map?.[medId];
  if (!entry || !entry.value || !Number.isFinite(entry.time)) return null;
  return entry;
}

export function saveComparisonCache(medId, value) {
  const map = readJson(COMPARE_KEY, {});
  const entries = map && typeof map === 'object' ? map : {};
  entries[medId] = { time: Date.now(), value };
  const sorted = Object.entries(entries)
    .sort((a, b) => (b[1]?.time || 0) - (a[1]?.time || 0))
    .slice(0, 40);
  writeJson(COMPARE_KEY, Object.fromEntries(sorted));
}

export function isCacheFresh(time, maxAgeMs = 30 * 60 * 1000) {
  return Number.isFinite(time) && Date.now() - time < maxAgeMs;
}

export function nearbyCacheKey(location, radius) {
  return `${Number(location.lat).toFixed(3)},${Number(location.lon).toFixed(3)},${radius}`;
}

export function getNearbyCache(key) {
  const map = readJson(NEARBY_KEY, {});
  const entry = map?.[key];
  if (!entry || !Array.isArray(entry.pharmacies) || !Number.isFinite(entry.time)) return null;
  if (Date.now() - entry.time > 12 * 60 * 60 * 1000) return null;
  return entry;
}

export function saveNearbyCache(key, value, pharmacies) {
  const map = readJson(NEARBY_KEY, {});
  const entries = map && typeof map === 'object' ? map : {};
  entries[key] = { time: Date.now(), value, pharmacies };
  const sorted = Object.entries(entries)
    .sort((a, b) => (b[1]?.time || 0) - (a[1]?.time || 0))
    .slice(0, 6);
  writeJson(NEARBY_KEY, Object.fromEntries(sorted));
}

export function getPref(key, fallback) {
  const prefs = readJson(PREFS_KEY, {});
  return Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : fallback;
}

export function setPref(key, value) {
  const prefs = readJson(PREFS_KEY, {});
  prefs[key] = value;
  writeJson(PREFS_KEY, prefs);
}
