import { chainByKey } from './chains.js';
import { selectBestOffer } from './matching.js';
import * as ahumada from './adapters/ahumada.js';
import * as drsimi from './adapters/drsimi.js';
import * as ecofarmacias from './adapters/ecofarmacias.js';
import * as araucomed from './adapters/araucomed.js';

const ADAPTERS = { ahumada, drsimi, ecofarmacias, araucomed };

const ALLOWED_HOSTS = {
  ahumada: ['www.farmaciasahumada.cl'],
  drsimi: ['www.drsimi.cl'],
  ecofarmacias: ['www.ecofarmacias.cl'],
  araucomed: ['farmacia.araucomed.com']
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
