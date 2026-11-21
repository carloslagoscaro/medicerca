import fs from 'node:fs/promises';
import path from 'node:path';

const input = process.argv[2] || '.tmp/health_facilities.geojson';
const output = process.argv[3] || 'data/pharmacies-chile.json';
const localFile = 'data/nearby-huechuraba.json';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function osmId(value) {
  const raw = String(value ?? '').replace(/^osm\//, '');
  return raw ? `osm/${raw}` : '';
}

function ringCentroid(ring) {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    const cross = x1 * y2 - x2 * y1;
    twiceArea += cross;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
  }
  if (!twiceArea) {
    const points = ring.filter((pair) => Array.isArray(pair) && pair.length >= 2);
    if (!points.length) return null;
    return [
      points.reduce((sum, pair) => sum + Number(pair[0]), 0) / points.length,
      points.reduce((sum, pair) => sum + Number(pair[1]), 0) / points.length
    ];
  }
  return [x / (3 * twiceArea), y / (3 * twiceArea)];
}

function pointFromGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates || [];
    return [lat, lon];
  }
  if (geometry.type === 'Polygon') {
    const centroid = ringCentroid(geometry.coordinates?.[0] || []);
    if (!centroid) return null;
    return [centroid[1], centroid[0]];
  }
  if (geometry.type === 'MultiPolygon') {
    const polygon = geometry.coordinates?.[0]?.[0] || [];
    const centroid = ringCentroid(polygon);
    if (!centroid) return null;
    return [centroid[1], centroid[0]];
  }
  return null;
}

function addressFromLocal(pharmacy) {
  return [pharmacy.street, pharmacy.number].filter(Boolean).join(' ').trim();
}

function record(pharmacy) {
  const lat = Number(pharmacy.lat);
  const lon = Number(pharmacy.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id: pharmacy.id,
    name: pharmacy.name || pharmacy.brand || 'Farmacia',
    brand: pharmacy.brand || '',
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
    address: pharmacy.address || '',
    comuna: pharmacy.comuna || '',
    region: pharmacy.region || '',
    source: 'osm'
  };
}

const source = JSON.parse(await fs.readFile(input, 'utf8'));
const local = JSON.parse(await fs.readFile(localFile, 'utf8'));
const localRows = (local.pharmacies || [])
  .map((pharmacy) => {
    const row = record({
      ...pharmacy,
      address: addressFromLocal(pharmacy),
      region: pharmacy.region || 'Región Metropolitana de Santiago'
    });
    return row ? { ...row, id: osmId(pharmacy.id) || row.id } : null;
  })
  .filter(Boolean);

const rows = [];
const byId = new Map();
for (const row of localRows) {
  rows.push(row);
  byId.set(row.id, row);
}

let national = 0;
for (const feature of source.features || []) {
  const props = feature.properties || {};
  if (String(props.amenity || '').toLowerCase() !== 'pharmacy') continue;
  const coords = pointFromGeometry(feature.geometry);
  if (!coords) continue;
  const id = osmId(props.id) || `osm/${coords[0]}/${coords[1]}`;
  const row = record({
    id,
    name: props.name_latin || props.name || props.name_es || props.name_en || 'Farmacia',
    lat: coords[0],
    lon: coords[1],
    address: props.addr_full || '',
    comuna: props.adm3_name || props.addr_city || '',
    region: props.adm1_name || ''
  });
  if (!row) continue;
  if (byId.has(id)) continue;
  const duplicate = rows.find(
    (existing) =>
      normalize(existing.name) === normalize(row.name) &&
      Math.abs(existing.lat - row.lat) < 0.0012 &&
      Math.abs(existing.lon - row.lon) < 0.0012
  );
  if (duplicate) continue;
  rows.push(row);
  byId.set(id, row);
  national += 1;
}

rows.sort(
  (a, b) =>
    a.region.localeCompare(b.region, 'es') ||
    a.comuna.localeCompare(b.comuna, 'es') ||
    a.name.localeCompare(b.name, 'es')
);

const payload = {
  generatedAt: '2026-11-21',
  source: 'OpenStreetMap · HOT Health Facilities Chile (HDX)',
  license: '© OpenStreetMap contributors (ODbL)',
  count: rows.length,
  pharmacies: rows
};
await fs.writeFile(output, JSON.stringify(payload));
const stats = {};
for (const row of rows) stats[row.region || 'Sin región'] = (stats[row.region || 'Sin región'] || 0) + 1;
console.log(`Wrote ${output}: ${rows.length} pharmacies (${localRows.length} local, ${national} national added)`);
console.log(Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 16));
