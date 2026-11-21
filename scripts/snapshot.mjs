import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareMed } from '../shared/compare.js';
import { MEDS } from '../shared/meds.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'live-prices.json');
const CONCURRENCY = Math.max(1, Math.min(6, Number(process.env.SNAPSHOT_CONCURRENCY) || 3));
const POPULAR_ONLY = process.argv.includes('--popular');

const meds = POPULAR_ONLY ? MEDS.filter((med) => med.popular) : MEDS;
const values = {};
let cursor = 0;
let done = 0;

async function worker() {
  while (cursor < meds.length) {
    const med = meds[cursor++];
    const started = Date.now();
    try {
      const value = await compareMed(med);
      values[med.id] = value;
      const list = value.offers
        .map((offer) => `${offer.chainShort} $${offer.price.toLocaleString('es-CL')}`)
        .join(' · ');
      console.log(
        `[${++done}/${meds.length}] ${med.name} ${med.strength}: ${list || 'sin ofertas'} (${Date.now() - started} ms)`
      );
    } catch (error) {
      console.warn(`[${++done}/${meds.length}] ${med.id}: ${error?.message || error}`);
    }
  }
}

await mkdir(path.dirname(OUT), { recursive: true });
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const payload = {
  generatedAt: new Date().toISOString(),
  note: 'Respaldo de precios online. Se usa cuando la consulta en vivo no está disponible.',
  values
};

await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const withOffers = Object.values(values).filter((value) => value.offers.length).length;
console.log(`Guardado ${path.relative(ROOT, OUT)} con ${Object.keys(values).length} medicamentos (${withOffers} con ofertas).`);
