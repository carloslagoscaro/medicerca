import { chainByKey } from './chains.js';
import { extractPackCount, normalizeText, selectBestOffer, unitPrice } from './matching.js';
import { searchMeds } from './meds.js';
import * as ahumada from './adapters/ahumada.js';
import * as drsimi from './adapters/drsimi.js';
import * as salcobrand from './adapters/salcobrand.js';
import * as ecofarmacias from './adapters/ecofarmacias.js';
import * as araucomed from './adapters/araucomed.js';
import * as knop from './adapters/knop.js';

const ADAPTERS = { ahumada, drsimi, salcobrand, ecofarmacias, araucomed, knop };

const ALLOWED_HOSTS = {
  ahumada: ['www.farmaciasahumada.cl'],
  drsimi: ['www.drsimi.cl'],
  salcobrand: ['salcobrand.cl', 'www.salcobrand.cl'],
  ecofarmacias: ['www.ecofarmacias.cl'],
  araucomed: ['farmacia.araucomed.com'],
  knop: ['www.farmaciasknop.com']
};

function safeProductUrl(chainKey, value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS[chainKey]?.includes(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function compareMed(med) {
  const checkedAt = new Date().toISOString();
  const entries = await Promise.all(
    Object.entries(ADAPTERS).map(async ([key, adapter]) => {
      try {
        const raw = await adapter.search(med.query);
        const best = selectBestOffer(med, raw);
        if (!best) {
          return {
            key,
            source: { chain: key, status: raw.length ? 'empty' : 'empty', found: 0 },
            offer: null
          };
        }
        const chain = chainByKey(key);
        return {
          key,
          source: { chain: key, status: 'ok', found: raw.length },
          offer: {
            chain: key,
            chainName: chain.name,
            chainShort: chain.short,
            type: chain.type,
            productName: best.name,
            price: best.price,
            listPrice: best.listPrice || null,
            packCount: best.packCount,
            packUnit: med.packUnit,
            unitPrice: best.unitPrice,
            url: safeProductUrl(key, best.url),
            checkedAt,
            source: 'live'
          }
        };
      } catch (error) {
        return {
          key,
          source: { chain: key, status: 'error', found: 0, message: String(error?.message || 'sin respuesta') },
          offer: null
        };
      }
    })
  );

  return {
    medId: med.id,
    checkedAt,
    offers: entries.map((entry) => entry.offer).filter(Boolean),
    sources: entries.map((entry) => entry.source)
  };
}

const MAX_RAW_PER_CHAIN = 24;
const MAX_RAW_TOTAL = 120;

const QUERY_FILLERS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'con',
  'para',
  'por',
  'y',
  'o',
  'en',
  'sodio',
  'sodico',
  'sodica',
  'disodico',
  'potasico',
  'potasica',
  'calcico',
  'calcica',
  'hidrocloruro',
  'clorhidrato',
  'diclorhidrato',
  'hidrato',
  'monohidrato',
  'comprimidos',
  'comprimido',
  'tabletas',
  'tableta',
  'capsulas',
  'capsula'
]);

function coreQuery(query) {
  const parts = normalizeText(query).split(' ').filter(Boolean);
  const core = parts.filter((part) => !QUERY_FILLERS.has(part));
  return (core.length ? core : parts).join(' ');
}

const GENERIC_ALIASES = new Set([
  'dolor',
  'fiebre',
  'antiinflamatorio',
  'presion',
  'colesterol',
  'diabetes',
  'estomago',
  'reflujo',
  'alergia',
  'asma',
  'tiroides',
  'corazon',
  'diuretico',
  'antibiotico',
  'vitamina',
  'sueno',
  'animo',
  'ansiedad',
  'depresion',
  'azucar',
  'anemia',
  'deshidratacion',
  'hongos',
  'inflamacion',
  'muscular',
  'pediatrico',
  'adulto',
  'cuidado'
]);

function relevanceTokens(query, core) {
  const tokens = new Set();
  for (const word of `${core} ${query}`.split(/\s+/)) {
    const token = normalizeText(word);
    if (token.length >= 3 && !QUERY_FILLERS.has(token)) tokens.add(token);
  }
  for (const med of searchMeds(query, 4)) {
    for (const brand of med.rules?.brands || []) {
      const token = normalizeText(brand);
      if (token.length >= 4) tokens.add(token);
    }
    for (const alias of med.aliases || []) {
      const token = normalizeText(alias);
      if (token.length >= 5 && !GENERIC_ALIASES.has(token)) tokens.add(token);
    }
  }
  return [...tokens];
}

function isRelevant(name, tokens) {
  const normalized = normalizeText(name);
  if (!normalized) return false;
  const words = tokens.filter((token) => /[a-z]/.test(token));
  const pool = words.length ? words : tokens;
  return pool.some(
    (token) => normalized.includes(token) || (token.length >= 7 && normalized.includes(token.slice(0, 6)))
  );
}

function mergeRaw(primary, secondary) {
  const seen = new Set();
  const merged = [];
  for (const item of [...primary, ...secondary]) {
    const key = `${item.url || ''}|${item.name || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function inferPackUnit(name) {
  const normalized = normalizeText(name);
  if (/\bcapsulas?\b/.test(normalized)) return 'cápsulas';
  if (/\bcomprimidos?\b|\btabletas?\b|\bgrajeas?\b/.test(normalized)) return 'comprimidos';
  if (/\bml\b|\bcc\b/.test(normalized)) return 'ml';
  if (/\bg\b/.test(normalized)) return 'g';
  if (/\bdosis\b|\bpuff\b|\bdisparos?\b/.test(normalized)) return 'dosis';
  return null;
}

export async function searchProducts(query) {
  const checkedAt = new Date().toISOString();
  const core = coreQuery(query);
  const broadened = core && core !== normalizeText(query) ? core : null;
  const tokens = relevanceTokens(query, core);
  const entries = await Promise.all(
    Object.entries(ADAPTERS).map(async ([key, adapter]) => {
      let failed = null;
      let raw = [];
      try {
        const [primary, secondary] = await Promise.all([
          adapter.search(query).catch((error) => {
            failed = error;
            return [];
          }),
          broadened
            ? adapter.search(core).catch((error) => {
                failed = failed || error;
                return [];
              })
            : Promise.resolve([])
        ]);
        raw = mergeRaw(primary, secondary);
      } catch (error) {
        failed = error;
      }
      if (failed && !raw.length) {
        return {
          source: { chain: key, status: 'error', found: 0, message: String(failed?.message || 'sin respuesta') },
          offers: []
        };
      }

      const relevant = raw.filter((item) => isRelevant(item.name || '', tokens));
      const chain = chainByKey(key);
      const offers = relevant.slice(0, MAX_RAW_PER_CHAIN).map((item) => {
        const price = Number(item.price);
        const name = item.name || '';
        const packUnit = inferPackUnit(name);
        const packCount = packUnit ? extractPackCount(name, packUnit) : null;
        return {
          chain: key,
          chainName: chain.name,
          chainShort: chain.short,
          type: chain.type,
          productName: name,
          price,
          listPrice: item.listPrice || null,
          packCount,
          packUnit,
          unitPrice: unitPrice(price, packCount),
          url: safeProductUrl(key, item.url),
          checkedAt,
          source: 'live'
        };
      });
      return {
        source: { chain: key, status: offers.length ? 'ok' : 'empty', found: relevant.length },
        offers: offers.filter((offer) => Number.isFinite(offer.price) && offer.price > 0 && offer.url)
      };
    })
  );

  const allOffers = entries
    .flatMap((entry) => entry.offers)
    .sort((a, b) => (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price) || a.price - b.price);

  return {
    query,
    broadenedTo: broadened,
    checkedAt,
    total: allOffers.length,
    offers: allOffers.slice(0, MAX_RAW_TOTAL),
    sources: entries.map((entry) => entry.source)
  };
}
