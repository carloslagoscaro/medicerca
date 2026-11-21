export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%.,/\s-]+/g, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SOLID_PACK = /(\d+)\s*(?:comp(?:rimidos?)?|caps(?:ulas?)?|tabletas?|tabs?|grageas?|pastillas?)\b/;
const CONDITION_EXCLUDE =
  /\b(?:caja|cja|envase|estuche|etiqueta)\s+(?:arrugad\w*|danad\w*|deteriorad\w*|abollad\w*|rot[ao])\b|\b(?:proxim\w* a vencer|vencimiento cercano|corto vencimiento|sobrestock|sobre stock)\b/;
const UNIT_PATTERNS = {
  comprimidos: SOLID_PACK,
  cápsulas: SOLID_PACK,
  g: /(\d+(?:[.,]\d+)?)\s*g\b/,
  ml: /(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\b/,
  dosis: /(\d+)\s*(?:dosis|disparos?|puff)\b/
};

export function extractPackCount(title, unit) {
  const normalized = normalizeText(title);
  const pattern = UNIT_PATTERNS[unit] || SOLID_PACK;
  const match = normalized.match(pattern);
  if (!match) return null;
  const count = Number(String(match[1]).replace(',', '.'));
  return Number.isFinite(count) && count > 0 ? count : null;
}

export function unitPrice(price, packCount) {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(packCount) || packCount <= 0) return null;
  return Math.round((price / packCount) * 10) / 10;
}

export function matchOffer(med, raw) {
  if (!med || !raw) return null;
  const price = Number(raw.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  const title = raw.name || raw.title || '';
  const normalized = normalizeText(title);
  if (!normalized) return null;
  if (CONDITION_EXCLUDE.test(normalized)) return null;

  const rules = med.rules || {};
  const hasBrand = rules.brands?.some((brand) => normalized.includes(normalizeText(brand)));
  const hasIngredient = !rules.include?.length || rules.include.every((re) => re.test(normalized));
  if (!hasIngredient && !hasBrand) return null;
  if (rules.exclude?.some((re) => re.test(normalized))) return null;

  const doseOk = !rules.dose?.length || rules.dose.some((re) => re.test(normalized));
  if (!doseOk) return null;

  const formOk = !rules.forms?.length || rules.forms.some((re) => re.test(normalized));
  if (!formOk) return null;

  const packCount = extractPackCount(title, med.packUnit);
  if (packCount && med.pack) {
    const solid = med.packUnit === 'comprimidos' || med.packUnit === 'cápsulas' || med.packUnit === 'dosis';
    const ratio = packCount / med.pack;
    if (ratio < (solid ? 0.25 : 0.34) || ratio > (solid ? 8 : 3)) return null;
  }

  let score = 100;
  if (rules.dose?.length) score += 25;
  if (rules.forms?.length) score += 20;
  if (packCount) {
    const proximity = med.pack ? Math.min(1, Math.abs(packCount - med.pack) / med.pack) : 1;
    score += Math.round(25 * (1 - proximity));
  }
  score += Math.min(10, Math.max(0, raw.matchBonus || 0));

  return {
    ...raw,
    name: title,
    price,
    packCount,
    unitPrice: unitPrice(price, packCount),
    matchScore: score
  };
}

export function selectBestOffer(med, offers) {
  const matched = offers.map((offer) => matchOffer(med, offer)).filter(Boolean);
  matched.sort(
    (a, b) =>
      (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price) ||
      b.matchScore - a.matchScore ||
      a.price - b.price
  );
  return matched[0] || null;
}

export function packLabel(offer) {
  if (offer.packCount) {
    const unit = offer.packUnit || 'unidades';
    return `${offer.packCount} ${unit}`;
  }
  return offer.packText || '';
}
