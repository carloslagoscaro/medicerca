import { chainByKey } from '../shared/chains.js';
import { formatDistance } from '../shared/geo.js';
import { directionUrl, escapeHtml, formatClp, icon } from './ui.js';

function popupButton(pharmacy) {
  return `<button class="popup-link is-soft" type="button" data-manual-pharmacy="${escapeHtml(pharmacy.id)}">${icon(
    'plus',
    'icon-sm'
  )} Anotar precio</button>`;
}

function pharmacyPopup(pharmacy) {
  const address = [pharmacy.address, pharmacy.comuna].filter(Boolean).join(', ');
  const distance = Number.isFinite(pharmacy.distance)
    ? ` · ${formatDistance(pharmacy.distance)}`
    : '';
  return `
    <strong class="popup-title">${escapeHtml(pharmacy.name)}</strong>
    <div class="popup-address">${escapeHtml(address || 'Dirección no disponible')}${escapeHtml(distance)}</div>
    <div class="popup-actions">
      <a class="popup-link" href="${escapeHtml(directionUrl(pharmacy.lat, pharmacy.lon))}" target="_blank" rel="noopener noreferrer">${icon(
        'navigation',
        'icon-sm'
      )} Cómo llegar</a>
      ${popupButton(pharmacy)}
    </div>
  `;
}

function manualPopup(group) {
  const address = group.address ? `<div class="popup-address">${escapeHtml(group.address)}</div>` : '';
  const rows = group.entries
    .slice(0, 3)
    .map(
      (entry) =>
        `<div class="popup-address"><strong>${escapeHtml(entry.medName)}</strong> ${escapeHtml(
          entry.medStrength
        )} · ${escapeHtml(formatClp(entry.price))}</div>`
    )
    .join('');
  return `
    <strong class="popup-title">${escapeHtml(group.name)}</strong>
    ${address}
    ${rows}
    <div class="popup-actions">
      <a class="popup-link is-soft" href="#/precios">Ver mis precios</a>
    </div>
  `;
}

function markerIcon(chainKey, manual = false) {
  const chain = chainByKey(chainKey);
  const color = manual ? '#b6f04a' : chain.color;
  return window.L.divIcon({
    className: 'map-pin-wrap',
    html: `<span class="map-pin${manual ? ' is-manual' : ''}" style="--pin:${escapeHtml(color)}">${icon(
      manual ? 'tag' : 'store'
    )}</span>`,
    iconSize: [29, 29],
    iconAnchor: [14, 27],
    popupAnchor: [0, -24]
  });
}

function userIcon() {
  return window.L.divIcon({
    className: 'map-pin-wrap',
    html: '<span class="user-pin"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  });
}

function zoomForRadius(radius) {
  if (radius <= 1200) return 15;
  if (radius <= 3200) return 14;
  if (radius <= 5500) return 13;
  return 12;
}

export function mountMap(container, options) {
  const L = window.L;
  if (!L) {
    container.innerHTML =
      '<div style="padding:24px;text-align:center;font-size:12px;color:#5c6572">No pudimos cargar el mapa. Revisa tu conexión y vuelve a intentar.</div>';
    return null;
  }

  const map = L.map(container, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: window.innerWidth >= 900,
    worldCopyJump: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(map);

  const pharmacyLayer = L.layerGroup().addTo(map);
  const manualLayer = L.layerGroup().addTo(map);
  let lastLocation = null;
  let lastRadius = options.radius || 5000;
  let firstRender = true;
  let currentPharmacies = [];
  let currentManual = [];
  let manualHandler = options.onManual;

  const userMarker = L.marker([options.location.lat, options.location.lon], {
    icon: userIcon(),
    zIndexOffset: 1200,
    keyboard: false,
    title: 'Tu ubicación'
  }).addTo(map);

  userMarker.bindPopup(
    `<strong class="popup-title">${
      options.location.source === 'gps' ? 'Estás aquí' : 'Ubicación de referencia'
    }</strong><div class="popup-address">${
      options.location.source === 'gps'
        ? 'Ubicación entregada por tu teléfono'
        : 'El Sauce 1850, Huechuraba (ejemplo)'
    }</div>`,
    { closeButton: false, maxWidth: 220 }
  );

  function draw() {
    pharmacyLayer.clearLayers();
    manualLayer.clearLayers();

    for (const pharmacy of currentPharmacies) {
      const marker = L.marker([pharmacy.lat, pharmacy.lon], {
        icon: markerIcon(pharmacy.chain),
        title: pharmacy.name,
        riseOnHover: true
      });
      marker.bindPopup(pharmacyPopup(pharmacy), { maxWidth: 250, closeButton: false });
      marker.addTo(pharmacyLayer);
    }

    for (const group of currentManual) {
      if (!Number.isFinite(group.lat) || !Number.isFinite(group.lon)) continue;
      const marker = L.marker([group.lat, group.lon], {
        icon: markerIcon(group.chain, true),
        title: group.name,
        riseOnHover: true,
        zIndexOffset: 300
      });
      marker.bindPopup(manualPopup(group), { maxWidth: 240, closeButton: false });
      marker.addTo(manualLayer);
    }
  }

  function update(next = {}) {
    if (next.location) {
      options.location = next.location;
      const { lat, lon } = next.location;
      userMarker.setLatLng([lat, lon]);
      userMarker.setPopupContent(
        `<strong class="popup-title">${
          next.location.source === 'gps' ? 'Estás aquí' : 'Ubicación de referencia'
        }</strong><div class="popup-address">${
          next.location.source === 'gps'
            ? 'Ubicación entregada por tu teléfono'
            : 'El Sauce 1850, Huechuraba (ejemplo)'
        }</div>`
      );
      const moved =
        !lastLocation || Math.abs(lastLocation.lat - lat) > 0.0002 || Math.abs(lastLocation.lon - lon) > 0.0002;
      if (moved) {
        map.setView([lat, lon], zoomForRadius(next.radius || 5000));
        lastLocation = { lat, lon };
      }
    }
    if (next.pharmacies) currentPharmacies = next.pharmacies;
    if (next.manualPharmacies) currentManual = next.manualPharmacies;
    if (next.onManual) manualHandler = next.onManual;
    if (next.radius && (firstRender || next.radius !== lastRadius)) {
      map.setView([options.location.lat, options.location.lon], zoomForRadius(next.radius));
      lastRadius = next.radius;
    }
    draw();
    if (firstRender) {
      firstRender = false;
      window.setTimeout(() => map.invalidateSize(), 120);
    }
  }

  map.on('popupopen', (event) => {
    const popupElement = event.popup.getElement();
    if (!popupElement) return;
    L.DomEvent.disableClickPropagation(popupElement);
    const button = popupElement.querySelector('[data-manual-pharmacy]');
    if (!button) return;
    button.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      const pharmacy = currentPharmacies.find((item) => item.id === button.dataset.manualPharmacy);
      if (!pharmacy) return;
      map.closePopup();
      manualHandler?.(pharmacy);
    });
  });

  update({ ...options, radius: options.radius || 5000 });

  return {
    map,
    update,
    destroy() {
      map.remove();
    }
  };
}
