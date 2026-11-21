import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractPackCount,
  matchOffer,
  normalizeText,
  selectBestOffer,
  unitPrice
} from '../shared/matching.js';
import { MEDS, medById, searchMeds } from '../shared/meds.js';

test('normaliza tildes, mayúsculas y signos', () => {
  assert.equal(normalizeText('Ácido Acetilsalicílico 100 mg.'), 'acido acetilsalicilico 100 mg');
});

test('extrae el tamaño del envase según la unidad', () => {
  assert.equal(extractPackCount('Paracetamol 500 mg x 16 comprimidos', 'comprimidos'), 16);
  assert.equal(extractPackCount('Caja 30 cápsulas blandas', 'cápsulas'), 30);
  assert.equal(extractPackCount('Gel tópico 60 g', 'g'), 60);
  assert.equal(extractPackCount('Solución oral 500 ml', 'ml'), 500);
  assert.equal(extractPackCount('Inhalador 200 dosis', 'dosis'), 200);
  assert.equal(extractPackCount('Envase sin cantidad', 'comprimidos'), null);
});

test('calcula precio por unidad con un decimal', () => {
  assert.equal(unitPrice(350, 16), 21.9);
  assert.equal(unitPrice(990, 100), 9.9);
  assert.equal(unitPrice(0, 10), null);
});

test('exige la dosis exacta del medicamento', () => {
  const paracetamol = medById('paracetamol-500');
  assert.equal(
    matchOffer(paracetamol, { name: 'Paracetamol 1 g x 10 comprimidos', price: 2000 }),
    null
  );
  assert.ok(matchOffer(paracetamol, { name: 'Paracetamol 500 mg x 16 comprimidos', price: 480 }));
});

test('rechaza cajas dañadas o próximas a vencer', () => {
  const paracetamol = medById('paracetamol-500');
  assert.equal(
    matchOffer(paracetamol, { name: 'Paracetamol 500 mg x 16 comprimidos caja arrugada', price: 300 }),
    null
  );
  assert.equal(
    matchOffer(paracetamol, { name: 'Paracetamol 500 mg x 16 comprimidos próximo a vencer', price: 300 }),
    null
  );
});

test('acepta marcas comerciales cuando el título no nombra el principio activo', () => {
  const pantoprazol = medById('pantoprazol-40');
  const match = matchOffer(pantoprazol, {
    name: 'Pantocal 40 mg x 28 comprimidos recubiertos',
    price: 21292
  });
  assert.ok(match);
  assert.equal(match.packCount, 28);
});

test('la marca no salta la dosis ni la forma farmacéutica', () => {
  const pantoprazol = medById('pantoprazol-40');
  assert.equal(
    matchOffer(pantoprazol, { name: 'Pantocal 20 mg x 28 comprimidos', price: 9000 }),
    null
  );
  const diclofenaco = medById('diclofenaco-gel');
  assert.ok(
    matchOffer(diclofenaco, { name: 'Lertus gel 1,16% x 60 g', price: 12517 })
  );
  assert.equal(
    matchOffer(diclofenaco, { name: 'Diclofenaco 50 mg x 20 comprimidos', price: 1990 }),
    null
  );
});

test('tolera formatos de dosis decimales y rechaza la concentración vecina', () => {
  const carvedilol = medById('carvedilol-6');
  assert.ok(
    matchOffer(carvedilol, { name: 'Carvedilol 6,25 mg x 30 comprimidos', price: 1490 })
  );
  assert.equal(
    matchOffer(carvedilol, { name: 'Carvedilol 12,5 mg x 30 comprimidos', price: 1490 }),
    null
  );
  assert.equal(
    matchOffer(carvedilol, { name: 'Carvedilol 25 mg x 30 comprimidos', price: 1490 }),
    null
  );
});

test('admite presentaciones grandes pero acota el tamaño del envase', () => {
  const aspirina = medById('aspirina-100');
  assert.ok(
    matchOffer(aspirina, { name: 'Aspirina 100 mg x 100 comprimidos', price: 2020 })
  );
  assert.equal(
    matchOffer(aspirina, { name: 'Aspirina 100 mg x 300 comprimidos', price: 2020 }),
    null
  );
});

test('elige la mejor oferta por precio unitario, no por envase más parecido', () => {
  const paracetamol = medById('paracetamol-500');
  const best = selectBestOffer(paracetamol, [
    { name: 'Paracetamol 500 mg x 16 comprimidos', price: 350 },
    { name: 'Paracetamol 500 mg x 100 comprimidos', price: 990 }
  ]);
  assert.equal(best.packCount, 100);
  assert.equal(best.unitPrice, 9.9);
});

test('gliclazida y vitamina D usan solo la presentación que existe en Chile', () => {
  const gliclazida = medById('gliclazida-60');
  assert.ok(matchOffer(gliclazida, { name: 'Gliclazida 60 mg x 30 comprimidos LP', price: 16990 }));
  assert.equal(
    matchOffer(gliclazida, { name: 'Gliclazida 30 mg x 30 comprimidos', price: 16990 }),
    null
  );

  const vitamina = medById('vitamina-d-800');
  assert.ok(matchOffer(vitamina, { name: 'Vitamina D 800 UI x 30 comprimidos', price: 4400 }));
  assert.equal(
    matchOffer(vitamina, { name: 'Vitamina D 1000 UI x 30 comprimidos', price: 4400 }),
    null
  );
});

test('el buscador entiende marcas y categorías, y sin texto muestra populares', () => {
  assert.equal(searchMeds('tapsin')[0].id, 'paracetamol-500');
  assert.equal(searchMeds('omeprazol')[0].id, 'omeprazol-20');
  const populares = searchMeds('');
  assert.ok(populares.length > 0);
  assert.ok(populares.every((med) => med.popular));
});

test('el catálogo no tiene identificadores repetidos', () => {
  const ids = MEDS.map((med) => med.id);
  assert.equal(new Set(ids).size, ids.length);
});
