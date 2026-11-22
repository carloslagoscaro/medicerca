// Archivo generado por scripts/build-worker.mjs. No editar a mano.
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/chains.js
var CHAINS = {
  ahumada: {
    key: "ahumada",
    name: "Farmacias Ahumada",
    short: "Ahumada",
    type: "cadena",
    live: true,
    color: "#1665b8",
    site: "https://www.farmaciasahumada.cl",
    searchUrl: (q) => `https://www.farmaciasahumada.cl/search?q=${encodeURIComponent(q)}`
  },
  drsimi: {
    key: "drsimi",
    name: "Dr. Simi",
    short: "Dr. Simi",
    type: "cadena",
    live: true,
    color: "#e64a3d",
    site: "https://www.drsimi.cl",
    searchUrl: (q) => `https://www.drsimi.cl/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft`
  },
  ecofarmacias: {
    key: "ecofarmacias",
    name: "EcoFarmacias",
    short: "EcoFarmacias",
    type: "economica",
    live: true,
    onlineOnly: true,
    color: "#0d7a5f",
    site: "https://www.ecofarmacias.cl",
    searchUrl: (q) => `https://www.ecofarmacias.cl/?s=${encodeURIComponent(q)}&post_type=product`
  },
  araucomed: {
    key: "araucomed",
    name: "Araucomed",
    short: "Araucomed",
    type: "economica",
    live: true,
    onlineOnly: true,
    color: "#3a7d53",
    site: "https://farmacia.araucomed.com",
    searchUrl: (q) => `https://farmacia.araucomed.com/busqueda?s=${encodeURIComponent(q)}`
  },
  cruzverde: {
    key: "cruzverde",
    name: "Cruz Verde",
    short: "Cruz Verde",
    type: "cadena",
    live: true,
    color: "#008a5a",
    site: "https://www.cruzverde.cl",
    searchUrl: (q) => `https://www.cruzverde.cl/search?query=${encodeURIComponent(q)}`
  },
  salcobrand: {
    key: "salcobrand",
    name: "Salcobrand",
    short: "Salcobrand",
    type: "cadena",
    live: true,
    color: "#2356a8",
    site: "https://salcobrand.cl",
    searchUrl: (q) => `https://salcobrand.cl/search_result?query=${encodeURIComponent(q)}`,
    priceListUrl: "https://salcobrand.cl/legal_bases/lista-precios"
  },
  knop: {
    key: "knop",
    name: "Farmacia Knop",
    short: "Knop",
    type: "cadena",
    live: true,
    color: "#7752a8",
    site: "https://www.farmaciasknop.com",
    searchUrl: (q) => `https://www.farmaciasknop.com/search?q=${encodeURIComponent(q)}`
  },
  farmex: {
    key: "farmex",
    name: "Farmex",
    short: "Farmex",
    type: "economica",
    live: false,
    color: "#4b7d42",
    site: ""
  },
  puntofarma: {
    key: "puntofarma",
    name: "Punto Farma",
    short: "Punto Farma",
    type: "barrio",
    live: false,
    color: "#7a6a2f",
    site: ""
  },
  barrio: {
    key: "barrio",
    name: "Farmacia de barrio",
    short: "Barrio",
    type: "barrio",
    live: false,
    color: "#0e7c66",
    site: ""
  }
};
var LIVE_CHAINS = Object.values(CHAINS).filter((chain) => chain.live);
function chainByKey(key) {
  return CHAINS[key] || CHAINS.barrio;
}
function detectChain(name = "", brand = "") {
  const normalized = `${brand} ${name}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("cruz verde")) return "cruzverde";
  if (normalized.includes("salcobrand") || normalized.includes("salco brand")) return "salcobrand";
  if (normalized.includes("ahumada")) return "ahumada";
  if (normalized.includes("simi")) return "drsimi";
  if (normalized.includes("knop")) return "knop";
  if (normalized.includes("araucom")) return "araucomed";
  if (normalized.includes("ecofarmacia") || normalized.includes("eco farmacia")) return "ecofarmacias";
  if (normalized.includes("farmacias economicas") || normalized.includes("farmacia economica")) return "farmex";
  if (normalized.includes("farmex")) return "farmex";
  if (normalized.includes("punto farma")) return "puntofarma";
  return "barrio";
}

// shared/matching.js
function normalizeText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9%.,/\s-]+/g, " ").replace(/(?<!\d)\.|\.(?!\d)/g, " ").replace(/\s+/g, " ").trim();
}
var SOLID_PACK = /(\d+)\s*(?:comp(?:rimidos?)?|caps(?:ulas?)?|tabletas?|tabs?|grageas?|pastillas?)\b/;
var CONDITION_EXCLUDE = /\b(?:caja|cja|envase|estuche|etiqueta)\s+(?:arrugad\w*|danad\w*|deteriorad\w*|abollad\w*|rot[ao])\b|\b(?:proxim\w* a vencer|vencimiento cercano|corto vencimiento|sobrestock|sobre stock)\b/;
var UNIT_PATTERNS = {
  comprimidos: SOLID_PACK,
  c\u00E1psulas: SOLID_PACK,
  g: /(\d+(?:[.,]\d+)?)\s*g\b/,
  ml: /(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\b/,
  dosis: /(\d+)\s*(?:dosis|disparos?|puff)\b/
};
function extractPackCount(title, unit) {
  const normalized = normalizeText(title);
  const pattern = UNIT_PATTERNS[unit] || SOLID_PACK;
  const match = normalized.match(pattern);
  if (!match) return null;
  const count = Number(String(match[1]).replace(",", "."));
  return Number.isFinite(count) && count > 0 ? count : null;
}
function unitPrice(price, packCount) {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(packCount) || packCount <= 0) return null;
  return Math.round(price / packCount * 10) / 10;
}
function matchOffer(med, raw) {
  if (!med || !raw) return null;
  const price = Number(raw.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  const title = raw.name || raw.title || "";
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
    const solid2 = med.packUnit === "comprimidos" || med.packUnit === "c\xE1psulas" || med.packUnit === "dosis";
    const ratio = packCount / med.pack;
    if (ratio < (solid2 ? 0.25 : 0.34) || ratio > (solid2 ? 8 : 3)) return null;
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
function selectBestOffer(med, offers) {
  const matched = offers.map((offer) => matchOffer(med, offer)).filter(Boolean);
  matched.sort(
    (a, b) => (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price) || b.matchScore - a.matchScore || a.price - b.price
  );
  return matched[0] || null;
}

// shared/meds.js
var solid = /comprimid|comp\b|tablet|tab\b|gragea|recubiert/;
var caps = /capsul|cap\b|gragea/;
var MEDS = [
  {
    id: "paracetamol-500",
    name: "Paracetamol",
    strength: "500 mg",
    form: "Comprimidos",
    category: "Dolor y fiebre",
    pack: 16,
    packUnit: "comprimidos",
    popular: true,
    query: "paracetamol 500",
    aliases: ["tapsin", "geniol", "paracetamol", "dolor", "fiebre"],
    rules: {
      include: [/paracetamol/],
      exclude: [/pseudoefedrina|clorfenamina|cafeina|tramadol|codeina|propifenazona|metamizol|diclofenaco|ibuprofeno|jarabe|gotas|supositorio/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "paracetamol-1000",
    name: "Paracetamol",
    strength: "1 g",
    form: "Comprimidos",
    category: "Dolor y fiebre",
    pack: 10,
    packUnit: "comprimidos",
    popular: false,
    query: "paracetamol 1 g",
    aliases: ["paracetamol 1g", "tapsin", "dolor", "fiebre"],
    rules: {
      include: [/paracetamol/],
      exclude: [/pseudoefedrina|clorfenamina|cafeina|tramadol|codeina|propifenazona|metamizol|diclofenaco|ibuprofeno|jarabe|gotas|supositorio|500\s*(?:mg|miligramos?)/],
      dose: [/\b1\s*(?:g|gr|gramo)\b/],
      forms: [solid]
    }
  },
  {
    id: "ibuprofeno-400",
    name: "Ibuprofeno",
    strength: "400 mg",
    form: "Comprimidos",
    category: "Dolor y fiebre",
    pack: 20,
    packUnit: "comprimidos",
    popular: true,
    query: "ibuprofeno 400",
    aliases: ["ibupirac", "ibuprofeno", "antiinflamatorio", "dolor"],
    rules: {
      include: [/ibuprofeno/],
      exclude: [/paracetamol|codeina|pseudoefedrina|jarabe|gotas|suspension|pediatrico/],
      dose: [/\b400\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "ibuprofeno-600",
    name: "Ibuprofeno",
    strength: "600 mg",
    form: "Comprimidos",
    category: "Dolor y fiebre",
    pack: 10,
    packUnit: "comprimidos",
    popular: false,
    query: "ibuprofeno 600",
    aliases: ["ibupirac", "ibuprofeno", "dolor"],
    rules: {
      include: [/ibuprofeno/],
      exclude: [/paracetamol|codeina|pseudoefedrina|jarabe|gotas|suspension|pediatrico/],
      dose: [/\b600\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "aspirina-100",
    name: "\xC1cido acetilsalic\xEDlico",
    strength: "100 mg",
    form: "Comprimidos",
    category: "Cardiovascular",
    pack: 28,
    packUnit: "comprimidos",
    popular: false,
    query: "aspirina 100",
    aliases: ["aspirina", "aas", "cartia", "antiagregante"],
    rules: {
      include: [/aspirina|acetilsalicilico|aas\b/],
      exclude: [/500\s*mg|paracetamol|cafeina|codeina/],
      dose: [/\b100\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "naproxeno-550",
    name: "Naproxeno",
    strength: "550 mg",
    form: "Comprimidos",
    category: "Dolor y fiebre",
    pack: 10,
    packUnit: "comprimidos",
    popular: false,
    query: "naproxeno 550",
    aliases: ["naproxeno", "dolor", "antiinflamatorio"],
    rules: {
      include: [/naproxeno/],
      exclude: [/sodico.*275|paracetamol|esomeprazol|jarabe/],
      dose: [/\b550\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "diclofenaco-gel",
    name: "Diclofenaco gel",
    strength: "1%",
    form: "Gel 60 g",
    category: "Antiinflamatorio",
    pack: 60,
    packUnit: "g",
    popular: true,
    query: "diclofenaco gel 1%",
    aliases: [
      "voltaren",
      "diclofenaco",
      "diclofenaco de sodio",
      "diclofenaco sodico",
      "gel",
      "dolor muscular"
    ],
    rules: {
      include: [/diclofenaco/],
      brands: ["lertus"],
      exclude: [/comprimid|inyectable|supositorio|gotas|parche/],
      dose: [/\b1(?:[.,]16)?\s*%/],
      forms: [/gel/]
    }
  },
  {
    id: "diclofenaco-50",
    name: "Diclofenaco",
    strength: "50 mg",
    form: "Comprimidos",
    category: "Antiinflamatorio",
    pack: 20,
    packUnit: "comprimidos",
    popular: false,
    query: "diclofenaco 50",
    aliases: [
      "diclofenaco de sodio",
      "diclofenaco sodico",
      "diclofenaco",
      "lertus",
      "antiinflamatorio",
      "dolor"
    ],
    rules: {
      include: [/diclofenaco|diclofenac/],
      brands: ["lertus"],
      exclude: [/gel|crema|emulgel|inyect|supositor|parche|gotas|solucion|topico|spray|1(?:[.,]16)?\s*%/],
      dose: [/\b50\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "amoxicilina-500",
    name: "Amoxicilina",
    strength: "500 mg",
    form: "C\xE1psulas",
    category: "Antibi\xF3ticos",
    pack: 21,
    packUnit: "c\xE1psulas",
    popular: false,
    query: "amoxicilina 500",
    aliases: ["amoxicilina", "antibiotico"],
    rules: {
      include: [/amoxicilina/],
      exclude: [/clavulanico|suspension|jarabe|polvo/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [caps, solid]
    }
  },
  {
    id: "amoxicilina-clavulanico",
    name: "Amoxicilina + \xE1c. clavul\xE1nico",
    strength: "875 / 125 mg",
    form: "Comprimidos",
    category: "Antibi\xF3ticos",
    pack: 14,
    packUnit: "comprimidos",
    popular: false,
    query: "amoxicilina clavulanico 875",
    aliases: ["clavulin", "amoxicilina", "clavulanico", "antibiotico"],
    rules: {
      include: [/amoxicilina/, /clavulanico/],
      exclude: [/suspension|jarabe|polvo|500\s*(?:mg|\/)/],
      dose: [/\b875\s*(?:\/|y)?\s*125\b/],
      forms: [solid]
    }
  },
  {
    id: "azitromicina-500",
    name: "Azitromicina",
    strength: "500 mg",
    form: "Comprimidos",
    category: "Antibi\xF3ticos",
    pack: 3,
    packUnit: "comprimidos",
    popular: false,
    query: "azitromicina 500",
    aliases: ["azitromicina", "antibiotico"],
    rules: {
      include: [/azitromicina/],
      exclude: [/suspension|jarabe|polvo|200\s*mg/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "cefalexina-500",
    name: "Cefalexina",
    strength: "500 mg",
    form: "C\xE1psulas",
    category: "Antibi\xF3ticos",
    pack: 20,
    packUnit: "c\xE1psulas",
    popular: false,
    query: "cefalexina 500",
    aliases: ["cefalexina", "antibiotico"],
    rules: {
      include: [/cefalexina/],
      exclude: [/suspension|jarabe|polvo/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [caps, solid]
    }
  },
  {
    id: "metronidazol-500",
    name: "Metronidazol",
    strength: "500 mg",
    form: "Comprimidos",
    category: "Antibi\xF3ticos",
    pack: 20,
    packUnit: "comprimidos",
    popular: false,
    query: "metronidazol 500",
    aliases: ["metronidazol", "antibiotico"],
    rules: {
      include: [/metronidazol/],
      exclude: [/ovulo|crema|gel|suspension/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "fluconazol-150",
    name: "Fluconazol",
    strength: "150 mg",
    form: "C\xE1psulas",
    category: "Antibi\xF3ticos",
    pack: 2,
    packUnit: "c\xE1psulas",
    popular: false,
    query: "fluconazol 150",
    aliases: ["fluconazol", "hongos"],
    rules: {
      include: [/fluconazol/],
      exclude: [/crema|ovulo|locion|200\s*mg/],
      dose: [/\b150\s*(?:mg|miligramos?)\b/],
      forms: [caps, solid]
    }
  },
  {
    id: "omeprazol-20",
    name: "Omeprazol",
    strength: "20 mg",
    form: "C\xE1psulas",
    category: "Digestivo",
    pack: 28,
    packUnit: "c\xE1psulas",
    popular: true,
    query: "omeprazol 20",
    aliases: ["losec", "omeprazol", "estomago", "reflujo"],
    rules: {
      include: [/omeprazol/],
      exclude: [/40\s*mg|suspension|jarabe|polvo|capsula.*10\s*mg/],
      dose: [/\b20\s*(?:mg|miligramos?)\b/],
      forms: [caps, solid]
    }
  },
  {
    id: "pantoprazol-40",
    name: "Pantoprazol",
    strength: "40 mg",
    form: "Comprimidos",
    category: "Digestivo",
    pack: 28,
    packUnit: "comprimidos",
    popular: false,
    query: "pantoprazol 40",
    aliases: ["pantoprazol", "estomago", "reflujo"],
    rules: {
      include: [/pantoprazol/],
      brands: ["pantocal", "pantab"],
      exclude: [/20\s*mg|suspension|inyectable/],
      dose: [/\b40\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "losartan-50",
    name: "Losart\xE1n",
    strength: "50 mg",
    form: "Comprimidos",
    category: "Cardiovascular",
    pack: 30,
    packUnit: "comprimidos",
    popular: true,
    query: "losartan 50",
    aliases: ["cozaar", "losartan", "presion"],
    rules: {
      include: [/losartan/],
      exclude: [/100\s*mg|diuretico|hidroclorotiazida/],
      dose: [/\b50\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "enalapril-10",
    name: "Enalapril",
    strength: "10 mg",
    form: "Comprimidos",
    category: "Cardiovascular",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "enalapril 10",
    aliases: ["enalapril", "presion"],
    rules: {
      include: [/enalapril/],
      exclude: [/5\s*mg|20\s*mg|hidroclorotiazida/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "valsartan-160",
    name: "Valsart\xE1n",
    strength: "160 mg",
    form: "Comprimidos",
    category: "Cardiovascular",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "valsartan 160",
    aliases: ["valsartan", "presion"],
    rules: {
      include: [/valsartan/],
      exclude: [/80\s*mg|320\s*mg|hidroclorotiazida/],
      dose: [/\b160\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "carvedilol-6",
    name: "Carvedilol",
    strength: "6,25 mg",
    form: "Comprimidos",
    category: "Cardiovascular",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "carvedilol 6.25",
    aliases: ["carvedilol", "corazon", "presion"],
    rules: {
      include: [/carvedilol/],
      brands: ["betaplex", "cilokare"],
      exclude: [/(?<![\d.,])12[.,]5\b|(?<![\d.,])25\s*mg\b/],
      dose: [/\b6[.,]25\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "furosemida-40",
    name: "Furosemida",
    strength: "40 mg",
    form: "Comprimidos",
    category: "Cardiovascular",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "furosemida 40",
    aliases: ["furosemida", "diuretico"],
    rules: {
      include: [/furosemida/],
      exclude: [/20\s*mg|inyectable/],
      dose: [/\b40\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "atorvastatina-20",
    name: "Atorvastatina",
    strength: "20 mg",
    form: "Comprimidos",
    category: "Colesterol",
    pack: 30,
    packUnit: "comprimidos",
    popular: true,
    query: "atorvastatina 20",
    aliases: ["lipitor", "atorvastatina", "colesterol"],
    rules: {
      include: [/atorvastatina/],
      exclude: [/10\s*mg|40\s*mg|80\s*mg/],
      dose: [/\b20\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "rosuvastatina-10",
    name: "Rosuvastatina",
    strength: "10 mg",
    form: "Comprimidos",
    category: "Colesterol",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "rosuvastatina 10",
    aliases: ["rosuvastatina", "colesterol"],
    rules: {
      include: [/rosuvastatina/],
      exclude: [/5\s*mg|20\s*mg|40\s*mg/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "metformina-850",
    name: "Metformina",
    strength: "850 mg",
    form: "Comprimidos",
    category: "Diabetes",
    pack: 30,
    packUnit: "comprimidos",
    popular: true,
    query: "metformina 850",
    aliases: ["glifage", "metformina", "diabetes", "azucar"],
    rules: {
      include: [/metformina/],
      exclude: [/500\s*mg|1000\s*mg|1\s*g|sustancia liberacion/],
      dose: [/\b850\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "gliclazida-30",
    name: "Gliclazida",
    strength: "30 mg",
    form: "Comprimidos",
    category: "Diabetes",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "gliclazida 30",
    aliases: ["gliclazida", "diabetes"],
    rules: {
      include: [/gliclazida/],
      exclude: [/60\s*mg|80\s*mg/],
      dose: [/\b30\s*(?:mg|miligramos?)\b/],
      forms: [/comprimid|tablet|liberacion|recubiert/]
    }
  },
  {
    id: "gliclazida-60",
    name: "Gliclazida",
    strength: "60 mg",
    form: "Comprimidos LP",
    category: "Diabetes",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "gliclazida 60",
    aliases: ["gliclazida", "diamicron", "glikem", "diabetes"],
    rules: {
      include: [/gliclazida/],
      brands: ["glikem", "diamicron"],
      exclude: [/\b30\s*mg\b/],
      dose: [/\b60\s*(?:mg|miligramos?)\b/],
      forms: [/comprimid|tablet|liberacion|recubiert/]
    }
  },
  {
    id: "levotiroxina-50",
    name: "Levotiroxina",
    strength: "50 mcg",
    form: "Comprimidos",
    category: "Tiroides",
    pack: 50,
    packUnit: "comprimidos",
    popular: true,
    query: "levotiroxina 50",
    aliases: ["eutirox", "levotiroxina", "tiroides"],
    rules: {
      include: [/levotiroxina/],
      exclude: [/100\s*(?:mcg|ug|µg)|25\s*(?:mcg|ug|µg)|75\s*(?:mcg|ug|µg)/],
      dose: [/\b50\s*(?:mcg|ug|µg|microgramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "sertralina-50",
    name: "Sertralina",
    strength: "50 mg",
    form: "Comprimidos",
    category: "Salud mental",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "sertralina 50",
    aliases: ["sertralina", "animo", "depresion"],
    rules: {
      include: [/sertralina/],
      exclude: [/100\s*mg|25\s*mg/],
      dose: [/\b50\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "escitalopram-10",
    name: "Escitalopram",
    strength: "10 mg",
    form: "Comprimidos",
    category: "Salud mental",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "escitalopram 10",
    aliases: ["escitalopram", "animo", "ansiedad"],
    rules: {
      include: [/escitalopram/],
      exclude: [/5\s*mg|20\s*mg/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "loratadina-10",
    name: "Loratadina",
    strength: "10 mg",
    form: "Comprimidos",
    category: "Alergias",
    pack: 10,
    packUnit: "comprimidos",
    popular: true,
    query: "loratadina 10",
    aliases: ["clarityne", "loratadina", "alergia"],
    rules: {
      include: [/loratadina/],
      exclude: [/jarabe|solucion|5\s*mg|pseudoefedrina/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "cetirizina-10",
    name: "Cetirizina",
    strength: "10 mg",
    form: "Comprimidos",
    category: "Alergias",
    pack: 10,
    packUnit: "comprimidos",
    popular: false,
    query: "cetirizina 10",
    aliases: ["cetirizina", "alergia"],
    rules: {
      include: [/cetirizina/],
      exclude: [/jarabe|solucion|gotas|5\s*mg/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: "salbutamol-aerosol",
    name: "Salbutamol",
    strength: "100 mcg",
    form: "Inhalador",
    category: "Respiratorio",
    pack: 200,
    packUnit: "dosis",
    popular: false,
    query: "salbutamol aerosol 100",
    aliases: ["aerolin", "ventolin", "salbutamol", "asma"],
    rules: {
      include: [/salbutamol/],
      exclude: [/jarabe|solucion.*oral|nebulizar|comprimid|sulfato.*tableta/],
      dose: [/\b100\s*(?:mcg|ug|µg|microgramos?)\b/],
      forms: [/aerosol|inhalador|inhalacion/]
    }
  },
  {
    id: "budesonida-aerosol",
    name: "Budesonida",
    strength: "200 mcg",
    form: "Inhalador",
    category: "Respiratorio",
    pack: 200,
    packUnit: "dosis",
    popular: false,
    query: "budesonida aerosol 200",
    aliases: ["budesonida", "pulmicort", "asma"],
    rules: {
      include: [/budesonida/],
      exclude: [/jarabe|solucion.*oral|nebulizar|comprimid|100\s*(?:mcg|ug|µg)/],
      dose: [/\b200\s*(?:mcg|ug|µg|microgramos?)\b/],
      forms: [/aerosol|inhalador|inhalacion/]
    }
  },
  {
    id: "vitamina-d-1000",
    name: "Vitamina D",
    strength: "1000 UI",
    form: "Comprimidos",
    category: "Vitaminas",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "vitamina d 1000",
    aliases: ["vitamina d", "colecalciferol", "vitamina"],
    rules: {
      include: [/vitamina\s*d|colecalciferol/],
      exclude: [/gotas|solucion|5000|50000|2000/],
      dose: [/\b(?:1000|1[.,]000)\s*(?:ui|iu)\b/],
      forms: [solid, caps]
    }
  },
  {
    id: "vitamina-d-800",
    name: "Vitamina D",
    strength: "800 UI",
    form: "Comprimidos",
    category: "Vitaminas",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "vitamina d 800",
    aliases: ["vitamina d", "vitde", "d3", "vitamina"],
    rules: {
      include: [/vitamina\s*d|colecalciferol/],
      brands: ["vitde"],
      exclude: [/gotas|solucion|1000|5000|50000|2000/],
      dose: [/\b800\s*(?:ui|iu)\b/],
      forms: [solid, caps]
    }
  },
  {
    id: "complejo-b",
    name: "Complejo B",
    strength: "Comprimidos",
    form: "Comprimidos",
    category: "Vitaminas",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "complejo b",
    aliases: ["complejo b", "vitamina b", "neurubion"],
    rules: {
      include: [/complejo\s*b|vitamina\s*b/],
      exclude: [/inyectable|solucion inyectable|jarabe/],
      dose: [],
      forms: [solid, caps]
    }
  },
  {
    id: "hierro-100",
    name: "Hierro",
    strength: "100 mg",
    form: "Comprimidos",
    category: "Vitaminas",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "hierro 100",
    aliases: ["hierro", "ferroso", "anemia"],
    rules: {
      include: [/hierro|ferroso|fumarato ferroso|sulfato ferroso/],
      brands: ["eritrofer", "maltofer", "hemoval"],
      exclude: [/jarabe|gotas|suspension|inyectable/],
      dose: [/\b100\s*(?:mg|miligramos?)\b/],
      forms: [solid, caps]
    }
  },
  {
    id: "suero-oral",
    name: "Suero oral",
    strength: "500 ml",
    form: "Soluci\xF3n",
    category: "Digestivo",
    pack: 500,
    packUnit: "ml",
    popular: false,
    query: "suero oral 500",
    aliases: ["suero oral", "rehidratante", "deshidratacion"],
    rules: {
      include: [/suero/],
      exclude: [/inyectable|fisiologico.*inyect|nasal|oftalmico/],
      dose: [/\b500\s*(?:ml|cc)\b/],
      forms: [/solucion|oral|bebible|polvo|sobre/]
    }
  },
  {
    id: "melatonina-3",
    name: "Melatonina",
    strength: "3 mg",
    form: "Comprimidos",
    category: "Vitaminas",
    pack: 30,
    packUnit: "comprimidos",
    popular: false,
    query: "melatonina 3",
    aliases: ["melatonina", "dormir", "sueno"],
    rules: {
      include: [/melatonina/],
      exclude: [/gotas|5\s*mg|1\s*mg|jarabe/],
      dose: [/\b3\s*(?:mg|miligramos?)\b/],
      forms: [solid, caps, /gummy|goma/]
    }
  }
];
var normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9%.,/\s-]+/g, " ").replace(/\s+/g, " ").trim();
function medById(id) {
  return MEDS.find((med) => med.id === id) || null;
}
var SEARCH_FILLERS = /* @__PURE__ */ new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "con",
  "para",
  "por",
  "y",
  "o",
  "en",
  "sodio",
  "sodico",
  "sodica",
  "disodico",
  "potasico",
  "potasica",
  "calcico",
  "calcica",
  "hidrocloruro",
  "clorhidrato",
  "diclorhidrato",
  "hidrato",
  "monohidrato",
  "comprimidos",
  "comprimido",
  "tabletas",
  "tableta",
  "capsulas",
  "capsula"
]);
function scoreMeds(q, limit) {
  const scored = [];
  for (const med of MEDS) {
    const haystacks = [med.name, med.strength, med.form, med.category, ...med.aliases].map(normalize);
    let score = 0;
    if (normalize(med.name).startsWith(q)) score += 60;
    if (normalize(`${med.name} ${med.strength}`).includes(q)) score += 50;
    for (const h of haystacks) {
      if (h === q) score += 40;
      else if (h.includes(q)) score += 20;
    }
    if (q.split(" ").every((part) => haystacks.some((h) => h.includes(part)))) score += 15;
    const topical = /gel|crema|emulgel|topico|spray|locion/;
    if (!topical.test(q) && topical.test(normalize(med.form))) score -= 6;
    if (score > 0) scored.push({ med, score: score + (med.popular ? 3 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.med.name.localeCompare(b.med.name)).slice(0, limit).map((entry) => entry.med);
}
function searchMeds(query, limit = 8) {
  const q = normalize(query);
  if (!q) {
    return MEDS.filter((med) => med.popular).slice(0, limit);
  }
  const direct = scoreMeds(q, limit);
  if (direct.length) return direct;
  const core = q.split(" ").filter((part) => part && !SEARCH_FILLERS.has(part));
  const simplified = core.join(" ").trim();
  if (simplified && simplified !== q) {
    return scoreMeds(simplified, limit);
  }
  return [];
}

// shared/adapters/ahumada.js
var ahumada_exports = {};
__export(ahumada_exports, {
  search: () => search
});

// shared/adapters/common.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
var ENTITIES = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  aacute: "\xE1",
  eacute: "\xE9",
  iacute: "\xED",
  oacute: "\xF3",
  uacute: "\xFA",
  Aacute: "\xC1",
  Eacute: "\xC9",
  Iacute: "\xCD",
  Oacute: "\xD3",
  Uacute: "\xDA",
  ntilde: "\xF1",
  Ntilde: "\xD1",
  uuml: "\xFC",
  Uuml: "\xDC",
  ordm: "\xBA",
  deg: "\xB0",
  times: "\xD7"
};
function decodeEntities(value) {
  return String(value ?? "").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/&([a-zA-Z]+);/g, (match, name) => ENTITIES[name] ?? match).replace(/\s+/g, " ").trim();
}
function stripTags(value) {
  return decodeEntities(String(value ?? "").replace(/<[^>]*>/g, " "));
}
function parseClp(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  const number = Number(digits);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function absoluteUrl(value, base) {
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 12e3) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: "follow",
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": UA,
        "accept-language": "es-CL,es;q=0.9,en;q=0.5",
        ...options.headers || {}
      }
    });
  } finally {
    clearTimeout(timer);
  }
}
async function fetchText(url, options = {}, timeoutMs = 12e3) {
  const response = await fetchWithTimeout(url, options, timeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
async function fetchJson(url, options = {}, timeoutMs = 12e3) {
  const response = await fetchWithTimeout(
    url,
    { ...options, headers: { accept: "application/json", ...options.headers || {} } },
    timeoutMs
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// shared/adapters/ahumada.js
var BASE = "https://www.farmaciasahumada.cl";
function pricesFromTile(chunk) {
  const start = chunk.search(/<div class="price">/i);
  const block = start >= 0 ? chunk.slice(start, start + 900) : chunk;
  const text = stripTags(block);
  const amounts = [...text.matchAll(/\$\s*([\d.]{3,})/g)].map((match) => parseClp(match[1])).filter(Boolean);
  const listMatch = chunk.match(/class="value"[^>]*content="(\d+)"/i);
  const listPrice = listMatch ? parseClp(listMatch[1]) : null;
  const price = amounts[0] || listPrice;
  return {
    price,
    listPrice: listPrice && price && listPrice > price ? listPrice : null
  };
}
async function search(query) {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const chunks = html.split('class="product product-tile-wrapper');
  const offers = [];
  for (const chunk of chunks.slice(1, 30)) {
    const linkMatch = chunk.match(/<a[^>]+href="([^"]+\.html)"[^>]*>/i);
    const imageMatch = chunk.match(/<img[^>]+(?:alt|title)="([^"]{3,160})"/i);
    if (!linkMatch) continue;
    const { price, listPrice } = pricesFromTile(chunk);
    if (!price) continue;
    const name = decodeEntities(imageMatch?.[1] || "");
    if (!name) continue;
    const productUrl = absoluteUrl(linkMatch[1], BASE);
    if (!productUrl) continue;
    offers.push({
      name,
      price,
      listPrice,
      url: productUrl
    });
  }
  return offers;
}

// shared/adapters/drsimi.js
var drsimi_exports = {};
__export(drsimi_exports, {
  search: () => search2
});
async function search2(query) {
  const url = "https://www.drsimi.cl/api/catalog_system/pub/products/search?ft=" + encodeURIComponent(query) + "&_from=0&_to=23";
  const products = await fetchJson(url);
  if (!Array.isArray(products)) return [];
  const offers = [];
  for (const product of products) {
    const item = product.items?.[0];
    const seller = item?.sellers?.find((entry) => entry.commertialOffer?.Price > 0) || item?.sellers?.[0];
    const price = Number(seller?.commertialOffer?.Price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const listPrice = Number(seller?.commertialOffer?.ListPrice);
    offers.push({
      name: product.productName || item?.name || "",
      price,
      listPrice: Number.isFinite(listPrice) && listPrice > price ? listPrice : null,
      url: product.link ? product.link.endsWith("/p") ? product.link : `${product.link}/p` : null,
      image: item?.images?.[0]?.imageUrl || null,
      available: seller?.commertialOffer?.IsAvailable !== false
    });
  }
  return offers;
}

// shared/adapters/salcobrand.js
var salcobrand_exports = {};
__export(salcobrand_exports, {
  search: () => search3
});
var APP_ID = "GM3RP06HJG";
var SEARCH_KEY = "0259fe250b3be4b1326eb85e47aa7d81";
var INDEX = "sb_variant_production";
var BASE2 = "https://salcobrand.cl";
async function search3(query) {
  const data = await fetchJson(
    `https://${APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${INDEX}/query`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-algolia-api-key": SEARCH_KEY,
        "x-algolia-application-id": APP_ID,
        referer: `${BASE2}/`,
        origin: BASE2
      },
      body: JSON.stringify({ query, hitsPerPage: 24 })
    }
  );
  if (!Array.isArray(data?.hits)) return [];
  const offers = [];
  for (const hit of data.hits) {
    if (hit.has_stock === false) continue;
    const normal = Number(hit.normal_price);
    const discounted = Number(hit.direct_discount);
    const price = Number.isFinite(discounted) && discounted > 0 ? discounted : normal;
    if (!Number.isFinite(price) || price <= 0) continue;
    offers.push({
      name: hit.name || "",
      price,
      listPrice: Number.isFinite(normal) && normal > price ? normal : null,
      url: hit.slug ? absoluteUrl(`/products/${hit.slug}`, BASE2) : null,
      image: hit.catalog_image_url || hit.thumbnail_image_url || null,
      available: true
    });
  }
  return offers;
}

// shared/adapters/ecofarmacias.js
var ecofarmacias_exports = {};
__export(ecofarmacias_exports, {
  search: () => search4
});
async function search4(query) {
  const url = "https://www.ecofarmacias.cl/wp-json/wc/store/v1/products?search=" + encodeURIComponent(query) + "&per_page=24&orderby=price&order=asc";
  const products = await fetchJson(url);
  if (!Array.isArray(products)) return [];
  return products.map((product) => {
    const prices = product.prices || {};
    const minor = Number(prices.currency_minor_unit ?? 0);
    const price = Number(prices.price) / 10 ** minor;
    const regular = Number(prices.regular_price) / 10 ** minor;
    return {
      name: product.name || "",
      price,
      listPrice: Number.isFinite(regular) && regular > price ? regular : null,
      url: product.permalink || null,
      image: product.images?.[0]?.src || null
    };
  }).filter((offer) => Number.isFinite(offer.price) && offer.price > 0);
}

// shared/adapters/araucomed.js
var araucomed_exports = {};
__export(araucomed_exports, {
  search: () => search5
});
var BASE3 = "https://farmacia.araucomed.com";
async function search5(query) {
  const url = `${BASE3}/busqueda?s=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const chunks = html.split('<article class="product-miniature');
  const offers = [];
  for (const chunk of chunks.slice(1, 30)) {
    const linkMatch = chunk.match(/<a[^>]+href="([^"]+)"[^>]*class="thumbnail/i);
    const titleMatch = chunk.match(/class="[^"]*product-title[^"]*"[^>]*>[\s\S]{0,220}?<a[^>]*>([\s\S]*?)<\/a>/i) || chunk.match(/<img[^>]+alt="([^"]{3,160})"/i);
    const priceMatch = chunk.match(/class="price\s*"[^>]*>\s*\$?\s*([\d.]+)/i);
    if (!linkMatch || !priceMatch) continue;
    const price = parseClp(priceMatch[1]);
    if (!price) continue;
    const name = decodeEntities(String(titleMatch?.[1] || "").replace(/<[^>]*>/g, " "));
    if (!name) continue;
    const productUrl = absoluteUrl(linkMatch[1], BASE3);
    if (!productUrl) continue;
    const imageMatch = chunk.match(/data-src="([^"]+\.(?:jpg|jpeg|png|webp))"/i);
    offers.push({
      name,
      price,
      url: productUrl,
      image: imageMatch ? absoluteUrl(imageMatch[1], BASE3) : null
    });
  }
  return offers;
}

// shared/adapters/knop.js
var knop_exports = {};
__export(knop_exports, {
  search: () => search6
});
var BASE4 = "https://www.farmaciasknop.com";
var MAX_RESULTS = 24;
async function search6(query) {
  const url = `${BASE4}/products.json?q=${encodeURIComponent(query)}&per_page=${MAX_RESULTS}`;
  const data = await fetchJson(url);
  if (!Array.isArray(data?.products)) return [];
  const offers = [];
  for (const product of data.products) {
    const price = Number(product.sale_price ?? product.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (product.available === false) continue;
    const regular = Number(product.regular_price ?? product.price);
    offers.push({
      name: product.name || "",
      price,
      listPrice: Number.isFinite(regular) && regular > price ? regular : null,
      url: absoluteUrl(product.url || `/products/${product.slug}`, BASE4),
      image: product.images?.[0]?.src || product.images?.[0]?.url || null,
      available: true
    });
  }
  return offers;
}

// shared/adapters/cruzverde.js
var cruzverde_exports = {};
__export(cruzverde_exports, {
  search: () => search7
});
var BASE5 = "https://api.cruzverde.cl";
var SITE = "https://www.cruzverde.cl";
var SESSION_TTL = 8 * 60 * 1e3;
var session = null;
var sessionPromise = null;
function readSessionCookie(response) {
  const values = response.headers.getSetCookie?.();
  const entries = Array.isArray(values) ? values : [response.headers.get("set-cookie") || ""];
  for (const entry of entries) {
    const match = String(entry).match(/connect\.sid=[^;,\s]+/);
    if (match) return match[0];
  }
  return null;
}
function createSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const response = await fetchWithTimeout(
        `${BASE5}/customer-service/login`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: SITE,
            referer: `${SITE}/`
          },
          body: "{}"
        },
        12e3
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const cookie = readSessionCookie(response);
      if (!cookie) throw new Error("Sin sesi\xF3n");
      return { cookie, expiresAt: Date.now() + SESSION_TTL };
    })().finally(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}
async function currentSession() {
  if (session && session.expiresAt > Date.now()) return session;
  session = await createSession();
  return session;
}
async function requestSearch(url, cookie) {
  const response = await fetchWithTimeout(
    url,
    { headers: { cookie, accept: "application/json" } },
    12e3
  );
  if (response.status === 401) return { unauthorized: true };
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { data: await response.json() };
}
async function search7(query) {
  const url = `${BASE5}/product-service/products/search?limit=20&offset=0&sort=&q=${encodeURIComponent(
    query
  )}`;
  let result = await requestSearch(url, (await currentSession()).cookie);
  if (result.unauthorized) {
    session = null;
    result = await requestSearch(url, (await currentSession()).cookie);
  }
  if (result.unauthorized) throw new Error("HTTP 401");
  return (result.data.hits || []).map((hit) => {
    const name = decodeEntities(hit?.productName || hit?.image?.title || "");
    const sale = Number(hit?.prices?.["price-sale-cl"]);
    const list = Number(hit?.prices?.["price-list-cl"]);
    const price = Number.isFinite(sale) && sale > 0 ? sale : Number.isFinite(list) && list > 0 ? list : null;
    return {
      name,
      price,
      listPrice: price && Number.isFinite(list) && list > price ? list : null,
      url: `${SITE}/search?query=${encodeURIComponent(name)}`
    };
  }).filter((offer) => offer.name && offer.price);
}

// shared/compare.js
var ADAPTERS = { ahumada: ahumada_exports, drsimi: drsimi_exports, salcobrand: salcobrand_exports, ecofarmacias: ecofarmacias_exports, araucomed: araucomed_exports, knop: knop_exports, cruzverde: cruzverde_exports };
var ALLOWED_HOSTS = {
  ahumada: ["www.farmaciasahumada.cl"],
  drsimi: ["www.drsimi.cl"],
  salcobrand: ["salcobrand.cl", "www.salcobrand.cl"],
  ecofarmacias: ["www.ecofarmacias.cl"],
  araucomed: ["farmacia.araucomed.com"],
  knop: ["www.farmaciasknop.com"],
  cruzverde: ["www.cruzverde.cl", "cruzverde.cl"]
};
function safeProductUrl(chainKey, value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS[chainKey]?.includes(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
async function compareMed(med) {
  const checkedAt = (/* @__PURE__ */ new Date()).toISOString();
  const entries = await Promise.all(
    Object.entries(ADAPTERS).map(async ([key, adapter]) => {
      try {
        const raw = await adapter.search(med.query);
        const best = selectBestOffer(med, raw);
        if (!best) {
          return {
            key,
            source: { chain: key, status: raw.length ? "empty" : "empty", found: 0 },
            offer: null
          };
        }
        const chain = chainByKey(key);
        return {
          key,
          source: { chain: key, status: "ok", found: raw.length },
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
            source: "live"
          }
        };
      } catch (error) {
        return {
          key,
          source: { chain: key, status: "error", found: 0, message: String(error?.message || "sin respuesta") },
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
var MAX_RAW_PER_CHAIN = 24;
var MAX_RAW_TOTAL = 120;
var QUERY_FILLERS = /* @__PURE__ */ new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "con",
  "para",
  "por",
  "y",
  "o",
  "en",
  "sodio",
  "sodico",
  "sodica",
  "disodico",
  "potasico",
  "potasica",
  "calcico",
  "calcica",
  "hidrocloruro",
  "clorhidrato",
  "diclorhidrato",
  "hidrato",
  "monohidrato",
  "comprimidos",
  "comprimido",
  "tabletas",
  "tableta",
  "capsulas",
  "capsula"
]);
function coreQuery(query) {
  const parts = normalizeText(query).split(" ").filter(Boolean);
  const core = parts.filter((part) => !QUERY_FILLERS.has(part));
  return (core.length ? core : parts).join(" ");
}
var GENERIC_ALIASES = /* @__PURE__ */ new Set([
  "dolor",
  "fiebre",
  "antiinflamatorio",
  "presion",
  "colesterol",
  "diabetes",
  "estomago",
  "reflujo",
  "alergia",
  "asma",
  "tiroides",
  "corazon",
  "diuretico",
  "antibiotico",
  "vitamina",
  "sueno",
  "animo",
  "ansiedad",
  "depresion",
  "azucar",
  "anemia",
  "deshidratacion",
  "hongos",
  "inflamacion",
  "muscular",
  "pediatrico",
  "adulto",
  "cuidado"
]);
function relevanceTokens(query, core) {
  const tokens = /* @__PURE__ */ new Set();
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
    (token) => normalized.includes(token) || token.length >= 7 && normalized.includes(token.slice(0, 6))
  );
}
function mergeRaw(primary, secondary) {
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const item of [...primary, ...secondary]) {
    const key = `${item.url || ""}|${item.name || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}
function inferPackUnit(name) {
  const normalized = normalizeText(name);
  if (/\bcapsulas?\b/.test(normalized)) return "c\xE1psulas";
  if (/\bcomprimidos?\b|\btabletas?\b|\bgrajeas?\b/.test(normalized)) return "comprimidos";
  if (/\bml\b|\bcc\b/.test(normalized)) return "ml";
  if (/\bg\b/.test(normalized)) return "g";
  if (/\bdosis\b|\bpuff\b|\bdisparos?\b/.test(normalized)) return "dosis";
  return null;
}
async function searchProducts(query) {
  const checkedAt = (/* @__PURE__ */ new Date()).toISOString();
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
          broadened ? adapter.search(core).catch((error) => {
            failed = failed || error;
            return [];
          }) : Promise.resolve([])
        ]);
        raw = mergeRaw(primary, secondary);
      } catch (error) {
        failed = error;
      }
      if (failed && !raw.length) {
        return {
          source: { chain: key, status: "error", found: 0, message: String(failed?.message || "sin respuesta") },
          offers: []
        };
      }
      const relevant = raw.filter((item) => isRelevant(item.name || "", tokens));
      const chain = chainByKey(key);
      const offers = relevant.slice(0, MAX_RAW_PER_CHAIN).map((item) => {
        const price = Number(item.price);
        const name = item.name || "";
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
          source: "live"
        };
      });
      return {
        source: { chain: key, status: offers.length ? "ok" : "empty", found: relevant.length },
        offers: offers.filter((offer) => Number.isFinite(offer.price) && offer.price > 0 && offer.url)
      };
    })
  );
  const allOffers = entries.flatMap((entry) => entry.offers).sort((a, b) => (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price) || a.price - b.price);
  return {
    query,
    broadenedTo: broadened,
    checkedAt,
    total: allOffers.length,
    offers: allOffers.slice(0, MAX_RAW_TOTAL),
    sources: entries.map((entry) => entry.source)
  };
}

// functions/api/compare.js
var memoryCache = /* @__PURE__ */ new Map();
var TTL_MS = 10 * 60 * 1e3;
async function onRequestPost(context) {
  const { request } = context;
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Solicitud inv\xE1lida." }, 400);
  }
  const med = medById(payload?.medId);
  if (!med) return json({ error: "Medicamento no encontrado." }, 404);
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const now = Date.now();
  const cached = memoryCache.get(med.id);
  if (!fresh && cached && now - cached.time < TTL_MS) {
    return json(cached.value, 200, { "cache-control": "public, max-age=300" });
  }
  const cacheKey = new Request(`https://preciocerca-cache.internal/compare/${med.id}`);
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (!fresh && cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const value = await hit.json();
      memoryCache.set(med.id, { time: now, value });
      return json(value, 200, { "cache-control": "public, max-age=300" });
    }
  }
  try {
    const value = await compareMed(med);
    memoryCache.set(med.id, { time: now, value });
    if (cache) {
      const response = new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=600" }
      });
      context.waitUntil?.(cache.put(cacheKey, response));
    }
    return json(value, 200, { "cache-control": "public, max-age=300" });
  } catch (error) {
    return json(
      { error: "No pudimos consultar las farmacias.", detail: String(error?.message || "") },
      502
    );
  }
}
async function onRequestGet() {
  return json({ error: 'Usa POST con {"medId": "..."}.' }, 405);
}
function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

// shared/geo.js
var R = 6371;
function distanceKm(a, b) {
  if (!a?.lat || !a?.lon || !b?.lat || !b?.lon) return null;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// shared/nearby.js
var PRIMARY_MIRROR = {
  url: "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  timeout: 22e3
};
var FALLBACK_MIRRORS = [
  { url: "https://overpass-api.de/api/interpreter", timeout: 1e4 },
  { url: "https://overpass.kumi.systems/api/interpreter", timeout: 12e3 },
  { url: "https://overpass.private.coffee/api/interpreter", timeout: 12e3 },
  { url: "https://overpass.osm.ch/api/interpreter", timeout: 1e4 }
];
function normalizeName(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function normalizeAddress(tags) {
  const street = tags["addr:street"] || "";
  const number = tags["addr:housenumber"] || "";
  return [street, number].filter(Boolean).join(" ").trim();
}
function normalizePharmacy(element, center) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const name = (tags.name || tags.brand || tags.operator || "").trim();
  if (!name) return null;
  const chainKey = detectChain(name, tags.brand || tags.operator || "");
  const chain = chainByKey(chainKey);
  const pharmacy = {
    id: `osm/${element.type}/${element.id}`,
    name,
    brand: tags.brand || "",
    chain: chainKey,
    chainName: chain.short,
    type: chain.type,
    lat,
    lon,
    address: normalizeAddress(tags),
    comuna: tags["addr:city"] || tags["addr:suburb"] || tags["addr:district"] || "",
    phone: /^[+\d\s()-]{6,}$/.test(tags.phone || tags["contact:phone"] || "") ? tags.phone || tags["contact:phone"] : "",
    hours: tags.opening_hours || "",
    source: "osm"
  };
  const distance = center ? distanceKm(center, pharmacy) : null;
  return { ...pharmacy, distance };
}
function normalizeNearby(elements, center) {
  const list = elements.map((element) => normalizePharmacy(element, center)).filter(Boolean).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  const kept = [];
  for (const pharmacy of list) {
    const duplicate = kept.find((other) => {
      if (normalizeName(other.name) !== normalizeName(pharmacy.name)) return false;
      if (other.address && pharmacy.address) {
        return normalizeName(other.address) === normalizeName(pharmacy.address);
      }
      return distanceKm(other, pharmacy) < 0.12;
    });
    if (!duplicate) kept.push(pharmacy);
  }
  return kept.slice(0, 90);
}
async function queryMirror(mirror, body) {
  try {
    const response = await fetchWithTimeout(
      mirror.url,
      {
        method: "POST",
        body,
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }
      },
      mirror.timeout
    );
    if (!response.ok) {
      return { url: mirror.url, error: `HTTP ${response.status}` };
    }
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { url: mirror.url, error: "Respuesta no v\xE1lida" };
    }
    const elements = Array.isArray(data.elements) ? data.elements : [];
    if (!elements.length && data.remark) {
      return { url: mirror.url, error: String(data.remark).slice(0, 120) };
    }
    return { url: mirror.url, elements };
  } catch (error) {
    return { url: mirror.url, error: String(error?.message || "sin respuesta") };
  }
}
async function fetchNearby(lat, lon, radius = 5e3) {
  const query = `[out:json][timeout:25];nwr["amenity"="pharmacy"](around:${radius},${lat},${lon});out center tags 120;`;
  const body = new URLSearchParams({ data: query }).toString();
  const center = { lat, lon };
  let best = await queryMirror(PRIMARY_MIRROR, body);
  if (!best.elements?.length) {
    const fallbacks = await Promise.all(FALLBACK_MIRRORS.map((mirror) => queryMirror(mirror, body)));
    for (const result of fallbacks) {
      if ((result.elements?.length || 0) > (best.elements?.length || 0)) best = result;
    }
    if (!best.elements?.length) {
      const failure = fallbacks.find((result) => !result.elements && result.error);
      return {
        pharmacies: [],
        meta: {
          source: "OpenStreetMap",
          fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
          radius,
          count: 0
        },
        error: [best.error, failure?.error].filter(Boolean).join(" \xB7 ") || "Sin farmacias para esta ubicaci\xF3n."
      };
    }
  }
  const pharmacies = normalizeNearby(best.elements || [], center);
  return {
    pharmacies,
    meta: {
      source: "OpenStreetMap",
      mirror: best.url,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
      radius,
      count: pharmacies.length
    }
  };
}

// functions/api/nearby.js
var memoryCache2 = /* @__PURE__ */ new Map();
var TTL_MS2 = 60 * 60 * 1e3;
async function onRequestGet2(context) {
  const { request } = context;
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const radius = Math.min(8e3, Math.max(300, Number(url.searchParams.get("r")) || 5e3));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return json2({ error: "Ubicaci\xF3n inv\xE1lida." }, 400);
  }
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const now = Date.now();
  const cached = memoryCache2.get(key);
  if (cached && now - cached.time < TTL_MS2) {
    return json2(cached.value, 200, { "cache-control": "public, max-age=3600" });
  }
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(`https://preciocerca-cache.internal/nearby/${key}`);
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const value2 = await hit.json();
      memoryCache2.set(key, { time: now, value: value2 });
      return json2(value2, 200, { "cache-control": "public, max-age=3600" });
    }
  }
  const value = await fetchNearby(lat, lon, radius);
  memoryCache2.set(key, { time: now, value });
  if (cache && !value.error) {
    const response = new Response(JSON.stringify(value), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" }
    });
    context.waitUntil?.(cache.put(cacheKey, response));
  }
  return json2(value, 200, { "cache-control": "public, max-age=1800" });
}
async function onRequestPost2() {
  return json2({ error: "M\xE9todo no permitido." }, 405);
}
function json2(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

// functions/api/search.js
var memoryCache3 = /* @__PURE__ */ new Map();
var TTL_MS3 = 5 * 60 * 1e3;
async function onRequestGet3(context) {
  const url = new URL(context.request.url);
  const query = String(url.searchParams.get("q") || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (query.length < 2) {
    return json3({ error: "Escribe al menos dos letras." }, 400);
  }
  const key = query.toLowerCase();
  const now = Date.now();
  const cached = memoryCache3.get(key);
  if (cached && now - cached.time < TTL_MS3) {
    return json3(cached.value, 200, { "cache-control": "public, max-age=120" });
  }
  try {
    const value = await searchProducts(query);
    memoryCache3.set(key, { time: now, value });
    if (memoryCache3.size > 80) {
      const oldest = [...memoryCache3.entries()].sort((a, b) => a[1].time - b[1].time).slice(0, 20);
      for (const [entry] of oldest) memoryCache3.delete(entry);
    }
    return json3(value, 200, { "cache-control": "public, max-age=120" });
  } catch (error) {
    return json3(
      { error: "No pudimos buscar en las farmacias.", detail: String(error?.message || "") },
      502
    );
  }
}
async function onRequestPost3() {
  return json3({ error: "Usa GET /api/search?q=medicamento." }, 405);
}
function json3(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

// worker/index.js
var SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self)"
};
function json4(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...SECURITY_HEADERS
    }
  });
}
function contextFor(request, env, ctx) {
  return {
    request,
    env,
    params: {},
    waitUntil: (promise) => ctx.waitUntil(promise)
  };
}
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return json4({ ok: true, time: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (url.pathname === "/api/compare") {
      const context = contextFor(request, env, ctx);
      const response2 = request.method === "POST" ? await onRequestPost(context) : await onRequestGet(context);
      return withSecurityHeaders(response2);
    }
    if (url.pathname === "/api/nearby") {
      const context = contextFor(request, env, ctx);
      const response2 = request.method === "GET" ? await onRequestGet2(context) : await onRequestPost2(context);
      return withSecurityHeaders(response2);
    }
    if (url.pathname === "/api/search") {
      const context = contextFor(request, env, ctx);
      const response2 = request.method === "GET" ? await onRequestGet3(context) : await onRequestPost3(context);
      return withSecurityHeaders(response2);
    }
    if (url.pathname.startsWith("/api/")) {
      return json4({ error: "Ruta no encontrada." }, 404);
    }
    const response = await env.ASSETS.fetch(request);
    if (url.pathname.endsWith("/") || url.pathname.endsWith(".html")) {
      return withSecurityHeaders(response);
    }
    return response;
  }
};
function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  const body = [204, 205, 304].includes(response.status) ? null : response.body;
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
export {
  index_default as default
};
