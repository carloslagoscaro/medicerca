import { chainByKey } from './chains.js';
import { extractPackCount, normalizeText, selectBestOffer, unitPrice } from './matching.js';
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

const MAX_RAW_PER_CHAIN = 12;
const MAX_RAW_TOTAL = 60;

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
  const entries = await Promise.all(
    Object.entries(ADAPTERS).map(async ([key, adapter]) => {
      try {
        const raw = await adapter.search(query);
        const chain = chainByKey(key);
        const offers = raw.slice(0, MAX_RAW_PER_CHAIN).map((item) => {
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
          source: { chain: key, status: offers.length ? 'ok' : 'empty', found: raw.length },
          offers: offers.filter((offer) => Number.isFinite(offer.price) && offer.price > 0 && offer.url)
        };
      } catch (error) {
        return {
          source: { chain: key, status: 'error', found: 0, message: String(error?.message || 'sin respuesta') },
          offers: []
        };
      }
    })
  );

  const allOffers = entries
    .flatMap((entry) => entry.offers)
    .sort((a, b) => (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price) || a.price - b.price);

  return {
    query,
    checkedAt,
    total: allOffers.length,
    offers: allOffers.slice(0, MAX_RAW_TOTAL),
    sources: entries.map((entry) => entry.source)
  };
}
