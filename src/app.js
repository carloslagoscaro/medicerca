import { CATEGORIES, MEDS, medById, searchMeds } from '../shared/meds.js';
import { CHAINS, LIVE_CHAINS, chainByKey, detectChain } from '../shared/chains.js';
import { distanceKm, formatDistance } from '../shared/geo.js';
import * as ui from './ui.js';
import * as store from './store.js';
import * as api from './api.js';
import * as nearbyData from './nearby.js';
import { mountMap } from './map.js';

const {
  escapeHtml: h,
  icon,
  formatClp,
  formatUnitPrice,
  formatDate,
  formatDateTime,
  formatTime,
  unitNoun,
  categoryStyle,
  chainDot,
  directionUrl,
  safeUrl
} = ui;

const RADIUS_OPTIONS = [1000, 3000, 5000, 8000];
const MANUAL_CHAIN_KEYS = [
  'barrio',
  'puntofarma',
  'ahumada',
  'drsimi',
  'cruzverde',
  'salcobrand',
  'knop',
  'farmex'
];
const PENDING_CHAIN_KEYS = ['cruzverde'];

const state = {
  navToken: 0,
  route: null,
  cleanups: [],
  onManualChange: null,
  refreshDetail: null,
  homeCategory: '__popular',
  mapInstance: null,
  mapRaw: [],
  mapFetchRadius: 0,
  mapSource: 'none',
  mapError: null,
  mapRadius: 5000,
  mapFilter: 'todas',
  mapLimit: 12,
  installPrompt: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function isToken(token) {
  return token === state.navToken;
}

function addCleanup(fn) {
  state.cleanups.push(fn);
}

function routeHash(path) {
  window.location.hash = path;
}

function parseRoute() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const parts = pathPart
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
  const params = new URLSearchParams(queryPart);
  if (parts[0] === 'med' && parts[1]) return { name: 'med', id: parts[1], params };
  if (parts[0] === 'mapa') return { name: 'map', params };
  if (parts[0] === 'online') return { name: 'online', query: params.get('q') || '', params };
  if (parts[0] === 'precios') return { name: 'prices', params };
  if (parts[0] === 'info') return { name: 'info', params };
  return { name: 'home', params };
}

function renderRoute() {
  state.navToken += 1;
  const token = state.navToken;
  for (const cleanup of state.cleanups.splice(0)) {
    try {
      cleanup();
    } catch {
      /* la vista ya se fue */
    }
  }
  if (state.mapInstance) {
    state.mapInstance.destroy();
    state.mapInstance = null;
  }
  state.onManualChange = null;
  state.refreshDetail = null;

  const route = parseRoute();
  state.route = route;
  const main = $('#main');
  if (!main) return;
  window.scrollTo({ top: 0, behavior: 'auto' });
  renderTopbar(route);
  updateNav();
  main.innerHTML = '';
  main.setAttribute('aria-busy', 'false');

  try {
    if (route.name === 'home') renderHome(main, token);
    else if (route.name === 'med') renderDetail(main, route, token);
    else if (route.name === 'online') renderOnline(main, route, token);
    else if (route.name === 'map') renderMap(main, token);
    else if (route.name === 'prices') renderPrices(main, token);
    else renderInfo(main, token);
  } catch (error) {
    console.error(error);
    main.innerHTML = `<div class="page"><div class="container"><div class="empty-state"><span class="empty-art">${icon(
      'alert'
    )}</span><strong>Algo salió mal</strong><p>Vuelve al inicio e intenta de nuevo.</p><a class="btn btn-primary" href="#/">Ir al inicio</a></div></div></div>`;
  }
  main.focus({ preventScroll: true });
}

/* ---------- Shell ---------- */

function brandMarkup() {
  return `<a class="brand" href="#/" aria-label="MediCerca, ir al inicio">
    <span class="brand-mark">${icon('pin')}</span>
    <span class="brand-copy"><span class="brand-name">MediCerca</span><span class="brand-sub">precios de medicamentos</span></span>
  </a>`;
}

function locationChipMarkup() {
  const location = store.getLocation();
  return `<button class="location-chip" type="button" data-location aria-label="Cambiar ubicación: ${h(
    store.locationLabel(location)
  )}">${icon('pin')}<span>${h(store.locationLabel(location))}</span></button>`;
}

function renderTopbar(route) {
  const bar = $('#topbar');
  if (!bar) return;
  bar.classList.toggle('is-detail', route.name === 'med');

  if (route.name === 'med') {
    const med = medById(route.id);
    bar.innerHTML = `<div class="topbar-inner">
      <button class="icon-btn topbar-back" type="button" data-back aria-label="Volver al buscador">${icon('arrow-left')}</button>
      <div class="topbar-title-wrap">
        <span class="topbar-kicker">Comparando</span>
        <span class="topbar-title">${h(med ? `${med.name} ${med.strength}` : 'Medicamento')}</span>
      </div>
      <button class="icon-btn" type="button" data-refresh-detail aria-label="Actualizar precios">${icon('refresh')}</button>
    </div>`;
  } else if (route.name === 'online') {
    bar.innerHTML = `<div class="topbar-inner">
      <button class="icon-btn topbar-back" type="button" data-back aria-label="Volver al buscador">${icon('arrow-left')}</button>
      <div class="topbar-title-wrap">
        <span class="topbar-kicker">Buscador online</span>
        <span class="topbar-title">${h(route.query || 'Medicamento')}</span>
      </div>
    </div>`;
  } else if (route.name === 'prices') {
    bar.innerHTML = `<div class="topbar-inner">
      ${brandMarkup()}
      <div class="topbar-actions">
        <button class="icon-btn" type="button" data-add-top aria-label="Anotar un precio">${icon('plus')}</button>
      </div>
    </div>`;
  } else if (route.name === 'info') {
    bar.innerHTML = `<div class="topbar-inner">${brandMarkup()}</div>`;
  } else {
    bar.innerHTML = `<div class="topbar-inner">
      ${brandMarkup()}
      <div class="topbar-actions">${locationChipMarkup()}</div>
    </div>`;
  }

  $('[data-location]', bar)?.addEventListener('click', openLocationSheet);
  $('[data-back]', bar)?.addEventListener('click', () => routeHash('/'));
  $('[data-add-top]', bar)?.addEventListener('click', () => openManualSheet({}));
  $('[data-refresh-detail]', bar)?.addEventListener('click', () => state.refreshDetail?.());
}

function updateNav() {
  const nav = $('#bottom-nav');
  if (!nav) return;
  const route = state.route || parseRoute();
  const active = route.name === 'med' ? 'home' : route.name;
  const count = store.manualCount();
  const badge = count
    ? `<span class="nav-badge" aria-hidden="true">${count > 9 ? '9+' : count}</span>`
    : '';
  const items = [
    { key: 'home', href: '#/', label: 'Buscar', icon: 'search' },
    { key: 'map', href: '#/mapa', label: 'Mapa', icon: 'map' },
    { key: 'prices', href: '#/precios', label: 'Mis precios', icon: 'tag', badge },
    { key: 'info', href: '#/info', label: 'Info', icon: 'info' }
  ];
  nav.innerHTML = `<div class="bottom-nav-inner">${items
    .map(
      (item) => `<a class="nav-item${active === item.key ? ' is-active' : ''}" href="${item.href}" ${
        active === item.key ? 'aria-current="page"' : ''
      } aria-label="${item.label}${item.key === 'prices' && count ? `, ${count} precios anotados` : ''}">
        ${icon(item.icon)}<span>${item.label}</span>${item.badge || ''}
      </a>`
    )
    .join('')}</div>`;
}

/* ---------- Home ---------- */

function medCardMarkup(med, index = 0) {
  return `<a class="med-card reveal" style="--i:${index}" href="#/med/${encodeURIComponent(med.id)}">
    <span class="med-icon" style="${categoryStyle(med.category)}">${icon('pill')}</span>
    <span class="med-info">
      <span class="med-name">${h(med.name)} ${h(med.strength)}</span>
      <span class="med-meta">${h(med.category)} · ${h(med.form)}</span>
    </span>
    <span class="med-go">${icon('chevron')}</span>
  </a>`;
}

function searchResultMarkup(med) {
  return `<a class="search-result" role="option" href="#/med/${encodeURIComponent(med.id)}">
    <span class="med-icon" style="${categoryStyle(med.category)}">${icon('pill')}</span>
    <span class="med-info">
      <span class="med-name">${h(med.name)} ${h(med.strength)}</span>
      <span class="med-meta">${h(med.form)} · ${h(med.category)}</span>
    </span>
  </a>`;
}

function nearbyCardMarkup(pharmacy, index = 0) {
  const chain = chainByKey(pharmacy.chain);
  const address = [pharmacy.address, pharmacy.comuna].filter(Boolean).join(', ');
  return `<article class="nearby-card reveal" style="--i:${index}">
    <div class="nearby-top">
      <div class="nearby-chain">${chainDot(chain)}<span>${h(chain.short)}</span></div>
      <span class="distance-pill">${h(formatDistance(pharmacy.distance))}</span>
    </div>
    <p class="nearby-name">${h(pharmacy.name)}</p>
    <p class="nearby-address">${icon('pin')} <span>${h(address || 'Dirección no disponible')}</span></p>
    <div class="nearby-action">
      <a href="#/mapa">Ver en el mapa</a>
      <a href="${h(directionUrl(pharmacy.lat, pharmacy.lon))}" target="_blank" rel="noopener noreferrer">Ir ${icon(
        'external'
      )}</a>
    </div>
  </article>`;
}

function nearbySourceLabel(location) {
  if (location.source === 'gps') return 'Ordenadas desde tu GPS · OpenStreetMap';
  if (location.source === 'manual') return `Ordenadas desde ${location.label} · OpenStreetMap`;
  return 'Ejemplo: Huechuraba. Activa tu GPS para tu comuna · OpenStreetMap';
}

function gpsCalloutMarkup() {
  const location = store.getLocation();
  if (store.hasRealLocation(location)) return '';
  return `<div class="gps-callout" data-gps-callout>
    <span class="gps-callout-art">${icon('locate')}</span>
    <div class="gps-callout-copy">
      <strong>Activa tu ubicación</strong>
      <p data-gps-hint>Verás las farmacias más cercanas a ti en cualquier comuna de Chile.</p>
      <button class="gps-callout-link" type="button" data-gps-help>¿No aparece el permiso? Ver cómo activarlo</button>
    </div>
    <div class="gps-callout-actions">
      <button class="btn btn-primary btn-sm" type="button" data-gps-quick>${icon('locate')} Usar mi GPS</button>
      <button class="btn btn-ghost btn-sm" type="button" data-comuna-quick>Elegir comuna</button>
    </div>
  </div>`;
}

function homeTemplate() {
  const nearbyCount = nearbyData.bundledMeta().count || '—';
  return `<div class="page">
    <div class="container">
      <section class="hero">
        <div class="hero-grid">
          <div class="hero-copy">
            <span class="eyebrow">Farmacias online + tu barrio</span>
            <h1>El mismo remedio.<br /><span class="accent">Donde cuesta menos.</span></h1>
            <p class="hero-lead">Compara <strong>precios reales</strong> entre farmacias online y las farmacias de tu barrio. Revisa el precio por unidad y encuentra la más cercana a ti.</p>
            <div class="hero-notes">
              <span class="hero-note">${icon('check')} ${LIVE_CHAINS.length} farmacias online</span>
              <span class="hero-note">${icon('map')} Mapa con GPS</span>
              <span class="hero-note">${icon('shield')} Sin registro</span>
            </div>
            ${gpsCalloutMarkup()}
            <form class="search-card" id="search-form" role="search" autocomplete="off">
              <label class="search-label" for="med-search">¿Qué medicamento buscas?</label>
              <div class="search-box">
                ${icon('search')}
                <input class="search-input" id="med-search" type="search" inputmode="search" enterkeyhint="search" placeholder="Paracetamol, omeprazol…" aria-controls="search-results" aria-expanded="false" aria-autocomplete="list" spellcheck="false" />
                <button class="search-clear" id="search-clear" type="button" aria-label="Borrar búsqueda" hidden>${icon(
                  'close',
                  'icon-sm'
                )}</button>
              </div>
              <div class="search-results" id="search-results" role="listbox" aria-label="Medicamentos encontrados"></div>
              <p class="search-hint">Ej: paracetamol, omeprazol, loratadina. Si no está en el catálogo, Enter lo busca en las farmacias online.</p>
            </form>
          </div>
          <aside class="compare-preview on-dark" id="featured-preview" aria-label="Comparación destacada"></aside>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><strong>${LIVE_CHAINS.length}</strong><span>farmacias online<br />con precio en vivo</span></div>
          <div class="hero-stat"><strong id="stat-nearby">${h(String(nearbyCount))}</strong><span>farmacias<br />en todo Chile</span></div>
          <div class="hero-stat"><strong>${MEDS.length}</strong><span>medicamentos<br />para comparar</span></div>
        </div>
      </section>

      <section class="section" aria-labelledby="popular-title">
        <div class="section-head">
          <div class="section-title-wrap">
            <span class="section-kicker">Catálogo</span>
            <h2 class="section-title" id="popular-title">Más buscados</h2>
            <p class="section-sub" id="popular-sub">Precios reales en ${LIVE_CHAINS.length} farmacias online.</p>
          </div>
          <select class="category-select" id="category-filter" aria-label="Filtrar medicamentos por categoría">
            <option value="__popular">Más buscados</option>
            <option value="__all">Todos los medicamentos</option>
            ${CATEGORIES.map((category) => `<option value="${h(category)}">${h(category)}</option>`).join('')}
          </select>
        </div>
        <div class="med-grid" id="popular-grid"></div>
      </section>

      <section class="section" aria-labelledby="nearby-home-title">
        <div class="section-head">
          <div class="section-title-wrap">
            <span class="section-kicker">Cerca de ti</span>
            <h2 class="section-title" id="nearby-home-title">Farmacias a tu alrededor</h2>
            <p class="section-sub" id="home-nearby-source">Farmacias en todo Chile · OpenStreetMap</p>
          </div>
          <a class="section-link" href="#/mapa">Ver mapa ${icon('arrow-right')}</a>
        </div>
        <div class="nearby-grid" id="home-nearby"></div>
      </section>

      <section class="section" aria-labelledby="how-title">
        <div class="section-head">
          <div class="section-title-wrap">
            <span class="section-kicker">Así funciona</span>
            <h2 class="section-title" id="how-title">Comparar toma menos de un minuto</h2>
          </div>
        </div>
        <div class="how-grid">
          <article class="step-card"><span class="step-num">01</span><h3>Busca tu remedio</h3><p>Escribe el nombre genérico o de marca. Comparamos la misma dosis, forma y presentación.</p></article>
          <article class="step-card"><span class="step-num">02</span><h3>Revisa el precio real</h3><p>Ordenamos por precio por unidad para que compares cajas de distinto tamaño con justicia.</p></article>
          <article class="step-card"><span class="step-num">03</span><h3>Suma tu barrio</h3><p>Anota el precio que viste en una farmacia de barrio y aparecerá junto a las grandes cadenas.</p></article>
        </div>
      </section>

      <footer class="home-footer">
        <p><strong>MediCerca</strong> consulta precios publicados en las webs de las farmacias y datos de farmacias de OpenStreetMap. Los precios de internet pueden variar en tienda. No reemplaza la recomendación de un profesional de la salud. <a href="#/info">Más información</a>.</p>
      </footer>
    </div>
  </div>`;
}

function renderHome(main, token) {
  state.homeCategory = '__popular';
  main.innerHTML = homeTemplate();
  bindGpsCallout(main);
  bindHomeSearch(main);
  bindHomeCategory(main);
  renderPopular(main);
  renderFeatured(token);
  renderNearbyPreview(token);
  nearbyData.preloadBundled().then(() => {
    if (!isToken(token)) return;
    const stat = $('#stat-nearby');
    if (stat) stat.textContent = String(nearbyData.bundledMeta().count || '—');
  });
}

function bindGpsCallout(main) {
  const callout = $('[data-gps-callout]', main);
  if (!callout) return;
  const gpsButton = $('[data-gps-quick]', callout);
  const comunaButton = $('[data-comuna-quick]', callout);
  const helpButton = $('[data-gps-help]', callout);
  const hint = $('[data-gps-hint]', callout);

  store.geolocationState().then((permission) => {
    if (!callout.isConnected || !hint) return;
    if (permission === 'denied') {
      hint.textContent = 'La ubicación está bloqueada en este navegador. Revisa “Ver cómo activarlo” o elige tu comuna.';
    } else if (permission === 'prompt') {
      hint.textContent = 'Te pediremos permiso una vez. Si no aparece el aviso, elige tu comuna.';
    }
  });

  gpsButton?.addEventListener('click', async () => {
    ui.setButtonLoading(gpsButton, true, 'Ubicando…');
    try {
      await store.requestLocation();
      store.setPref('gpsAuto', true);
      ui.toast('GPS activado.', { type: 'success' });
      renderRoute();
    } catch (error) {
      if (/permiso/i.test(error.message)) store.setPref('gpsAuto', false);
      ui.setButtonLoading(gpsButton, false);
      openLocationSheet({ error: error.message, focusComuna: true });
    }
  });
  comunaButton?.addEventListener('click', () => openLocationSheet({ focusComuna: true }));
  helpButton?.addEventListener('click', () => openLocationSheet({ helpOpen: true }));
}

function bindHomeCategory(main) {
  const select = $('#category-filter', main);
  if (!select) return;
  select.value = state.homeCategory;
  select.addEventListener('change', () => {
    state.homeCategory = select.value;
    renderPopular(main);
  });
}

function renderPopular(main) {
  const grid = $('#popular-grid', main);
  const title = $('#popular-title', main);
  const sub = $('#popular-sub', main);
  if (!grid || !title || !sub) return;

  let list;
  if (state.homeCategory === '__all') {
    list = MEDS;
    title.textContent = 'Todos los medicamentos';
    sub.textContent = `${MEDS.length} presentaciones frecuentes para comparar.`;
  } else if (state.homeCategory !== '__popular') {
    list = MEDS.filter((med) => med.category === state.homeCategory);
    title.textContent = state.homeCategory;
    sub.textContent = `${list.length} ${list.length === 1 ? 'medicamento' : 'medicamentos'} en esta categoría.`;
  } else {
    list = MEDS.filter((med) => med.popular);
    title.textContent = 'Más buscados';
    sub.textContent = `Precios reales en ${LIVE_CHAINS.length} farmacias online.`;
  }

  grid.innerHTML = list.length
    ? list.map((med, index) => medCardMarkup(med, Math.min(index, 8))).join('')
    : `<div class="empty-state"><span class="empty-art">${icon(
        'pill'
      )}</span><strong>Sin medicamentos en esta categoría</strong><p>Prueba con otra categoría o usa el buscador.</p></div>`;
}

function featuredSkeleton(container) {
  container.innerHTML = `<div class="preview-head">
      <span class="preview-kicker"><span class="live-dot is-demo"></span>Comparativa</span>
    </div>
    <div class="preview-skeleton on-dark">
      <span class="skeleton" style="width:58%"></span>
      <span class="skeleton" style="width:100%;height:42px"></span>
      <span class="skeleton" style="width:100%;height:42px"></span>
      <span class="skeleton" style="width:100%;height:42px"></span>
    </div>`;
}

function paintFeatured(container, med, value, origin) {
  const offers = [...(value.offers || [])]
    .filter((offer) => Number(offer.price) > 0)
    .sort(
      (a, b) =>
        (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price) || a.price - b.price
    )
    .slice(0, 3);

  if (!offers.length) {
    container.innerHTML = `<div class="preview-head">
        <span class="preview-kicker"><span class="live-dot is-demo"></span>Comparativa de hoy</span>
      </div>
      <div class="preview-med"><strong>${h(med.name)} ${h(med.strength)}</strong><span>${h(med.form)}</span></div>
      <p class="preview-saving" style="margin-top:10px">Hoy no pudimos leer precios online para este medicamento.</p>
      <div class="preview-foot"><span class="preview-saving">Puedes revisar la ficha completa.</span><a class="preview-cta" href="#/med/${encodeURIComponent(
        med.id
      )}">Ver ficha ${icon('arrow-right')}</a></div>`;
    return;
  }

  const best = offers[0];
  const units = offers.map((offer) => offer.unitPrice ?? offer.price).filter(Number.isFinite);
  const worstUnit = Math.max(...units);
  const bestUnit = best.unitPrice ?? best.price;
  const saving = units.length > 1 && worstUnit > 0 ? Math.round((1 - bestUnit / worstUnit) * 100) : 0;
  const live = origin === 'live';
  const dateLabel = live ? formatTime(value.checkedAt) : 'Guardado';

  container.innerHTML = `<div class="preview-head">
      <span class="preview-kicker"><span class="live-dot${live ? '' : ' is-demo'}"></span>Comparativa de hoy</span>
      <span class="preview-date">${h(dateLabel)}</span>
    </div>
    <div class="preview-med"><strong>${h(med.name)} ${h(med.strength)}</strong><span>${h(med.form)}</span></div>
    <div class="preview-rows">
      ${offers
        .map((offer, index) => {
          const chain = chainByKey(offer.chain);
          const perUnit =
            offer.unitPrice && med.packUnit
              ? `<small>${h(formatUnitPrice(offer.unitPrice))} / ${h(unitNoun(med.packUnit))}</small>`
              : '';
          return `<div class="preview-row${index === 0 ? ' is-best' : ''}">
            ${chainDot(chain)}
            <span class="preview-chain"><span>${h(chain.short)}</span></span>
            <span class="preview-price">${h(formatClp(offer.price))}${perUnit}</span>
          </div>`;
        })
        .join('')}
    </div>
    <div class="preview-foot">
      <span class="preview-saving">${
        saving > 0 ? `Ahorro por unidad<br /><strong>-${saving}%</strong>` : `Precio real<br /><strong>${offers.length} oferta${offers.length === 1 ? '' : 's'}</strong>`
      }</span>
      <a class="preview-cta" href="#/med/${encodeURIComponent(med.id)}">Ver ofertas ${icon('arrow-right')}</a>
    </div>`;
}

async function renderFeatured(token) {
  const med = medById('omeprazol-20');
  const container = $('#featured-preview');
  if (!med || !container) return;

  const cached = store.getCachedComparison(med.id);
  if (cached) paintFeatured(container, med, cached.value, 'cache');
  else featuredSkeleton(container);

  let painted = Boolean(cached);
  const snapshot = await api.snapshotValue(med.id);
  if (!isToken(token) || !document.contains(container)) return;
  if (!painted && snapshot) {
    paintFeatured(container, med, snapshot, 'snapshot');
    painted = true;
  }

  try {
    const value = await api.fetchComparison(med.id);
    if (!isToken(token) || !document.contains(container)) return;
    store.saveComparisonCache(med.id, value);
    paintFeatured(container, med, value, 'live');
  } catch {
    if (!painted && isToken(token) && document.contains(container)) {
      paintFeatured(container, med, { offers: [], checkedAt: null }, 'cache');
    }
  }
}

function homeNearbySkeleton() {
  return Array.from(
    { length: 3 },
    () =>
      `<article class="nearby-card"><div class="skeleton" style="width:55%"></div><div class="skeleton" style="width:82%"></div><div class="skeleton" style="width:68%"></div></article>`
  ).join('');
}

function renderNearbyPreview(token) {
  const wrap = $('#home-nearby');
  if (!wrap) return;
  const location = store.getLocation();
  const source = $('#home-nearby-source');
  const initial = nearbyData.bundledNearby(location, 5000);

  if (initial.length) {
    wrap.innerHTML = initial
      .slice(0, 3)
      .map((pharmacy, index) => nearbyCardMarkup(pharmacy, index))
      .join('');
  } else {
    wrap.innerHTML = homeNearbySkeleton();
  }
  if (source) {
    source.textContent = nearbySourceLabel(location);
  }

  nearbyData.preloadBundled().then(() => {
    if (!isToken(token)) return;
    const target = $('#home-nearby');
    if (!target) return;
    const list = nearbyData.bundledNearby(location, 5000);
    if (list.length) {
      target.innerHTML = list
        .slice(0, 3)
        .map((pharmacy, index) => nearbyCardMarkup(pharmacy, index))
        .join('');
      const note = $('#home-nearby-source');
      if (note) note.textContent = nearbySourceLabel(location);
      return;
    }
    if (!store.hasRealLocation(location)) {
      target.innerHTML = `<div class="map-empty"><span>${icon(
        'map'
      )}</span><strong>Activa tu GPS para ver farmacias cercanas</strong><p>El mapa usa tu ubicación para ordenar las farmacias por distancia.</p><a class="btn btn-ghost btn-sm" href="#/mapa">Abrir mapa</a></div>`;
      return;
    }
    if (source) source.textContent = 'Buscando farmacias en OpenStreetMap…';
    nearbyData
      .getNearby(location, 5000)
      .then((result) => {
        if (!isToken(token)) return;
        const liveTarget = $('#home-nearby');
        if (!liveTarget) return;
        if (result.pharmacies.length) {
          liveTarget.innerHTML = result.pharmacies
            .slice(0, 3)
            .map((pharmacy, index) => nearbyCardMarkup(pharmacy, index))
            .join('');
          const note = $('#home-nearby-source');
          if (note) note.textContent = 'Ordenadas desde tu GPS · OpenStreetMap';
        } else {
          liveTarget.innerHTML = `<div class="map-empty"><span>${icon(
            'map'
          )}</span><strong>No encontramos farmacias en este radio</strong><p>Prueba abriendo el mapa o activa tu ubicación.</p><a class="btn btn-ghost btn-sm" href="#/mapa">Abrir mapa</a></div>`;
        }
      })
      .catch(() => {
        if (!isToken(token)) return;
        const liveTarget = $('#home-nearby');
        if (liveTarget) {
          liveTarget.innerHTML = `<div class="map-empty"><span>${icon(
            'alert'
          )}</span><strong>No pudimos cargar farmacias cercanas</strong><p>Revisa tu conexión e intenta en el mapa.</p><a class="btn btn-ghost btn-sm" href="#/mapa">Abrir mapa</a></div>`;
        }
      });
  });
}

function onlineSearchMarkup(query) {
  return `<a class="search-result search-online" href="#/online?q=${encodeURIComponent(query)}">
    <span class="med-icon" style="background:rgba(22,101,184,.12);color:#1665b8">${icon('search')}</span>
    <span class="med-info">
      <span class="med-name">Buscar “${h(query)}” en farmacias online</span>
      <span class="med-meta">Precios de ${LIVE_CHAINS.length} cadenas, sin entrar a cada web</span>
    </span>
    <span class="med-go">${icon('chevron')}</span>
  </a>`;
}

function bindHomeSearch(main) {
  const form = $('#search-form', main);
  const input = $('#med-search', main);
  const clear = $('#search-clear', main);
  const results = $('#search-results', main);
  if (!form || !input || !clear || !results) return;

  let visibleMeds = [];

  const closeResults = () => {
    results.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
  };

  const showResults = (meds, query) => {
    visibleMeds = meds;
    if (!query.trim()) {
      closeResults();
      return;
    }
    if (!meds.length) {
      results.innerHTML = `<div class="search-empty"><strong>No encontramos “${h(
        query.trim()
      )}” en el catálogo.</strong><br />Prueba con el nombre genérico o búscalo directo en las farmacias online.</div>${onlineSearchMarkup(
        query.trim()
      )}`;
    } else {
      results.innerHTML = `${meds.map((med) => searchResultMarkup(med)).join('')}${onlineSearchMarkup(
        query.trim()
      )}`;
    }
    results.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => {
    const query = input.value;
    clear.hidden = !query;
    showResults(searchMeds(query, 7), query);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeResults();
      input.blur();
    } else if (event.key === 'ArrowDown' && results.classList.contains('is-open')) {
      const first = results.querySelector('.search-result');
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  results.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = $$('.search-result', results);
    const index = items.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? items[index + 1] : items[index - 1];
    if (next) next.focus();
    else input.focus();
  });

  clear.addEventListener('click', () => {
    input.value = '';
    clear.hidden = true;
    closeResults();
    input.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }
    const [first] = searchMeds(query, 1);
    if (first) {
      routeHash(`/med/${encodeURIComponent(first.id)}`);
    } else {
      routeHash(`/online?q=${encodeURIComponent(query)}`);
    }
  });

  const outside = (event) => {
    if (!form.contains(event.target)) closeResults();
  };
  document.addEventListener('pointerdown', outside);
  addCleanup(() => document.removeEventListener('pointerdown', outside));
}

/* ---------- Online search ---------- */

function onlineTemplate(query) {
  return `<div class="page online-page">
    <div class="container">
      <section class="online-head">
        <span class="eyebrow">Buscador en farmacias online</span>
        <h1 class="online-title">“${h(query)}”</h1>
        <p class="online-sub">Buscamos el nombre tal como lo escribiste en ${LIVE_CHAINS.length} farmacias con precio público. No necesitas entrar a cada web.</p>
        <form class="online-form" id="online-form" role="search">
          <label class="sr-only" for="online-query">Buscar otro medicamento</label>
          <div class="search-box">
            ${icon('search')}
            <input class="search-input" id="online-query" type="search" value="${h(
              query
            )}" placeholder="Otro medicamento o marca…" enterkeyhint="search" autocomplete="off" spellcheck="false" />
            <button class="btn btn-primary btn-sm" type="submit">Buscar</button>
          </div>
        </form>
        <div class="online-meta" id="online-meta">${icon('clock')} Consultando farmacias…</div>
      </section>
      <div id="online-status"></div>
      <div id="online-results">${Array.from(
        { length: 3 },
        () => `<div class="skeleton-card skeleton-stack" style="margin-bottom:8px"><span class="skeleton" style="width:30%"></span><span class="skeleton" style="width:76%"></span><span class="skeleton" style="width:46%"></span></div>`
      ).join('')}</div>
      <p class="disclaimer">Los resultados son los que publica el buscador de cada farmacia. Revisa dosis, forma y presentación antes de comprar. Los precios pueden cambiar al pagar.</p>
    </div>
  </div>`;
}

function onlineOfferMarkup(offer, index) {
  const chain = chainByKey(offer.chain);
  const pack = offer.packCount ? `${offer.packCount} ${offer.packUnit}` : 'Presentación según el nombre';
  const unit = offer.unitPrice
    ? `${formatUnitPrice(offer.unitPrice)} / ${unitNoun(offer.packUnit)}`
    : 'Precio por caja';
  const href = safeUrl(offer.url) || safeUrl(chain.searchUrl?.(offer.productName)) || safeUrl(chain.site);
  const content = `<div class="offer-top">
      <span class="offer-chain">${chainDot(chain)} ${h(chain.short)}${
        index === 0 ? '<span class="best-flag">Menor por unidad</span>' : ''
      }</span>
      <span class="offer-price">${h(formatClp(offer.price))}<small>${h(unit)}</small></span>
    </div>
    <p class="offer-name">${h(offer.productName || chain.name)}</p>
    <div class="offer-foot">
      <span>${h(pack)}${
        offer.listPrice ? ` · Antes ${h(formatClp(offer.listPrice))}` : ''
      }</span>
      <span class="offer-foot-right">Ver producto ${icon('external')}</span>
    </div>`;

  return href
    ? `<a class="offer-card${index === 0 ? ' is-best' : ''}" href="${h(href)}" target="_blank" rel="noopener noreferrer">${content}</a>`
    : `<div class="offer-card">${content}</div>`;
}

function renderOnline(main, route, token) {
  const query = String(route.query || '').trim();
  main.innerHTML = onlineTemplate(query || 'Medicamento');
  const form = $('#online-form', main);
  const input = $('#online-query', main);
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = input?.value.trim();
    if (!next) {
      input?.focus();
      return;
    }
    routeHash(`/online?q=${encodeURIComponent(next)}`);
  });

  if (query.length < 2) {
    $('#online-results', main).innerHTML = `<div class="empty-state"><span class="empty-art">${icon(
      'search'
    )}</span><strong>Escribe un medicamento</strong><p>Usa el nombre genérico o de marca, por ejemplo “omeprazol” o “Kitadol”.</p></div>`;
    const meta = $('#online-meta', main);
    if (meta) meta.innerHTML = `${icon('info')} Mínimo dos letras.`;
    return;
  }

  api
    .searchOnline(query)
    .then((value) => {
      if (!isToken(token)) return;
      const offers = [...(value.offers || [])].sort(
        (a, b) => (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price) || a.price - b.price
      );
      const meta = $('#online-meta', main);
      const failed = (value.sources || [])
        .filter((source) => source.status === 'error')
        .map((source) => chainByKey(source.chain).short);

      if (meta) {
        const shown = offers.length;
        const total = Number(value.total) || shown;
        meta.innerHTML = `${icon('receipt')} ${shown} ${
          shown === 1 ? 'resultado' : 'resultados'
        }${total > shown ? ` de ${total}` : ''} · ${h(formatDateTime(value.checkedAt))}${
          failed.length ? ` · Sin respuesta de ${h(failed.join(', '))}` : ''
        }`;
      }

      const status = $('#online-status', main);
      if (status) {
        const notes = [];
        if (value.offers?.length) {
          notes.push(
            `<div class="note-strip">${icon(
              'info'
            )}<span>Ordenado por <strong>precio por unidad</strong>. El nombre y la presentación son los que publica cada farmacia.</span></div>`
          );
        }
        if (value.broadenedTo) {
          notes.push(
            `<div class="note-strip">${icon(
              'search'
            )}<span>Ampliamos la búsqueda a <strong>“${h(
              value.broadenedTo
            )}”</strong> para incluir todas las presentaciones.</span></div>`
          );
        }
        status.innerHTML = notes.join('');
      }

      const results = $('#online-results', main);
      if (!results) return;
      if (!offers.length) {
        results.innerHTML = `<div class="empty-state"><span class="empty-art">${icon(
          'receipt'
        )}</span><strong>No encontramos “${h(query)}” con precio público</strong><p>Prueba con el nombre genérico, sin marca ni dosis. Cruz Verde no entrega precios abiertos sin elegir comuna, por eso no aparece en esta búsqueda.</p><a class="btn btn-ghost btn-sm" href="#/">Volver al catálogo</a></div>`;
        return;
      }
      results.innerHTML = `<div class="offers-list">${offers
        .map((offer, index) => onlineOfferMarkup(offer, index))
        .join('')}</div>`;
    })
    .catch((error) => {
      if (!isToken(token)) return;
      const meta = $('#online-meta', main);
      if (meta) meta.innerHTML = `${icon('alert')} No pudimos consultar las farmacias.`;
      const results = $('#online-results', main);
      if (results) {
        results.innerHTML = `<div class="empty-state"><span class="empty-art">${icon(
          'alert'
        )}</span><strong>Búsqueda no disponible</strong><p>${h(
          error.message || 'Revisa tu conexión e intenta otra vez.'
        )}</p><button class="btn btn-ghost btn-sm" type="button" data-online-retry>${icon(
          'refresh'
        )} Reintentar</button></div>`;
        $('[data-online-retry]', results)?.addEventListener('click', () => renderOnline(main, route, token));
      }
    });
}

/* ---------- Detail ---------- */

function detailTemplate(med) {
  return `<div class="page detail-page">
    <div class="container">
      <div class="detail-wrap">
        <header class="detail-head">
          <div class="detail-title-wrap">
            <span class="detail-kicker">Comparador de precios</span>
            <h1 class="detail-title">${h(med.name)} ${h(med.strength)}</h1>
            <p class="detail-sub">${h(med.form)} · ${h(med.category)} · misma dosis y forma farmacéutica</p>
            <div class="detail-meta">
              <span class="meta-chip">${icon('receipt')} Caja de ${med.pack} ${h(med.packUnit)}</span>
              <span class="meta-chip" id="updated-chip">${icon('clock')} Consultando precios…</span>
            </div>
          </div>
        </header>
        <div id="detail-status"></div>
        <section id="best-slot" aria-label="Mejor precio online"></section>
        <div class="note-strip">${icon(
          'info'
        )}<span>Comparamos el mismo principio activo, dosis y forma. Si el tamaño de la caja cambia, ordenamos por <strong>precio por unidad</strong>.</span></div>

        <section class="detail-section" aria-labelledby="offers-title">
          <div class="section-head">
            <div class="section-title-wrap">
              <span class="section-kicker">Precios online</span>
              <h2 class="section-title" id="offers-title">Todas las ofertas</h2>
              <p class="section-sub" id="offers-sub">Consultando farmacias online…</p>
            </div>
            <span class="summary-pill" id="offers-count">Cargando…</span>
          </div>
          <div id="offers-slot"></div>
        </section>

        <section class="detail-section" aria-labelledby="nearby-chains-title">
          <div class="section-head">
            <div class="section-title-wrap">
              <span class="section-kicker">Si prefieres ir</span>
              <h2 class="section-title" id="nearby-chains-title">Dónde comprar cerca</h2>
              <p class="section-sub">La sucursal más cercana de cada farmacia con precio online.</p>
            </div>
            <a class="section-link" href="#/mapa">Ver mapa ${icon('arrow-right')}</a>
          </div>
          <div class="chain-stop-grid" id="nearby-chains-slot"></div>
          <p class="field-help" style="margin-top:8px">Sucursales según OpenStreetMap. Confirma horario y stock antes de ir.</p>
        </section>

        <section class="detail-section" aria-labelledby="manual-title">
          <div class="section-head">
            <div class="section-title-wrap">
              <span class="section-kicker">Tu barrio</span>
              <h2 class="section-title" id="manual-title">Precios que tú anotaste</h2>
              <p class="section-sub">Súmalos para comparar también con las farmacias de tu calle.</p>
            </div>
            <button class="btn btn-soft btn-sm" type="button" data-add-manual>${icon('plus')} Anotar</button>
          </div>
          <div id="manual-slot"></div>
        </section>

        <section class="detail-section" aria-labelledby="pending-title">
          <div class="section-head">
            <div class="section-title-wrap">
              <span class="section-kicker">Sin precio abierto</span>
              <h2 class="section-title" id="pending-title">Revisa tú mismo</h2>
              <p class="section-sub">Cruz Verde solo muestra precios después de elegir comuna y sesión. Te dejamos el enlace directo.</p>
            </div>
          </div>
          <div class="pending-list" id="pending-slot"></div>
        </section>

        <p class="disclaimer" id="detail-disclaimer"><strong>Importante:</strong> los precios son los publicados en internet y pueden cambiar al momento del pago o variar en tienda. MediCerca no vende medicamentos ni entrega consejo médico. Los medicamentos con receta requieren receta. Verifica siempre precio y stock en la farmacia.</p>
      </div>
    </div>
  </div>`;
}

function renderDetailSkeleton(main) {
  const best = $('#best-slot', main);
  const offers = $('#offers-slot', main);
  const count = $('#offers-count', main);
  const sub = $('#offers-sub', main);
  if (best) {
    best.innerHTML = `<div class="best-card skeleton-best"><div class="best-grid on-dark"><div class="skeleton-stack"><span class="skeleton" style="width:32%"></span><span class="skeleton" style="width:56%;height:52px"></span><span class="skeleton" style="width:43%"></span></div><div class="skeleton-stack"><span class="skeleton" style="width:100%;height:46px"></span><span class="skeleton" style="width:100%;height:46px"></span></div></div></div>`;
  }
  if (offers) {
    offers.innerHTML = Array.from(
      { length: 3 },
      () => `<div class="skeleton-card skeleton-stack" style="margin-bottom:8px"><span class="skeleton" style="width:36%"></span><span class="skeleton" style="width:82%"></span><span class="skeleton" style="width:52%"></span></div>`
    ).join('');
  }
  if (count) count.textContent = 'Cargando…';
  if (sub) sub.textContent = 'Consultando farmacias online…';
  main.setAttribute('aria-busy', 'true');
}

function bestCardMarkup(med, offers) {
  if (!offers.length) {
    return `<div class="best-card"><div class="best-grid"><div><span class="best-label">Sin precio online</span><div class="best-price" style="font-size:clamp(26px,6vw,38px)">Revisa tu barrio</div><p class="best-saving-line">Hoy no encontramos esta presentación en las farmacias online. Puedes anotar el precio de tu farmacia de barrio o revisar Cruz Verde.</p></div><div class="best-side"><button class="btn btn-primary" type="button" data-add-manual>${icon(
      'plus'
    )} Anotar precio de barrio</button></div></div></div>`;
  }

  const best = offers[0];
  const chain = chainByKey(best.chain);
  const bestUnit = best.unitPrice ?? best.price;
  const perUnitValues = offers
    .map((offer) => offer.unitPrice ?? offer.price)
    .filter(Number.isFinite);
  const worst = Math.max(...perUnitValues);
  const saving = perUnitValues.length > 1 && worst > bestUnit ? Math.round((1 - bestUnit / worst) * 100) : 0;
  const url =
    safeUrl(best.url) ||
    safeUrl(chain.searchUrl?.(med.query)) ||
    safeUrl(chain.site);
  const pack = best.packCount ? `${best.packCount} ${med.packUnit}` : 'Caja';
  const unitText = best.unitPrice
    ? `${formatUnitPrice(best.unitPrice)} por ${unitNoun(med.packUnit)}`
    : 'Precio por caja';
  const savingsText =
    saving > 0
      ? `Hasta ${saving}% menos por unidad que la opción más cara.`
      : offers.length > 1
        ? 'Es la opción más conveniente por unidad.'
        : 'Única oferta online encontrada para esta presentación.';

  return `<div class="best-card">
    <div class="best-grid">
      <div>
        <span class="best-label">${icon('spark')} Mejor valor por unidad</span>
        <div class="best-price">${h(formatClp(best.price))}</div>
        <div class="best-unit">${h(unitText)}${best.listPrice ? ` · Antes ${h(formatClp(best.listPrice))}` : ''}</div>
        <div class="best-chain-line">${chainDot(chain)} ${h(chain.short)}${
          saving > 0 ? `<span class="best-savings">-${saving}% vs. la más cara</span>` : ''
        }</div>
        <p class="best-saving-line">${h(pack)} · ${h(savingsText)}</p>
      </div>
      <div class="best-side">
        ${
          url
            ? `<a class="btn btn-primary" href="${h(url)}" target="_blank" rel="noopener noreferrer">${icon(
                'external'
              )} ${best.url ? `Ver en ${h(chain.short)}` : `Buscar en ${h(chain.short)}`}</a>`
            : `<span class="btn btn-primary" aria-disabled="true">Ver en ${h(chain.short)}</span>`
        }
        <button class="btn btn-ghost" type="button" data-add-manual>${icon('plus')} Anotar precio de barrio</button>
        <p class="best-disclaimer">Precio publicado en la web de la farmacia. Puede cambiar al pagar.</p>
      </div>
    </div>
  </div>`;
}

function offerCardMarkup(med, offer, best, index) {
  const chain = chainByKey(offer.chain);
  const href = safeUrl(offer.url) || safeUrl(chain.searchUrl?.(med.query)) || safeUrl(chain.site);
  const pack = offer.packCount ? `${offer.packCount} ${med.packUnit}` : 'Caja';
  const unit = offer.unitPrice
    ? `${formatUnitPrice(offer.unitPrice)} / ${unitNoun(med.packUnit)}`
    : 'Precio por caja';
  const ratio =
    best?.unitPrice && offer.unitPrice ? Math.round((offer.unitPrice / best.unitPrice - 1) * 100) : null;
  const delta =
    ratio === null
      ? 'Precio online'
      : ratio <= 0
        ? 'Mejor valor'
        : `+${ratio}% por unidad`;
  const content = `<div class="offer-top">
      <span class="offer-chain">${chainDot(chain)} ${h(chain.short)}${
        index === 0 ? '<span class="best-flag">Mejor valor</span>' : ''
      }</span>
      <span class="offer-price">${h(formatClp(offer.price))}<small>${h(unit)}</small></span>
    </div>
    <p class="offer-name">${h(offer.productName || chain.name)}</p>
    <div class="offer-foot">
      <span>${h(pack)} · Precio online</span>
      <span class="offer-foot-right${ratio !== null && ratio > 0 ? ' is-higher' : ''}">${h(delta)} ${icon(
        'external'
      )}</span>
    </div>`;

  return href
    ? `<a class="offer-card${index === 0 ? ' is-best' : ''}" href="${h(
        href
      )}" target="_blank" rel="noopener noreferrer" aria-label="${h(
        `${chain.short}: ${formatClp(offer.price)}`
      )}">${content}</a>`
    : `<div class="offer-card${index === 0 ? ' is-best' : ''}">${content}</div>`;
}

function sourceNames(value) {
  return (value.sources || [])
    .filter((source) => source.status === 'error')
    .map((source) => chainByKey(source.chain).short);
}

function statusMarkup(value, origin) {
  const parts = [];
  if (origin !== 'live') {
    parts.push(`<div class="note-strip">${icon('clock')}<span>Mostrando precios guardados del ${h(
      formatDateTime(value.checkedAt)
    )}. <button class="btn-link" type="button" data-retry>Actualizar</button></span></div>`);
  }
  const failed = sourceNames(value);
  if (origin === 'live' && failed.length) {
    parts.push(`<div class="note-strip is-muted">${icon('alert')}<span>No pudimos consultar ${h(
      failed.join(', ')
    )}. Los demás precios están actualizados.</span></div>`);
  }
  if (!value.offers?.length) {
    parts.push(`<div class="note-strip is-error">${icon('alert')}<span>Hoy no encontramos precios online para esta presentación. Revisa Cruz Verde o anota el precio de tu barrio.</span></div>`);
  }
  return parts.join('');
}

function paintComparison(main, med, value, origin) {
  main.setAttribute('aria-busy', 'false');
  const offers = [...(value.offers || [])]
    .filter((offer) => Number(offer.price) > 0)
    .sort(
      (a, b) =>
        (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price) || a.price - b.price
    );

  const status = $('#detail-status', main);
  if (status) status.innerHTML = statusMarkup(value, origin);

  const bestSlot = $('#best-slot', main);
  if (bestSlot) bestSlot.innerHTML = bestCardMarkup(med, offers);

  const offersSlot = $('#offers-slot', main);
  if (offersSlot) {
    offersSlot.innerHTML = offers.length
      ? `<div class="offers-list">${offers
          .map((offer, index) => offerCardMarkup(med, offer, offers[0], index))
          .join('')}</div>`
      : `<div class="empty-state"><span class="empty-art">${icon(
          'receipt'
        )}</span><strong>Sin ofertas online ahora</strong><p>Prueba actualizar en unos minutos o revisa Cruz Verde.</p><button class="btn btn-ghost btn-sm" type="button" data-retry>${icon(
          'refresh'
        )} Reintentar</button></div>`;
  }

  const count = $('#offers-count', main);
  if (count) count.textContent = `${offers.length} ${offers.length === 1 ? 'oferta' : 'ofertas'}`;
  const sub = $('#offers-sub', main);
  if (sub) {
    sub.textContent = offers.length
      ? 'Ordenadas por precio por unidad; el tamaño de la caja puede variar.'
      : 'No encontramos esta presentación en las farmacias online.';
  }
  const chip = $('#updated-chip', main);
  if (chip) {
    chip.innerHTML = `${icon('clock')} ${
      origin === 'live' ? 'Actualizado' : 'Guardado'
    } ${h(formatDateTime(value.checkedAt))}`;
  }
  return offers;
}

function renderPendingChains(main, med) {
  const slot = $('#pending-slot', main);
  if (!slot) return;
  slot.innerHTML = PENDING_CHAIN_KEYS.map((key) => {
    const chain = chainByKey(key);
    const url = safeUrl(chain.searchUrl?.(med.query));
    return `<div class="pending-row">
      <div class="pending-chain">${chainDot(chain)}<div style="min-width:0"><span>${h(chain.short)}</span><div class="pending-note">Requiere elegir comuna</div></div></div>
      ${
        url
          ? `<a class="pending-link" href="${h(url)}" target="_blank" rel="noopener noreferrer">Revisar ${icon(
              'external'
            )}</a>`
          : '<span class="pending-note">Revisar en su web</span>'
      }
    </div>`;
  }).join('');
}

function manualUnit(entry, med) {
  const units = entry.units || med?.pack;
  return units ? entry.price / units : null;
}

function renderManualSlot(main, med) {
  const slot = $('#manual-slot', main);
  if (!slot) return;
  const entries = store
    .manualForMed(med.id)
    .sort((a, b) => (manualUnit(a, med) ?? a.price) - (manualUnit(b, med) ?? b.price));
  const location = store.getLocation();

  if (!entries.length) {
    slot.innerHTML = `<div class="manual-empty">
      ${icon('receipt')}
      <strong>Aún no anotas precios de tu barrio</strong>
      <p>Si viste este remedio en una farmacia cerca, anota el precio. Quedará guardado solo en tu teléfono y aparecerá en esta comparación.</p>
      <button class="btn btn-soft btn-sm" type="button" data-add-manual>${icon('plus')} Anotar precio</button>
    </div>`;
    return;
  }

  slot.innerHTML = `<div class="manual-list">${entries
    .map((entry) => {
      const chain = chainByKey(entry.chain);
      const units = entry.units || med.pack;
      const unit = manualUnit(entry, med);
      const distance =
        Number.isFinite(entry.lat) && Number.isFinite(entry.lon)
          ? formatDistance(distanceKm(location, entry))
          : '';
      const chainLabel =
        chain.key === 'barrio'
          ? 'Farmacia de barrio'
          : `${chain.short} · ${
              chain.type === 'cadena' ? 'Cadena' : chain.type === 'economica' ? 'Económica' : 'Barrio'
            }`;
      return `<article class="manual-card">
        <div class="manual-card-top">
          <div class="manual-pharmacy">${h(entry.pharmacy)}<span>${h(chainLabel)}</span></div>
          <div class="manual-price">${h(formatClp(entry.price))}${
            unit ? `<small>${h(formatUnitPrice(unit))} / ${h(unitNoun(med.packUnit))}</small>` : ''
          }</div>
        </div>
        <div class="manual-meta">
          <span>${h(String(units))} ${h(med.packUnit)}</span>
          ${entry.address ? `<span>${icon('pin')} ${h(entry.address)}</span>` : ''}
          ${distance ? `<span>${icon('walk')} ${h(distance)}</span>` : ''}
          <span>${icon('clock')} ${h(formatDate(entry.createdAt))}</span>
        </div>
        <div class="manual-actions">
          <span class="manual-owner">${icon('check')} Tú lo anotaste</span>
          <button class="delete-btn" type="button" data-delete-manual="${h(entry.id)}" aria-label="Eliminar precio de ${h(
            entry.pharmacy
          )}">${icon('trash')}</button>
        </div>
      </article>`;
    })
    .join('')}</div>`;
}

function chainStopMarkup(chainKey, pharmacies) {
  const chain = chainByKey(chainKey);
  const onlineOnly = chain.onlineOnly || chain.type === 'economica';
  if (onlineOnly) {
    const site = safeUrl(chain.site);
    return `<article class="chain-stop">
      <div class="chain-stop-head">
        <span class="chain-stop-name">${chainDot(chain)}<span>${h(chain.short)}</span></span>
        <span class="status-pill is-link">Online</span>
      </div>
      <p class="chain-stop-address">Solo online · despacho a domicilio.</p>
      ${
        site
          ? `<a class="online-only" href="${h(site)}" target="_blank" rel="noopener noreferrer">Ver tienda ${icon(
              'external'
            )}</a>`
          : '<span class="online-only">Revisa su web</span>'
      }
    </article>`;
  }

  const nearest = nearbyData.nearestForChain(pharmacies, chainKey);
  if (!nearest) {
    return `<article class="chain-stop">
      <div class="chain-stop-head">
        <span class="chain-stop-name">${chainDot(chain)}<span>${h(chain.short)}</span></span>
      </div>
      <p class="chain-stop-address">No encontramos sucursal a menos de 5 km.</p>
      <a class="online-only" href="#/mapa">Ver el mapa ${icon('arrow-right')}</a>
    </article>`;
  }

  const address = [nearest.address, nearest.comuna].filter(Boolean).join(', ');
  return `<article class="chain-stop">
    <div class="chain-stop-head">
      <span class="chain-stop-name">${chainDot(chain)}<span>${h(chain.short)}</span></span>
      <span class="distance-pill">${h(formatDistance(nearest.distance))}</span>
    </div>
    <p class="chain-stop-address">${h(address || 'Dirección no disponible')}</p>
    <a class="online-only" href="${h(directionUrl(nearest.lat, nearest.lon))}" target="_blank" rel="noopener noreferrer">Cómo llegar ${icon(
      'navigation'
    )}</a>
  </article>`;
}

async function fillNearbyChains(main, med, offers, token) {
  const slot = $('#nearby-chains-slot', main);
  if (!slot) return;
  const chains = [...new Set(offers.map((offer) => offer.chain))];
  if (!chains.length) {
    slot.innerHTML = `<div class="chain-stop"><p class="chain-stop-address">No hay farmacias con precio online para mostrar.</p></div>`;
    return;
  }

  const physical = chains.filter((key) => {
    const chain = chainByKey(key);
    return !(chain.onlineOnly || chain.type === 'economica');
  });
  slot.innerHTML = chains
    .map(() => `<div class="chain-stop"><div class="skeleton" style="width:50%"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:65%"></div></div>`)
    .join('');

  let pharmacies = [];
  if (physical.length) {
    const location = store.getLocation();
    pharmacies = nearbyData.bundledNearby(location, 5000);
    if (store.hasRealLocation(location) || !pharmacies.length) {
      try {
        const result = await nearbyData.getNearby(location, 5000);
        pharmacies = result.pharmacies;
      } catch {
        pharmacies = pharmacies || [];
      }
    }
  }
  if (!isToken(token) || !document.contains(slot)) return;
  slot.innerHTML = chains.map((key) => chainStopMarkup(key, pharmacies)).join('');
}

function renderDetail(main, route, token) {
  const med = medById(route.id);
  if (!med) {
    main.innerHTML = `<div class="page"><div class="container"><div class="empty-state"><span class="empty-art">${icon(
      'search'
    )}</span><strong>Medicamento no encontrado</strong><p>Vuelve al buscador y elige un medicamento del catálogo.</p><a class="btn btn-primary" href="#/">Buscar de nuevo</a></div></div></div>`;
    return;
  }

  main.innerHTML = detailTemplate(med);
  renderPendingChains(main, med);
  renderManualSlot(main, med);
  renderDetailSkeleton(main);

  const cached = store.getCachedComparison(med.id);
  let painted = false;

  const paint = (value, origin) => {
    if (!isToken(token) || !document.contains(main)) return;
    painted = true;
    const offers = paintComparison(main, med, value, origin);
    fillNearbyChains(main, med, offers, token);
  };

  if (cached) paint(cached.value, 'cache');
  else {
    api.snapshotValue(med.id).then((snapshot) => {
      if (!painted && snapshot && isToken(token)) paint(snapshot, 'snapshot');
    });
  }

  const refreshButton = $('[data-refresh-detail]');

  const load = async ({ force = false, notify = false } = {}) => {
    if (refreshButton) ui.setButtonLoading(refreshButton, true, 'Consultando…');
    const subtitle = $('#detail-status', main);
    const hadData = painted;
    try {
      const value = await api.fetchComparison(med.id, { fresh: force });
      if (!isToken(token)) return;
      store.saveComparisonCache(med.id, value);
      paint(value, 'live');
      if (notify) ui.toast('Precios actualizados.', { type: 'success' });
    } catch (error) {
      if (!isToken(token)) return;
      if (notify) ui.toast('No pudimos actualizar los precios. Intenta de nuevo.', { type: 'error' });
      if (!hadData) {
        const snapshot = await api.snapshotValue(med.id);
        if (snapshot) {
          paint(snapshot, 'snapshot');
        } else {
          const bestSlot = $('#best-slot', main);
          if (bestSlot) {
            bestSlot.innerHTML = `<div class="best-card"><div class="best-grid"><div><span class="best-label">Sin conexión</span><div class="best-price" style="font-size:clamp(26px,6vw,38px)">No pudimos consultar</div><p class="best-saving-line">Revisa tu conexión e intenta de nuevo. También puedes anotar un precio de tu barrio.</p></div><div class="best-side"><button class="btn btn-primary" type="button" data-retry>${icon(
              'refresh'
            )} Reintentar</button><button class="btn btn-ghost" type="button" data-add-manual>${icon(
              'plus'
            )} Anotar precio de barrio</button></div></div></div>`;
          }
          const offersSlot = $('#offers-slot', main);
          if (offersSlot) {
            offersSlot.innerHTML = `<div class="empty-state"><span class="empty-art">${icon(
              'alert'
            )}</span><strong>Sin precios online</strong><p>No pudimos conectar con las farmacias. Prueba de nuevo en unos segundos.</p><button class="btn btn-ghost btn-sm" type="button" data-retry>Reintentar</button></div>`;
          }
          if (subtitle) {
            subtitle.innerHTML = `<div class="note-strip is-error">${icon(
              'alert'
            )}<span>${h(error.message || 'No pudimos consultar las farmacias.')}</span></div>`;
          }
          main.setAttribute('aria-busy', 'false');
        }
      } else if (subtitle) {
        subtitle.innerHTML = `<div class="note-strip is-error">${icon(
          'alert'
        )}<span>No pudimos actualizar ahora. Se mantienen los precios guardados.</span></div>`;
      }
    } finally {
      if (refreshButton) ui.setButtonLoading(refreshButton, false);
    }
  };

  state.refreshDetail = () => load({ force: true, notify: true });
  state.onManualChange = () => renderManualSlot(main, med);

  const onClick = (event) => {
    const add = event.target.closest('[data-add-manual]');
    if (add) {
      event.preventDefault();
      openManualSheet({ medId: med.id });
      return;
    }
    const remove = event.target.closest('[data-delete-manual]');
    if (remove) {
      event.preventDefault();
      const removed = store.removeManualPrice(remove.dataset.deleteManual);
      if (removed) {
        ui.toast('Precio eliminado.', {
          actionLabel: 'Deshacer',
          onAction: () => store.restoreManualPrice(removed)
        });
      }
      return;
    }
    if (event.target.closest('[data-retry]')) {
      event.preventDefault();
      load({ force: true, notify: true });
    }
  };
  main.addEventListener('click', onClick);
  addCleanup(() => main.removeEventListener('click', onClick));

  load({ force: false });
}

/* ---------- Map ---------- */

function mapSourceCopy(location) {
  if (location.source === 'gps') return 'Estás usando tu GPS.';
  if (location.source === 'manual') return `Usando ${location.label}.`;
  return 'Ves Huechuraba como ejemplo; activa tu GPS o elige tu comuna.';
}

function mapTemplate(location, radius) {
  return `<div class="page map-page">
    <div class="container">
      <div class="section-head">
        <div class="section-title-wrap">
          <span class="section-kicker">Ubicación + OpenStreetMap</span>
          <h1 class="section-title">Farmacias cerca de ti</h1>
          <p class="section-sub">Activa tu ubicación para ordenar las farmacias por distancia. ${h(
            mapSourceCopy(location)
          )}</p>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" id="map-refresh">${icon(
          'refresh'
        )} Actualizar</button>
      </div>
      <div class="map-shell">
        <div id="map" class="map-canvas" aria-label="Mapa de farmacias cercanas"></div>
        <div class="map-controls">
          <button class="map-btn" type="button" id="map-locate">${icon('locate')} Mi ubicación</button>
          <select class="map-select" id="map-radius" aria-label="Distancia para buscar farmacias">
            ${RADIUS_OPTIONS.map(
              (value) =>
                `<option value="${value}" ${value === radius ? 'selected' : ''}>${value / 1000} km</option>`
            ).join('')}
          </select>
        </div>
        <div class="map-status" id="map-status">${icon('clock')}<span>Preparando el mapa…</span></div>
        <div class="map-legend">
          <span><i style="--legend-color:#1665b8"></i>Farmacia</span>
          <span><i style="--legend-color:#b6f04a"></i>Tu precio</span>
        </div>
      </div>

      <section class="map-panel" aria-labelledby="map-count">
        <div class="section-head">
          <div class="section-title-wrap">
            <span class="section-kicker">Ordenadas por distancia</span>
            <h2 class="section-title" id="map-count">Buscando farmacias…</h2>
            <p class="section-sub" id="map-sub">Consulta sobre OpenStreetMap.</p>
          </div>
        </div>
        <div class="filter-chips" role="group" aria-label="Filtrar farmacias">
          <button class="chip" type="button" data-filter="todas" aria-pressed="true">Todas</button>
          <button class="chip" type="button" data-filter="cadenas" aria-pressed="false">${icon(
            'building'
          )} Cadenas</button>
          <button class="chip" type="button" data-filter="barrio" aria-pressed="false">${icon(
            'store'
          )} Barrio</button>
        </div>
        <div class="pharmacy-list" id="pharmacy-list"></div>
      </section>
      <p class="home-footer" style="margin-top:18px">Datos de farmacias: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> (ODbL). Puede faltar alguna farmacia. Si no aparece, anótala igual con “Anotar precio”.</p>
    </div>
  </div>`;
}

function mapPharmacyCard(pharmacy) {
  const chain = chainByKey(pharmacy.chain);
  const address = [pharmacy.address, pharmacy.comuna].filter(Boolean).join(', ');
  return `<article class="ph-card">
    <div class="ph-head">
      <div class="ph-title">
        <div class="ph-name">${chainDot(chain)}<span>${h(pharmacy.name)}</span></div>
        <div class="ph-type">${h(chain.short)} · ${h(
          chain.type === 'cadena' ? 'Cadena' : chain.type === 'barrio' ? 'Barrio' : 'Económica'
        )}</div>
      </div>
      <span class="distance-pill">${h(formatDistance(pharmacy.distance))}</span>
    </div>
    <p class="ph-address">${icon('pin')} <span>${h(address || 'Dirección no disponible')}</span></p>
    <div class="ph-actions">
      <button class="btn-link" type="button" data-map-manual="${h(pharmacy.id)}">${icon(
        'plus'
      )} Anotar precio</button>
      <a class="btn-link" href="${h(directionUrl(pharmacy.lat, pharmacy.lon))}" target="_blank" rel="noopener noreferrer">${icon(
        'navigation'
      )} Cómo llegar</a>
    </div>
  </article>`;
}

function mapEmptyMarkup(location, error) {
  return `<div class="map-empty">
    ${icon('map')}
    <strong>${error ? 'No pudimos cargar el mapa' : 'No hay farmacias en este radio'}</strong>
    <p>${
      error
        ? 'Revisa tu conexión e intenta de nuevo. Tus datos guardados siguen disponibles.'
        : store.hasRealLocation(location)
          ? 'Prueba con un radio más amplio.'
          : 'Prueba con un radio más amplio o activa tu GPS en cualquier comuna de Chile.'
    }</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      <button class="btn btn-ghost btn-sm" type="button" data-map-retry>${icon('refresh')} Reintentar</button>
      ${
        store.hasRealLocation(location)
          ? `<button class="btn btn-soft btn-sm" type="button" data-use-home>Usar Huechuraba</button>`
          : ''
      }
    </div>
  </div>`;
}

function renderMap(main, token) {
  const location = store.getLocation();
  let radius = Number(store.getPref('mapRadius', 5000));
  if (!RADIUS_OPTIONS.includes(radius)) radius = 5000;
  state.mapRadius = radius;
  state.mapFilter = 'todas';
  state.mapLimit = 12;
  state.mapRaw = nearbyData.bundledNearby(location, radius);
  state.mapFetchRadius = 0;
  state.mapSource = state.mapRaw.length ? 'bundled' : 'none';
  state.mapError = null;

  main.innerHTML = mapTemplate(location, radius);
  const mapElement = $('#map', main);
  state.mapInstance = mapElement
    ? mountMap(mapElement, {
        location,
        pharmacies: state.mapRaw,
        manualPharmacies: store.manualPharmacies(),
        radius,
        onManual: (pharmacy) => openManualSheet({ pharmacy })
      })
    : null;

  const statusElement = $('#map-status', main);
  const countElement = $('#map-count', main);
  const subElement = $('#map-sub', main);
  const listElement = $('#pharmacy-list', main);
  const refreshButton = $('#map-refresh', main);
  const radiusSelect = $('#map-radius', main);
  const locateButton = $('#map-locate', main);

  let loadSequence = 0;

  const visiblePharmacies = () => {
    let list = state.mapRaw.filter((pharmacy) => pharmacy.distance <= state.mapRadius / 1000);
    if (state.mapFilter === 'cadenas') list = list.filter((pharmacy) => pharmacy.type === 'cadena');
    else if (state.mapFilter === 'barrio') list = list.filter((pharmacy) => pharmacy.type === 'barrio');
    return list;
  };

  const renderList = (visible, loading) => {
    if (!listElement) return;
    if (!visible.length) {
      listElement.innerHTML = loading
        ? Array.from(
            { length: 3 },
            () =>
              `<article class="ph-card"><div class="skeleton" style="width:52%"></div><div class="skeleton" style="width:76%"></div><div class="skeleton" style="width:40%"></div></article>`
          ).join('')
        : mapEmptyMarkup(location, state.mapError);
      return;
    }

    const limited = visible.slice(0, state.mapLimit);
    const remaining = visible.length - limited.length;
    listElement.innerHTML =
      limited.map((pharmacy) => mapPharmacyCard(pharmacy)).join('') +
      (remaining > 0
        ? `<div class="show-more-row"><button class="btn btn-ghost btn-sm" type="button" data-show-more>Ver ${
            remaining > 12 ? 12 : remaining
          } más</button></div>`
        : '');
  };

  const paint = ({ loading = false } = {}) => {
    const visible = visiblePharmacies();
    state.mapInstance?.update({
      location,
      pharmacies: visible,
      manualPharmacies: store.manualPharmacies(),
      radius: state.mapRadius,
      onManual: (pharmacy) => openManualSheet({ pharmacy })
    });
    if (countElement) {
      countElement.textContent = visible.length
        ? `${visible.length} ${visible.length === 1 ? 'farmacia' : 'farmacias'} cerca`
        : loading
          ? 'Buscando farmacias…'
          : 'Sin farmacias en este radio';
    }
    if (subElement) {
      subElement.textContent = loading
        ? 'Consultando OpenStreetMap…'
        : state.mapError
          ? 'Mostrando datos guardados. No pudimos actualizar ahora.'
          : state.mapSource === 'live'
            ? 'Datos actualizados desde OpenStreetMap.'
            : 'Datos guardados en tu teléfono.';
    }
    renderList(visible, loading);

    if (statusElement) {
      const sourceLabel =
        location.source === 'gps'
          ? 'tu GPS'
          : location.source === 'manual'
            ? location.label
            : 'ref. Huechuraba';
      const text = loading
        ? visible.length
          ? `${visible.length} guardadas · actualizando…`
          : 'Buscando farmacias en OpenStreetMap…'
        : visible.length
          ? `${visible.length} farmacias · ${sourceLabel}${state.mapError ? ' · sin conexión' : ''}`
          : 'Sin farmacias en este radio';
      statusElement.className = `map-status${location.source === 'home' ? ' is-demo' : ''}`;
      statusElement.innerHTML = `${icon(
        loading ? 'refresh' : state.mapError ? 'alert' : 'pin',
        loading ? 'spin' : ''
      )}<span>${h(text)}</span>`;
    }
  };

  const loadLive = async ({ force = false } = {}) => {
    const sequence = ++loadSequence;
    paint({ loading: true });
    try {
      const result = await nearbyData.getNearby(location, state.mapRadius, { force });
      if (!isToken(token) || sequence !== loadSequence) return;
      state.mapRaw = result.pharmacies;
      state.mapFetchRadius = state.mapRadius;
      state.mapSource = result.source;
      state.mapError = result.error || null;
      state.mapMeta = result.meta;
      paint();
      if (result.error) {
        ui.toast('El mapa se actualizó con datos guardados.', { type: 'info' });
      }
    } catch (error) {
      if (!isToken(token) || sequence !== loadSequence) return;
      state.mapError = error;
      if (state.mapRaw.length) {
        paint();
        ui.toast('No pudimos actualizar el mapa. Mostrando datos guardados.', { type: 'error' });
      } else {
        paint();
      }
    }
  };

  paint({ loading: true });
  loadLive();

  locateButton?.addEventListener('click', async () => {
    ui.setButtonLoading(locateButton, true, 'Ubicando…');
    try {
      await store.requestLocation();
      store.setPref('gpsAuto', true);
      ui.toast('Ubicación actualizada.', { type: 'success' });
      renderRoute();
    } catch (error) {
      if (/permiso/i.test(error.message)) store.setPref('gpsAuto', false);
      ui.toast(error.message, { type: 'error', duration: 6500 });
      ui.setButtonLoading(locateButton, false);
    }
  });

  refreshButton?.addEventListener('click', async () => {
    ui.setButtonLoading(refreshButton, true, 'Actualizando…');
    await loadLive({ force: true });
    ui.setButtonLoading(refreshButton, false);
  });

  radiusSelect?.addEventListener('change', () => {
    state.mapRadius = Number(radiusSelect.value);
    store.setPref('mapRadius', state.mapRadius);
    state.mapLimit = 12;
    if (state.mapRaw.length && state.mapFetchRadius >= state.mapRadius) {
      paint();
    } else {
      loadLive();
    }
  });

  for (const chip of $$('.filter-chips .chip', main)) {
    chip.addEventListener('click', () => {
      state.mapFilter = chip.dataset.filter;
      state.mapLimit = 12;
      for (const other of $$('.filter-chips .chip', main)) {
        other.setAttribute('aria-pressed', other === chip ? 'true' : 'false');
      }
      paint();
    });
  }

  state.onManualChange = () => {
    state.mapInstance?.update({ manualPharmacies: store.manualPharmacies() });
  };

  const onClick = (event) => {
    const manualButton = event.target.closest('[data-map-manual]');
    if (manualButton) {
      const pharmacy = state.mapRaw.find((item) => item.id === manualButton.dataset.mapManual);
      if (pharmacy) openManualSheet({ pharmacy });
      return;
    }
    if (event.target.closest('[data-show-more]')) {
      state.mapLimit += 12;
      paint();
      return;
    }
    if (event.target.closest('[data-map-retry]')) {
      loadLive({ force: true });
      return;
    }
    if (event.target.closest('[data-use-home]')) {
      store.useHomeLocation();
      renderRoute();
    }
  };
  main.addEventListener('click', onClick);
  addCleanup(() => main.removeEventListener('click', onClick));
  addCleanup(() => {
    state.mapInstance?.destroy();
    state.mapInstance = null;
  });
}

/* ---------- Manual prices page ---------- */

function pricesTemplate() {
  return `<div class="page prices-page">
    <div class="container">
      <div class="prices-head">
        <div class="section-title-wrap">
          <span class="section-kicker">Tu cuaderno de precios</span>
          <h1 class="prices-title">Mis precios</h1>
          <p class="prices-sub">Anota lo que ves en farmacias de barrio y compáralo con los precios online. Todo queda guardado en este teléfono.</p>
        </div>
        <button class="btn btn-primary" type="button" data-add-price-page>${icon('plus')} Anotar precio</button>
      </div>
      <div class="prices-summary" id="prices-summary"></div>
      <div id="prices-body" style="margin-top:14px"></div>
      <p class="home-footer">Tus precios son privados: no se envían a ningún servidor. Si borras los datos del navegador, también se borrarán.</p>
    </div>
  </div>`;
}

function priceCardMarkup(entry) {
  const med = medById(entry.medId);
  const chain = chainByKey(entry.chain);
  const units = entry.units || med?.pack;
  const unit = units ? entry.price / units : null;
  const location = store.getLocation();
  const distance =
    Number.isFinite(entry.lat) && Number.isFinite(entry.lon)
      ? formatDistance(distanceKm(location, entry))
      : '';
  return `<article class="price-card">
    <div class="price-card-top">
      <div class="price-med">
        <strong>${h(med ? `${med.name} ${med.strength}` : `${entry.medName} ${entry.medStrength}`)}</strong>
        <span>${h(med ? `${med.form} · ${med.category}` : 'Medicamento guardado')}</span>
      </div>
      <div class="price-value">${h(formatClp(entry.price))}${
        unit ? `<small>${h(formatUnitPrice(unit))} / ${h(unitNoun(med?.packUnit || 'unidad'))}</small>` : ''
      }</div>
    </div>
    <p class="price-pharmacy">${h(entry.pharmacy)} · ${h(chain.short)}</p>
    ${
      entry.address
        ? `<p class="price-address">${icon('pin')} <span>${h(entry.address)}</span></p>`
        : ''
    }
    <div class="price-actions">
      <span>${h(String(units || '—'))} ${h(med?.packUnit || 'unidades')}${distance ? ` · ${h(distance)}` : ''} · ${h(
        formatDate(entry.createdAt)
      )}</span>
      <div style="display:flex;align-items:center;gap:6px">
        ${
          med
            ? `<a class="btn-link" href="#/med/${encodeURIComponent(med.id)}">Comparar</a>`
            : ''
        }
        <button class="delete-btn" type="button" data-delete-manual="${h(entry.id)}" aria-label="Eliminar precio de ${h(
          entry.pharmacy
        )}">${icon('trash')}</button>
      </div>
    </div>
  </article>`;
}

function renderPrices(main, token) {
  main.innerHTML = pricesTemplate();
  const body = $('#prices-body', main);
  const summary = $('#prices-summary', main);
  if (!body || !summary) return;

  const paint = () => {
    const scrollY = window.scrollY;
    const list = store.manualPrices();
    const stats = store.manualPharmacyStats();
    summary.innerHTML = `<span class="summary-pill">${icon('tag')} ${stats.prices} ${
      stats.prices === 1 ? 'precio anotado' : 'precios anotados'
    }</span><span class="summary-pill">${icon('store')} ${stats.pharmacies} ${
      stats.pharmacies === 1 ? 'farmacia' : 'farmacias'
    }</span>`;

    if (!list.length) {
      body.innerHTML = `<div class="empty-state">
        <span class="empty-art">${icon('receipt')}</span>
        <strong>Tu cuaderno está vacío</strong>
        <p>La próxima vez que veas un remedio en una farmacia de barrio, anota su precio. Así también entra en la comparación.</p>
        <button class="btn btn-primary" type="button" data-add-price-page>${icon('plus')} Anotar mi primer precio</button>
      </div>`;
    } else {
      body.innerHTML = `<div class="prices-grid">${list.map(priceCardMarkup).join('')}</div>`;
    }
    window.scrollTo({ top: Math.min(scrollY, document.documentElement.scrollHeight), behavior: 'auto' });
  };

  paint();
  state.onManualChange = paint;

  const onClick = (event) => {
    if (event.target.closest('[data-add-price-page]')) {
      event.preventDefault();
      openManualSheet({});
      return;
    }
    const remove = event.target.closest('[data-delete-manual]');
    if (remove) {
      event.preventDefault();
      const removed = store.removeManualPrice(remove.dataset.deleteManual);
      if (removed) {
        ui.toast('Precio eliminado.', {
          actionLabel: 'Deshacer',
          onAction: () => store.restoreManualPrice(removed)
        });
      }
    }
  };
  main.addEventListener('click', onClick);
  addCleanup(() => main.removeEventListener('click', onClick));
}

/* ---------- Info ---------- */

function chainStatusMarkup(key) {
  const chain = chainByKey(key);
  const status =
    chain.live
      ? '<span class="status-pill is-live">En vivo</span>'
      : chain.type === 'barrio'
        ? '<span class="status-pill is-manual">Tu barrio</span>'
        : '<span class="status-pill is-link">Revisar</span>';
  return `<div class="chain-row"><span class="chain-row-name">${chainDot(chain)}<span>${h(
    chain.name
  )}</span></span>${status}</div>`;
}

function installCardMarkup() {
  if (store.isInstalled()) {
    return `<div class="install-card"><div><h2>Ya tienes MediCerca instalada</h2><p>Puedes abrirla desde tu pantalla de inicio como cualquier app.</p></div><span class="summary-pill">${icon(
      'check'
    )} Lista</span></div>`;
  }
  if (state.installPrompt) {
    return `<div class="install-card"><div><h2>Lleva MediCerca en tu bolsillo</h2><p>Instálala para abrirla más rápido y consultar precios con menos datos.</p></div><button class="btn btn-primary" type="button" data-install>${icon(
      'install'
    )} Instalar app</button></div>`;
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<div class="install-card"><div><h2>Instala MediCerca en tu teléfono</h2><p>${
    ios
      ? 'En iPhone: toca Compartir y elige “Añadir a pantalla de inicio”.'
      : 'Abre el menú del navegador y elige “Instalar app” o “Añadir a pantalla de inicio”.'
  }</p></div></div>`;
}

function renderInfo(main, token) {
  main.innerHTML = `<div class="page info-page">
    <div class="container">
      <span class="section-kicker">Transparencia</span>
      <h1 class="info-title">Cómo funciona MediCerca</h1>
      <p class="info-lead">Comparamos precios que las farmacias publican en internet, sumamos los precios de barrio que tú anotas y usamos OpenStreetMap para mostrarte las farmacias cercanas.</p>

      <div class="info-grid">
        <section class="info-card">
          <div class="info-card-head"><span class="info-card-icon">${icon('tag')}</span><h2>Qué comparamos</h2></div>
          <p>Buscamos la misma molécula, dosis y forma farmacéutica. Si la caja cambia de tamaño, ordenamos por precio por unidad para que la comparación sea justa.</p>
          <div class="chain-table">
            ${['ahumada', 'drsimi', 'ecofarmacias', 'araucomed', 'cruzverde', 'salcobrand', 'knop', 'puntofarma']
              .map(chainStatusMarkup)
              .join('')}
          </div>
        </section>

        <section class="info-card">
          <div class="info-card-head"><span class="info-card-icon">${icon('receipt')}</span><h2>De dónde salen los precios</h2></div>
          <ul>
            <li>Ahumada, Dr. Simi, EcoFarmacias y Araucomed: consultamos su tienda online al momento de comparar.</li>
            <li>Cruz Verde, Salcobrand y Knop no publican precios abiertos: te dejamos un enlace para revisarlos tú.</li>
            <li>Farmacias de barrio: el precio lo anotas tú y queda guardado en este teléfono.</li>
            <li>Los precios de internet pueden cambiar al pagar o ser distintos en tienda.</li>
          </ul>
          <p><a class="section-link" href="https://salcobrand.cl/legal_bases/lista-precios" target="_blank" rel="noopener noreferrer">Lista de precios de Salcobrand ${icon(
            'external'
          )}</a></p>
        </section>

        <section class="info-card">
          <div class="info-card-head"><span class="info-card-icon">${icon('map')}</span><h2>Tu ubicación y el mapa</h2></div>
          <p>La ubicación se usa solo para buscar farmacias cercanas. Enviamos las coordenadas a nuestro servicio y a OpenStreetMap para responder la consulta; no guardamos tu ubicación en una base de datos.</p>
          <p>Si no activas el GPS, ves Huechuraba como ejemplo. El mapa incluye farmacias de todo Chile según OpenStreetMap y puede tener locales faltantes o desactualizados.</p>
          <button class="btn btn-ghost btn-sm" type="button" data-location-info>${icon(
            'locate'
          )} Cambiar ubicación</button>
        </section>

        <section class="info-card">
          <div class="info-card-head"><span class="info-card-icon">${icon('shield')}</span><h2>Tus precios son privados</h2></div>
          <p>Los precios de barrio se guardan en el almacenamiento de tu navegador. No los enviamos a ningún servidor ni los compartimos. Si borras los datos del sitio, se eliminan.</p>
          <p>No pedimos cuenta, correo ni datos personales.</p>
        </section>

        <section class="info-card is-wide">
          <div class="info-card-head"><span class="info-card-icon">${icon('spark')}</span><h2>Cómo aprovecharla</h2></div>
          <ul>
            <li>Busca por nombre genérico: paracetamol, omeprazol, losartán, metformina.</li>
            <li>Mira el precio por unidad, no solo el precio de la caja.</li>
            <li>Revisa la sucursal más cercana y confirma stock antes de ir.</li>
            <li>Anota el precio de tu farmacia de barrio para comparar también con ella.</li>
          </ul>
        </section>
      </div>

      ${installCardMarkup()}

      <div class="info-legal">
        <h2>${icon('alert')} Importante</h2>
        <p>MediCerca es un comparador informativo: no vende medicamentos ni reemplaza la evaluación de un profesional de la salud. No suspendas ni cambies un tratamiento por un precio. Los medicamentos con receta requieren receta médica. Verifica siempre el precio, stock y condiciones en la farmacia.</p>
      </div>

      <footer class="info-footer">
        <p>Datos de farmacias: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>, disponibles bajo ODbL. Precios consultados en las tiendas online de cada farmacia.</p>
        <p>MediCerca · actualizado el 21 de noviembre de 2026.</p>
      </footer>
    </div>
  </div>`;

  const installButton = $('[data-install]', main);
  installButton?.addEventListener('click', async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    const choice = await state.installPrompt.userChoice;
    state.installPrompt = null;
    if (choice.outcome === 'accepted') ui.toast('Instalación iniciada.', { type: 'success' });
    renderRoute();
  });
  $('[data-location-info]', main)?.addEventListener('click', openLocationSheet);
}

/* ---------- Manual price sheet ---------- */

function chainOptionsMarkup(selected) {
  return MANUAL_CHAIN_KEYS.map((key) => {
    const chain = chainByKey(key);
    const label =
      key === 'barrio' ? 'Farmacia de barrio / independiente' : chain.name;
    return `<option value="${key}" ${key === selected ? 'selected' : ''}>${h(label)}</option>`;
  }).join('');
}

function manualSheetBody(initialMed, pharmacy) {
  const initialChain = pharmacy?.chain && MANUAL_CHAIN_KEYS.includes(pharmacy.chain) ? pharmacy.chain : 'barrio';
  const hasCoords = pharmacy && Number.isFinite(pharmacy.lat) && Number.isFinite(pharmacy.lon);
  return `<div id="manual-picker" ${initialMed ? 'hidden' : ''}>
      <div class="form-field">
        <label for="manual-med-search">Busca el medicamento</label>
        <div class="search-box">
          ${icon('search')}
          <input class="search-input" id="manual-med-search" type="search" placeholder="Paracetamol, omeprazol…" autocomplete="off" spellcheck="false" data-autofocus />
        </div>
        <p class="field-help">Elige la misma presentación que viste en la farmacia.</p>
      </div>
      <div class="med-picker" id="manual-options"></div>
      <div class="field-error" id="manual-picker-error" role="alert"></div>
    </div>
    <div id="manual-form" ${initialMed ? '' : 'hidden'}>
      <div id="manual-med-box"></div>
      <div class="form-field">
        <label for="manual-pharmacy">Farmacia</label>
        <input class="input" id="manual-pharmacy" type="text" placeholder="Ej: Farmacia San José" value="${h(
          pharmacy?.name || ''
        )}" ${initialMed ? 'data-autofocus' : ''} />
      </div>
      <div class="field-row">
        <div class="form-field">
          <label for="manual-chain">Cadena o tipo</label>
          <select class="select" id="manual-chain">${chainOptionsMarkup(initialChain)}</select>
        </div>
        <div class="form-field">
          <label for="manual-price">Precio</label>
          <div class="input-wrap">
            <span class="input-prefix">$</span>
            <input class="input" id="manual-price" type="text" inputmode="numeric" placeholder="1.490" />
          </div>
          <p class="field-help">Pesos chilenos, sin decimales.</p>
        </div>
      </div>
      <div class="form-field">
        <label for="manual-units">Unidades de la caja</label>
        <input class="input" id="manual-units" type="text" inputmode="numeric" value="${
          initialMed?.pack || ''
        }" />
        <p class="field-help">Se usa para calcular el precio por unidad.</p>
      </div>
      <div class="form-field">
        <label for="manual-address">Dirección o referencia (opcional)</label>
        <input class="input" id="manual-address" type="text" placeholder="Ej: Av. Pedro Fontova 6651" value="${h(
          pharmacy?.address || ''
        )}" />
      </div>
      <button class="gps-btn${hasCoords ? ' is-on' : ''}" id="manual-gps" type="button">
        ${icon(hasCoords ? 'check' : 'locate')} ${hasCoords ? 'Ubicación de la farmacia agregada' : 'Usar mi ubicación'}
      </button>
      <p class="gps-status" id="manual-gps-status">${
        hasCoords ? 'Usaremos la ubicación de esta farmacia en el mapa.' : 'Opcional: sirve para mostrar la distancia.'
      }</p>
      <div class="field-error" id="manual-error" role="alert"></div>
      <p class="sheet-note">Se guarda solo en este teléfono. No enviamos tus precios de barrio a ningún servidor.</p>
    </div>`;
}

function medSelectorMarkup(med) {
  return `<div class="sheet-med">
    <span class="med-icon" style="${categoryStyle(med.category)}">${icon('pill')}</span>
    <div style="min-width:0"><strong>${h(med.name)} ${h(med.strength)}</strong><span>${h(
      med.form
    )} · ${h(med.category)}</span></div>
    <button class="btn-link sheet-med-change" type="button" id="manual-change-med">Cambiar</button>
  </div>`;
}

function openManualSheet({ medId = null, pharmacy = null } = {}) {
  const initialMed = medId ? medById(medId) : null;
  const sheet = ui.openSheet({
    kicker: 'Precio de barrio',
    title: 'Anota un precio',
    sub: 'Guarda lo que viste en la farmacia y compáralo con los precios online.',
    body: manualSheetBody(initialMed, pharmacy),
    footer: `<button class="btn btn-ghost" type="button" data-cancel>Cancelar</button><button class="btn btn-primary" type="button" data-save ${
      initialMed ? '' : 'disabled'
    }>Guardar precio</button>`
  });

  const sheetElement = sheet.sheet;
  const picker = $('#manual-picker', sheetElement);
  const form = $('#manual-form', sheetElement);
  const medSearch = $('#manual-med-search', sheetElement);
  const options = $('#manual-options', sheetElement);
  const medBox = $('#manual-med-box', sheetElement);
  const pharmacyInput = $('#manual-pharmacy', sheetElement);
  const chainSelect = $('#manual-chain', sheetElement);
  const priceInput = $('#manual-price', sheetElement);
  const unitsInput = $('#manual-units', sheetElement);
  const addressInput = $('#manual-address', sheetElement);
  const gpsButton = $('#manual-gps', sheetElement);
  const gpsStatus = $('#manual-gps-status', sheetElement);
  const errorElement = $('#manual-error', sheetElement);
  const pickerError = $('#manual-picker-error', sheetElement);
  const saveButton = sheet.footer?.querySelector('[data-save]');
  const cancelButton = sheet.footer?.querySelector('[data-cancel]');

  let selectedMed = initialMed;
  let coords =
    pharmacy && Number.isFinite(pharmacy.lat) && Number.isFinite(pharmacy.lon)
      ? { lat: pharmacy.lat, lon: pharmacy.lon }
      : null;
  let chainTouched = Boolean(pharmacy?.chain);

  const showError = (message, target = errorElement) => {
    if (target) target.textContent = message;
  };
  const clearErrors = () => {
    if (errorElement) errorElement.textContent = '';
    if (pickerError) pickerError.textContent = '';
  };

  const renderOptions = (query = '') => {
    if (!options) return;
    const list = searchMeds(query, 7);
    options.innerHTML = list.length
      ? list
          .map(
            (med) => `<button class="med-option" type="button" data-pick-med="${med.id}">
        <span class="med-icon" style="${categoryStyle(med.category)}">${icon('pill')}</span>
        <span style="min-width:0"><strong>${h(med.name)} ${h(med.strength)}</strong><span>${h(
          med.form
        )} · ${h(med.category)}</span></span>
      </button>`
          )
          .join('')
      : `<div class="search-empty">No encontramos ese medicamento. Prueba con el nombre genérico.</div>`;
  };

  const chooseMed = (med) => {
    if (!med) return;
    selectedMed = med;
    clearErrors();
    if (picker) picker.hidden = true;
    if (form) form.hidden = false;
    if (medBox) {
      medBox.innerHTML = medSelectorMarkup(med);
      $('#manual-change-med', medBox)?.addEventListener('click', resetMed);
    }
    if (unitsInput) unitsInput.value = String(med.pack || '');
    if (saveButton) saveButton.disabled = false;
    requestAnimationFrame(() => pharmacyInput?.focus({ preventScroll: true }));
  };

  const resetMed = () => {
    selectedMed = null;
    if (picker) picker.hidden = false;
    if (form) form.hidden = true;
    if (saveButton) saveButton.disabled = true;
    renderOptions('');
    requestAnimationFrame(() => medSearch?.focus({ preventScroll: true }));
  };

  if (selectedMed) {
    if (form) form.hidden = false;
    if (picker) picker.hidden = true;
    if (medBox) {
      medBox.innerHTML = medSelectorMarkup(selectedMed);
      $('#manual-change-med', medBox)?.addEventListener('click', resetMed);
    }
  } else {
    renderOptions('');
  }

  medSearch?.addEventListener('input', () => renderOptions(medSearch.value));
  options?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pick-med]');
    if (button) chooseMed(medById(button.dataset.pickMed));
  });

  pharmacyInput?.addEventListener('input', () => {
    if (chainTouched || !chainSelect) return;
    const detected = detectChain(pharmacyInput.value);
    if (MANUAL_CHAIN_KEYS.includes(detected)) chainSelect.value = detected;
  });
  chainSelect?.addEventListener('change', () => {
    chainTouched = true;
  });
  for (const input of [priceInput, unitsInput]) {
    input?.addEventListener('input', () => {
      input.value = input.value.replace(/[^\d]/g, '');
    });
  }

  gpsButton?.addEventListener('click', async () => {
    const idle = gpsButton.innerHTML;
    gpsButton.disabled = true;
    gpsButton.innerHTML = `${icon('locate', 'spin')} Ubicando…`;
    try {
      const location = await store.requestLocation();
      store.setPref('gpsAuto', true);
      coords = { lat: location.lat, lon: location.lon };
      gpsButton.classList.add('is-on');
      gpsButton.innerHTML = `${icon('check')} Ubicación agregada`;
      if (gpsStatus) gpsStatus.textContent = 'Usaremos tu ubicación para calcular la distancia.';
      clearErrors();
    } catch (error) {
      showError(error.message);
      gpsButton.innerHTML = idle;
    } finally {
      gpsButton.disabled = false;
    }
  });

  const save = () => {
    clearErrors();
    if (!selectedMed) {
      showError('Elige un medicamento.', pickerError);
      return;
    }
    const pharmacyName = pharmacyInput?.value.trim() || '';
    if (pharmacyName.length < 2) {
      showError('Escribe el nombre de la farmacia.');
      pharmacyInput?.focus();
      return;
    }
    const price = Number((priceInput?.value || '').replace(/\D/g, ''));
    if (!Number.isFinite(price) || price <= 0) {
      showError('Escribe un precio válido.');
      priceInput?.focus();
      return;
    }
    if (price > 5000000) {
      showError('Ese precio parece demasiado alto. Revísalo.');
      priceInput?.focus();
      return;
    }
    const units = Number((unitsInput?.value || '').replace(/\D/g, '')) || selectedMed.pack;
    if (!units) {
      showError('Indica cuántas unidades trae la caja.');
      unitsInput?.focus();
      return;
    }

    store.addManualPrice({
      medId: selectedMed.id,
      medName: selectedMed.name,
      medStrength: selectedMed.strength,
      pharmacy: pharmacyName,
      chain: chainSelect?.value || 'barrio',
      price,
      units,
      address: addressInput?.value.trim() || '',
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null
    });
    sheet.close();
    ui.toast('Precio guardado. Ya aparece en la comparación.', {
      type: 'success',
      actionLabel: 'Ver comparación',
      onAction: () => routeHash(`/med/${encodeURIComponent(selectedMed.id)}`)
    });
  };

  saveButton?.addEventListener('click', save);
  cancelButton?.addEventListener('click', sheet.close);
  sheetElement.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT') return;
    if (event.target === medSearch && !selectedMed) {
      event.preventDefault();
      const first = options?.querySelector('[data-pick-med]');
      if (first) chooseMed(medById(first.dataset.pickMed));
      return;
    }
    event.preventDefault();
    save();
  });
}

/* ---------- Location sheet ---------- */

function openLocationSheet({ error = '', focusComuna = false, helpOpen = false } = {}) {
  const location = store.getLocation();
  const comunas = nearbyData.comunaOptions();
  const known = store.hasRealLocation(location);
  const title =
    location.source === 'gps'
      ? 'Ubicación GPS activa'
      : location.source === 'manual'
        ? `Comuna: ${location.label}`
        : 'Referencia: Huechuraba';
  const text =
    location.source === 'gps'
      ? 'Ordenaremos las farmacias desde donde estás.'
      : location.source === 'manual'
        ? 'Ordenaremos las farmacias desde el centro de esa comuna.'
        : 'El Sauce 1850, Huechuraba. Es solo un ejemplo: activa tu GPS o elige tu comuna.';
  const body = `<div class="location-status">
      <span class="location-status-icon">${icon(known ? 'locate' : 'pin')}</span>
      <div>
        <strong>${h(title)}</strong>
        <p>${h(text)}</p>
      </div>
    </div>
    <p class="location-perm" id="location-perm"></p>
    <div class="comuna-block">
      <label class="field-label" for="comuna-input">O elige tu comuna</label>
      <div class="comuna-row">
        <input class="input" id="comuna-input" type="text" list="comuna-list" placeholder="Ej: Concepción" autocomplete="off" spellcheck="false" />
        <datalist id="comuna-list">${comunas
          .map((comuna) => `<option value="${h(comuna.name)}"></option>`)
          .join('')}</datalist>
        <button class="btn btn-soft" type="button" data-comuna-use>Usar comuna</button>
      </div>
      <p class="field-error" id="comuna-error" role="alert"></p>
    </div>
    <p class="sheet-note">Usamos tu ubicación solo para buscar farmacias cercanas en OpenStreetMap. No guardamos tu ubicación en una base de datos.</p>
    <details class="gps-help"${helpOpen || error ? ' open' : ''}>
      <summary>No aparece el permiso de ubicación</summary>
      <p>Si abres MediCerca con un acceso directo, el permiso se controla en el navegador: no aparece como permiso de una app.</p>
      <ol>
        <li><strong>Android con Chrome:</strong> toca el candado junto a la dirección → Permisos → Ubicación → Permitir. Luego recarga la página.</li>
        <li>Revisa que la ubicación del teléfono esté encendida en Ajustes → Ubicación.</li>
        <li>Revisa Ajustes → Aplicaciones → Chrome → Permisos → Ubicación → Permitir.</li>
        <li><strong>iPhone:</strong> Ajustes → Privacidad y seguridad → Localización → Safari (o MediCerca) → Permitir.</li>
        <li>Si instalaste MediCerca como app: Ajustes → Aplicaciones → MediCerca → Permisos → Ubicación.</li>
      </ol>
    </details>
    <p class="field-error" id="location-error" role="alert">${h(error)}</p>`;
  const sheet = ui.openSheet({
    kicker: 'Ubicación',
    title: '¿Dónde estás?',
    sub: 'El mapa y las distancias se ordenan desde tu ubicación.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-reference>Usar Huechuraba</button><button class="btn btn-primary" type="button" data-gps>${icon(
      'locate'
    )} Usar mi GPS</button>`
  });
  const gpsButton = sheet.footer?.querySelector('[data-gps]');
  const referenceButton = sheet.footer?.querySelector('[data-reference]');
  const errorElement = $('#location-error', sheet.sheet);
  const permElement = $('#location-perm', sheet.sheet);
  const helpElement = $('.gps-help', sheet.sheet);
  const comunaInput = $('#comuna-input', sheet.sheet);
  const comunaError = $('#comuna-error', sheet.sheet);

  store.geolocationState().then((state) => {
    if (!permElement || !sheet.sheet.isConnected) return;
    if (state === 'denied') {
      permElement.textContent = 'La ubicación está bloqueada en este navegador.';
      permElement.className = 'location-perm is-blocked';
    } else if (state === 'granted') {
      permElement.textContent = 'El navegador ya tiene permiso de ubicación.';
    } else if (state === 'prompt') {
      permElement.textContent = 'El navegador pedirá permiso al usar el GPS.';
    }
  });

  if (comunaInput) {
    if (focusComuna) window.setTimeout(() => comunaInput.focus({ preventScroll: false }), 120);
    comunaInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        useComuna();
      }
    });
  }

  async function useComuna() {
    const value = String(comunaInput?.value || '').trim();
    if (comunaError) comunaError.textContent = '';
    await nearbyData.preloadBundled();
    const comuna = nearbyData.findComuna(value);
    if (!comuna) {
      if (comunaError) {
        comunaError.textContent = value
          ? 'No encontramos esa comuna. Escribe solo el nombre, por ejemplo: Concepción.'
          : 'Escribe tu comuna, por ejemplo: Concepción.';
      }
      return;
    }
    store.setPref('gpsAuto', false);
    store.setManualLocation({ lat: comuna.lat, lon: comuna.lon, label: comuna.name });
    sheet.close();
    ui.toast(`Usando ${comuna.name}.`, { type: 'success' });
    renderRoute();
  }

  $('[data-comuna-use]', sheet.sheet)?.addEventListener('click', useComuna);

  referenceButton?.addEventListener('click', () => {
    store.setPref('gpsAuto', false);
    store.useHomeLocation();
    sheet.close();
    ui.toast('Usando Huechuraba como referencia.', { type: 'success' });
    renderRoute();
  });

  gpsButton?.addEventListener('click', async () => {
    ui.setButtonLoading(gpsButton, true, 'Ubicando…');
    if (errorElement) errorElement.textContent = '';
    try {
      await store.requestLocation();
      store.setPref('gpsAuto', true);
      sheet.close();
      ui.toast('Ubicación actualizada.', { type: 'success' });
      renderRoute();
    } catch (error) {
      if (/permiso/i.test(error.message)) store.setPref('gpsAuto', false);
      if (helpElement) helpElement.open = true;
      if (errorElement) errorElement.textContent = error.message;
      ui.setButtonLoading(gpsButton, false);
    }
  });
}

/* ---------- GPS ---------- */

function gpsAutoEnabled() {
  return store.getPref('gpsAuto', true) !== false;
}

function paintLocationChip() {
  const chip = $('[data-location]');
  if (!chip) return;
  const label = store.locationLabel(store.getLocation());
  chip.setAttribute('aria-label', `Cambiar ubicación: ${label}`);
  chip.innerHTML = `${icon('pin')}<span>${h(label)}</span>`;
}

function refreshAfterLocation() {
  paintLocationChip();
  const callout = $('[data-gps-callout]');
  if (callout && store.hasRealLocation(store.getLocation())) callout.remove();
  const active = document.activeElement;
  const typing =
    (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) ||
    ($('#med-search')?.value.trim() || '') !== '';
  if (typing) {
    if (state.route?.name === 'home') renderNearbyPreview(state.navToken);
    return;
  }
  renderRoute();
}

const GPS_ASK_KEY = 'gpsAskAt';
const GPS_ASK_COOLDOWN = 24 * 60 * 60 * 1000;

let autoLocateStarted = false;

async function autoLocateIfNeeded() {
  if (autoLocateStarted) return;
  autoLocateStarted = true;
  const location = store.getLocation();
  if (location.source === 'gps') {
    refreshGpsQuietly();
    return;
  }
  if (store.hasRealLocation(location) || !gpsAutoEnabled()) return;

  const permission = await store.geolocationState();
  if (permission === 'denied') return;
  const askedAt = Number(store.getPref(GPS_ASK_KEY, 0));
  const recentlyAsked = Number.isFinite(askedAt) && Date.now() - askedAt < GPS_ASK_COOLDOWN;
  if (permission !== 'granted' && !store.isInstalled() && recentlyAsked) return;

  store.setPref(GPS_ASK_KEY, Date.now());
  try {
    await store.requestLocation();
    store.setPref('gpsAuto', true);
    ui.toast('GPS activado. Farmacias ordenadas desde tu ubicación.', { type: 'success' });
    refreshAfterLocation();
  } catch (error) {
    if (/permiso/i.test(error.message)) store.setPref('gpsAuto', false);
  }
}

async function refreshGpsQuietly() {
  const location = store.getLocation();
  if (location.source !== 'gps') return;
  const at = Date.parse(location.at || '');
  const stale = !Number.isFinite(at) || Date.now() - at > 30 * 60 * 1000;
  if (!stale) return;
  if ((await store.geolocationState()) !== 'granted') return;
  try {
    await store.requestLocation();
    refreshAfterLocation();
  } catch {
    /* keep the last known location */
  }
}

function watchForegroundLocation() {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!gpsAutoEnabled()) return;
    const location = store.getLocation();
    if (location.source === 'gps') {
      refreshGpsQuietly();
      return;
    }
    if (store.hasRealLocation(location)) return;
    if ((await store.geolocationState()) === 'granted') {
      try {
        await store.requestLocation();
        refreshAfterLocation();
      } catch {
        /* the banner still offers GPS and comuna */
      }
    }
  });
}

/* ---------- Global ---------- */

function init() {
  window.addEventListener('hashchange', renderRoute);

  window.addEventListener('medicerca:manual', () => {
    updateNav();
    state.onManualChange?.();
  });

  window.addEventListener('offline', () => {
    ui.toast('Sin conexión. Usaremos los últimos precios guardados.', {
      type: 'error',
      duration: 6000
    });
  });
  window.addEventListener('online', () => {
    ui.toast('Conexión recuperada.', { type: 'success' });
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
  });

  nearbyData.preloadBundled();
  setupServiceWorker();
  renderRoute();
  watchForegroundLocation();
  autoLocateIfNeeded();
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const forced = new URLSearchParams(window.location.search).has('sw');
  if (local && !forced) return;

  navigator.serviceWorker
    .register('./sw.js')
    .then((registration) => {
      const notify = () => {
        ui.toast('Hay una versión nueva de MediCerca.', {
          actionLabel: 'Actualizar',
          duration: 15000,
          onAction: () => {
            registration.waiting?.postMessage('SKIP_WAITING');
            navigator.serviceWorker.addEventListener(
              'controllerchange',
              () => window.location.reload(),
              { once: true }
            );
          }
        });
      };
      if (registration.waiting) notify();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) notify();
        });
      });
    })
    .catch(() => {});
}

init();
