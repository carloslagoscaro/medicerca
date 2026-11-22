export const CHAINS = {
  ahumada: {
    key: 'ahumada',
    name: 'Farmacias Ahumada',
    short: 'Ahumada',
    type: 'cadena',
    live: true,
    color: '#1665b8',
    site: 'https://www.farmaciasahumada.cl',
    searchUrl: (q) => `https://www.farmaciasahumada.cl/search?q=${encodeURIComponent(q)}`
  },
  drsimi: {
    key: 'drsimi',
    name: 'Dr. Simi',
    short: 'Dr. Simi',
    type: 'cadena',
    live: true,
    color: '#e64a3d',
    site: 'https://www.drsimi.cl',
    searchUrl: (q) => `https://www.drsimi.cl/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft`
  },
  ecofarmacias: {
    key: 'ecofarmacias',
    name: 'EcoFarmacias',
    short: 'EcoFarmacias',
    type: 'economica',
    live: true,
    onlineOnly: true,
    color: '#0d7a5f',
    site: 'https://www.ecofarmacias.cl',
    searchUrl: (q) => `https://www.ecofarmacias.cl/?s=${encodeURIComponent(q)}&post_type=product`
  },
  araucomed: {
    key: 'araucomed',
    name: 'Araucomed',
    short: 'Araucomed',
    type: 'economica',
    live: true,
    onlineOnly: true,
    color: '#3a7d53',
    site: 'https://farmacia.araucomed.com',
    searchUrl: (q) => `https://farmacia.araucomed.com/busqueda?s=${encodeURIComponent(q)}`
  },
  cruzverde: {
    key: 'cruzverde',
    name: 'Cruz Verde',
    short: 'Cruz Verde',
    type: 'cadena',
    live: true,
    color: '#008a5a',
    site: 'https://www.cruzverde.cl',
    searchUrl: (q) => `https://www.cruzverde.cl/search?query=${encodeURIComponent(q)}`
  },
  salcobrand: {
    key: 'salcobrand',
    name: 'Salcobrand',
    short: 'Salcobrand',
    type: 'cadena',
    live: true,
    color: '#2356a8',
    site: 'https://salcobrand.cl',
    searchUrl: (q) => `https://salcobrand.cl/search_result?query=${encodeURIComponent(q)}`,
    priceListUrl: 'https://salcobrand.cl/legal_bases/lista-precios'
  },
  knop: {
    key: 'knop',
    name: 'Farmacia Knop',
    short: 'Knop',
    type: 'cadena',
    live: true,
    color: '#7752a8',
    site: 'https://www.farmaciasknop.com',
    searchUrl: (q) => `https://www.farmaciasknop.com/search?q=${encodeURIComponent(q)}`
  },
  farmex: {
    key: 'farmex',
    name: 'Farmex',
    short: 'Farmex',
    type: 'economica',
    live: false,
    color: '#4b7d42',
    site: ''
  },
  puntofarma: {
    key: 'puntofarma',
    name: 'Punto Farma',
    short: 'Punto Farma',
    type: 'barrio',
    live: false,
    color: '#7a6a2f',
    site: ''
  },
  barrio: {
    key: 'barrio',
    name: 'Farmacia de barrio',
    short: 'Barrio',
    type: 'barrio',
    live: false,
    color: '#0e7c66',
    site: ''
  }
};

export const LIVE_CHAINS = Object.values(CHAINS).filter((chain) => chain.live);
export const OFFER_ORDER = ['ahumada', 'drsimi', 'salcobrand', 'cruzverde', 'ecofarmacias', 'araucomed', 'knop'];

export function chainByKey(key) {
  return CHAINS[key] || CHAINS.barrio;
}

export function detectChain(name = '', brand = '') {
  const normalized = `${brand} ${name}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('cruz verde')) return 'cruzverde';
  if (normalized.includes('salcobrand') || normalized.includes('salco brand')) return 'salcobrand';
  if (normalized.includes('ahumada')) return 'ahumada';
  if (normalized.includes('simi')) return 'drsimi';
  if (normalized.includes('knop')) return 'knop';
  if (normalized.includes('araucom')) return 'araucomed';
  if (normalized.includes('ecofarmacia') || normalized.includes('eco farmacia')) return 'ecofarmacias';
  if (normalized.includes('farmacias economicas') || normalized.includes('farmacia economica')) return 'farmex';
  if (normalized.includes('farmex')) return 'farmex';
  if (normalized.includes('punto farma')) return 'puntofarma';
  return 'barrio';
}

export function chainTypeLabel(type) {
  if (type === 'cadena') return 'Cadena';
  if (type === 'economica') return 'Económica';
  return 'Barrio';
}
