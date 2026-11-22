#!/usr/bin/env node
// Completa la dirección de sucursales del bundle con los listados públicos de cada cadena
// y con el catálogo del MINSAL. Empareja por cadena y cercanía para no cruzar sucursales.
// Knop no publica sus locales en OpenStreetMap, así que también se agregan sus sucursales.
// Uso: node scripts/enrich-addresses.mjs [knop]  (sin argumento procesa todas las fuentes)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'data/pharmacies-chile.json');
const EARTH_RADIUS = 6371000;
const TIMEOUT = 30000;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CHAINS = [
  ['cruzverde', /cruz\s*verde/i],
  ['ahumada', /ahumada/i],
  ['salcobrand', /salco\s*brand/i],
  ['drsimi', /simi/i],
  ['knop', /knop/i]
];

function detectChain(value) {
  const text = String(value ?? '');
  return CHAINS.find(([, pattern]) => pattern.test(text))?.[0] || null;
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanAddress(address, stopName) {
  const parts = String(address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^\d{5,7}$/.test(part));
  const stop = parts.findIndex((part) => stopName && normalize(part) === normalize(stopName));
  const kept = stop > 0 ? parts.slice(0, stop) : parts;
  return kept
    .join(', ')
    .replace(/\s*N[°º]\s*/gi, ' N° ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(address) {
  return String(address ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*N[°º]\s*/gi, ' N° ')
    .replace(/\.\s*/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s.\-/(])([a-záéíóúñü])/g, (match, prefix, letter) => prefix + letter.toUpperCase())
    .replace(/\bS\/n\b/gi, 'S/N');
}

function metersBetween(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'user-agent': UA, ...(options.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

async function requestJson(url, options) {
  return (await request(url, { ...options, headers: { accept: 'application/json', ...(options?.headers || {}) } })).json();
}

async function requestText(url, options) {
  return (await request(url, options)).text();
}

async function fetchMinsal() {
  const rows = await requestJson('https://midas.minsal.cl/farmacia_v2/WS/getLocales.php');
  return rows
    .map((row) => ({
      chain: detectChain(row.local_nombre),
      lat: Number(row.local_lat),
      lon: Number(row.local_lng),
      address: titleCase(row.local_direccion),
      comuna: titleCase(row.comuna_nombre)
    }))
    .filter((store) => store.chain && store.address && store.lat && store.lon);
}

async function fetchCruzVerde() {
  const base = 'https://api.cruzverde.cl';
  const site = 'https://www.cruzverde.cl';
  const login = await request(`${base}/customer-service/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: site, referer: `${site}/` },
    body: '{}'
  });
  const cookies = login.headers.getSetCookie?.() || [];
  const cookie = cookies
    .map((entry) => String(entry).match(/connect\.sid=[^;,\s]+/)?.[0])
    .find(Boolean);
  if (!cookie) throw new Error('Sin sesión de invitado');

  const centers = [
    [-20.21, -70.15, 500],
    [-23.65, -70.4, 500],
    [-29.95, -71.34, 500],
    [-33.45, -70.66, 500],
    [-38.74, -72.59, 500],
    [-41.47, -72.94, 450],
    [-45.58, -72.07, 450],
    [-53.16, -70.91, 450]
  ];
  const stores = new Map();
  for (const [lat, lon, radius] of centers) {
    try {
      const rows = await requestJson(
        `${base}/product-service/products/stores-in-range?latitude=${lat}&longitude=${lon}&radius=${radius}`,
        { headers: { cookie } }
      );
      for (const row of rows) stores.set(String(row.id), row);
    } catch (error) {
      console.warn(`Cruz Verde ${lat},${lon}: ${error.message}`);
    }
  }
  return [...stores.values()]
    .map((store) => ({
      chain: 'cruzverde',
      lat: Number(store.coordinates?.latitude),
      lon: Number(store.coordinates?.longitude),
      address: cleanAddress(store.address, store.commune),
      comuna: store.commune || ''
    }))
    .filter((store) => store.address);
}

async function fetchAhumada() {
  const data = await requestJson(
    'https://www.farmaciasahumada.cl/on/demandware.store/Sites-ahumada-cl-Site/default/Stores-FindStores?city=Providencia'
  );
  return (data.stores || [])
    .map((store) => ({
      chain: 'ahumada',
      lat: Number(store.latitude),
      lon: Number(store.longitude),
      address: cleanAddress(store.address1, store.city),
      comuna: store.city || ''
    }))
    .filter((store) => store.address);
}

async function fetchDrSimi() {
  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: 'bba0b1f7e920a1511303bee5715713b980ed68dca9f91c3bf5705f61efa79ea7'
    },
    sender: 'farmaciasdeldrsimicl.tiendas@0.x',
    provider: 'vtex.store-graphql@2.x',
    variables: Buffer.from(JSON.stringify({ acronym: 'TT', pageSize: 1000 })).toString('base64')
  };
  const url =
    'https://www.drsimi.cl/_v/public/graphql/v1?workspace=master&maxAge=short&appsEtag=remove&domain=store&locale=es-CL&operationName=Documents&variables=%7B%7D&extensions=' +
    encodeURIComponent(JSON.stringify(extensions));
  const data = await requestJson(url, { headers: { origin: 'https://www.drsimi.cl', referer: 'https://www.drsimi.cl/tiendas' } });
  return (data.data?.documents || [])
    .map((document) => {
      const fields = Object.fromEntries((document.fields || []).map((field) => [field.key, field.value]));
      return {
        chain: 'drsimi',
        lat: Number(String(fields.latitude || '').replace(',', '.')),
        lon: Number(String(fields.longitude || '').replace(',', '.')),
        address: cleanAddress(fields.direction, fields.municipality),
        comuna: fields.municipality || ''
      };
    })
    .filter((store) => store.address);
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (match, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSalcobrand(raw) {
  const text = String(raw).split('\\"').join('"').split('\\/').join('/');
  const stores = [];
  for (const chunk of text.split('<li class="stores__pill">').slice(1)) {
    const card = chunk.split('</li>')[0];
    const grab = (name) => {
      const match = card.match(
        new RegExp(`stores__content--is-${name}[^>]*>[\\s\\S]*?<p>([\\s\\S]*?)<\\/p>`)
      );
      return match ? decodeHtml(match[1]) : '';
    };
    const address = grab('address');
    const coords = card.match(/maps\/dir\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (!address || !coords) continue;
    stores.push({
      chain: 'salcobrand',
      lat: Number(coords[1]),
      lon: Number(coords[2]),
      address,
      comuna: grab('county')
    });
  }
  return stores;
}

async function fetchSalcobrand() {
  const stores = new Map();
  for (let region = 1; region <= 16; region += 1) {
    let first;
    try {
      first = await requestText(
        `https://salcobrand.cl/get_locals_list_data.js?region_id=${region}`,
        { headers: { accept: 'text/javascript', 'x-requested-with': 'XMLHttpRequest' } }
      );
    } catch (error) {
      console.warn(`Salcobrand región ${region}: ${error.message}`);
      continue;
    }
    const pages = [...first.matchAll(/page=(\d+)/g)].map((match) => Number(match[1]));
    const last = pages.length ? Math.max(...pages) : 1;
    for (const store of parseSalcobrand(first)) stores.set(`${store.lat},${store.lon}`, store);
    for (let page = 2; page <= last; page += 1) {
      try {
        const text = await requestText(
          `https://salcobrand.cl/get_locals_list_data.js?page=${page}&region_id=${region}`,
          { headers: { accept: 'text/javascript', 'x-requested-with': 'XMLHttpRequest' } }
        );
        for (const store of parseSalcobrand(text)) stores.set(`${store.lat},${store.lon}`, store);
      } catch (error) {
        console.warn(`Salcobrand región ${region} página ${page}: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  return [...stores.values()].map((store) => ({
    ...store,
    address: cleanAddress(store.address, store.comuna)
  }));
}

async function fetchKnop() {
  const html = await requestText('https://www.farmaciasknop.com/stores');
  const stores = new Map();
  for (const chunk of html.split('data-latlong="').slice(1)) {
    const head = chunk.match(
      /^([-\d.]+),([-\d.]+)"\s+data-id="(\d+)"\s+data-branch-name="([^"]*)"\s+data-locality="([^"]*)"\s+data-region="([^"]*)"/
    );
    if (!head) continue;
    const addressText = chunk.match(/<p class="flex items-start">[\s\S]*?<\/svg>\s*([\s\S]*?)<\/p>/);
    const address = cleanAddress(decodeHtml(addressText?.[1] || ''), head[5]);
    if (!address) continue;
    stores.set(head[3], {
      chain: 'knop',
      id: `knop/${head[3]}`,
      branch: head[4],
      lat: Number(head[1]),
      lon: Number(head[2]),
      address: titleCase(address),
      comuna: titleCase(head[5]),
      region: head[6]
    });
  }
  return [...stores.values()];
}

async function main() {
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const pharmacies = data.pharmacies || [];
  const byChain = new Map();
  for (const pharmacy of pharmacies) {
    const chain = detectChain(pharmacy.name || pharmacy.brand);
    if (!chain) continue;
    if (!byChain.has(chain)) byChain.set(chain, []);
    byChain.get(chain).push(pharmacy);
  }

  const sources = [
    { name: 'Cruz Verde', fetch: fetchCruzVerde, maxDistance: 300 },
    { name: 'Ahumada', fetch: fetchAhumada, maxDistance: 300 },
    { name: 'Dr. Simi', fetch: fetchDrSimi, maxDistance: 300 },
    { name: 'Salcobrand', fetch: fetchSalcobrand, maxDistance: 300 },
    { name: 'MINSAL', fetch: fetchMinsal, maxDistance: 500 },
    { name: 'Knop', fetch: fetchKnop, maxDistance: 300, extend: true }
  ];
  const only = new Set(
    String(process.argv[2] || '')
      .split(',')
      .map(normalize)
      .filter(Boolean)
  );
  const selected = sources.filter((source) => !only.size || only.has(normalize(source.name)));
  const previous = (data.addressSources?.sources || []).filter(
    (entry) => !selected.some((source) => normalize(source.name) === normalize(entry.name))
  );
  const summary = [...previous];
  const used = new Set();
  for (const source of selected) {
    let stores = [];
    try {
      stores = await source.fetch();
    } catch (error) {
      console.warn(`${source.name}: ${error.message}`);
      summary.push({ name: source.name, matched: 0, error: error.message });
      continue;
    }
    const pairs = [];
    for (const store of stores) {
      if (!store.chain || !store.address) continue;
      for (const node of byChain.get(store.chain) || []) {
        if (node.address || used.has(node.id)) continue;
        const distance = metersBetween(store, node);
        if (distance <= source.maxDistance) pairs.push([distance, store, node]);
      }
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const storeUsed = new Set();
    let matched = 0;
    for (const [, store, node] of pairs) {
      if (storeUsed.has(store) || used.has(node.id) || node.address) continue;
      storeUsed.add(store);
      used.add(node.id);
      node.address = store.address;
      if (!node.comuna && store.comuna) node.comuna = store.comuna;
      matched += 1;
    }
    const entry = { name: source.name, matched };
    summary.push(entry);
    console.log(`${source.name}: ${matched} direcciones`);

    if (source.extend) {
      // Cadenas con pocos locales en OpenStreetMap: se suman las sucursales que falten.
      let added = 0;
      for (const store of stores) {
        const nodes = byChain.get(store.chain) || [];
        if (nodes.some((node) => metersBetween(store, node) <= source.maxDistance)) continue;
        const pharmacy = {
          id: store.id || `knop/${store.lat}/${store.lon}`,
          name: 'Farmacias Knop',
          brand: 'Knop',
          lat: store.lat,
          lon: store.lon,
          address: store.address,
          comuna: store.comuna || '',
          region: store.region || '',
          source: 'knop'
        };
        pharmacies.push(pharmacy);
        nodes.push(pharmacy);
        byChain.set(store.chain, nodes);
        added += 1;
      }
      entry.added = added;
      console.log(`${source.name}: ${added} sucursales nuevas`);
    }
  }

  data.count = pharmacies.length;
  const withAddress = pharmacies.filter((pharmacy) => pharmacy.address).length;
  data.addressSources = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sources: summary.filter((entry) => !entry.error)
  };
  await writeFile(dataPath, JSON.stringify(data));
  console.log(`Sucursales: ${pharmacies.length} · con dirección: ${withAddress}`);
}

await main();
