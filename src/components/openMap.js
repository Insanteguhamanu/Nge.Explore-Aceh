import L from 'leaflet';
import {t} from '../state/store.js';
import {escapeHtml, formatCurrency} from '../utils/format.js';

export const REGION_CENTERS = {
  'Banda Aceh': {lat: 5.554, lng: 95.32, zoom: 13},
  Sabang: {lat: 5.886, lng: 95.28, zoom: 12},
  'Aceh Besar': {lat: 5.38, lng: 95.35, zoom: 10},
  'Aceh Tengah': {lat: 4.62, lng: 96.86, zoom: 12},
  'Bener Meriah': {lat: 4.69, lng: 96.86, zoom: 11},
};

const ACEH_DEFAULT_CENTER = [5.25, 96.05];
const ACEH_DEFAULT_ZOOM = 8;

let mapInstance = null;
let markerLayer = null;
let currentBoundsCoords = [];

function getRegionColor(region) {
  if (region === 'Sabang') return '#c6963c';
  if (region === 'Aceh Tengah' || region === 'Bener Meriah') return '#073f36';
  return '#11786b';
}

function isSafeMediaUrl(url) {
  const raw = String(url ?? '').trim();
  return (
    raw.startsWith('/src/assets/') ||
    raw.startsWith('https://') ||
    raw.startsWith('http://')
  );
}

export function resolveDestCoords(dest) {
  if (!dest) return null;
  const rawLat = dest.lat;
  const rawLng = dest.lng;
  if (
    rawLat !== undefined &&
    rawLat !== null &&
    rawLat !== '' &&
    rawLng !== undefined &&
    rawLng !== null &&
    rawLng !== ''
  ) {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      (lat !== 0 || lng !== 0)
    ) {
      return {lat, lng};
    }
  }
  const fallback = REGION_CENTERS[dest.region];
  return fallback ? {lat: fallback.lat, lng: fallback.lng} : null;
}

function buildPopupHtml(dest, coords) {
  const costText =
    Number(dest.cost) === 0
      ? t('freeLabel')
      : `${formatCurrency(dest.cost)} ${t('perPersonEst')}`;
  const safeImg = isSafeMediaUrl(dest.image) ? dest.image : '';
  const osmUrl = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=15/${coords.lat}/${coords.lng}`;

  return `
    <div class="osm-popup-card">
      ${
        safeImg
          ? `<img class="osm-popup-img" src="${escapeHtml(safeImg)}" alt="${escapeHtml(dest.name)}" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
          : ''
      }
      <div class="osm-popup-meta">${escapeHtml(dest.category)} · ${escapeHtml(dest.region)}</div>
      <h4 class="osm-popup-title">${escapeHtml(dest.name)}</h4>
      <div class="tabular-nums" style="font-size:12px;color:#3f5e56;">${escapeHtml(costText)}</div>
      <div class="osm-popup-actions">
        <button
          type="button"
          class="btn btn-sm"
          data-action="open-dest-detail"
          data-id="${escapeHtml(dest.id)}"
        >
          ${escapeHtml(t('detailBtn'))}
        </button>
        <a
          class="link-action"
          style="font-size:12px;"
          href="${escapeHtml(osmUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          OSM &#8599;
        </a>
      </div>
    </div>
  `;
}

export function mountOpenMap(containerEl, destinations = []) {
  if (!containerEl) return null;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    markerLayer = null;
  }

  mapInstance = L.map(containerEl, {
    center: ACEH_DEFAULT_CENTER,
    zoom: ACEH_DEFAULT_ZOOM,
    scrollWheelZoom: false,
    keyboard: true,
    zoomControl: true,
  });

  const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  });

  const osmTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution:
      'Map data: &copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>, SRTM | Style: &copy; <a href="https://opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a> (CC-BY-SA)',
  });

  osmStandard.addTo(mapInstance);
  L.control
    .layers(
      {
        OpenStreetMap: osmStandard,
        'Topografi (OpenTopoMap)': osmTopo,
      },
      undefined,
      {position: 'topright'}
    )
    .addTo(mapInstance);

  markerLayer = L.layerGroup().addTo(mapInstance);
  syncOpenMapMarkers(destinations, {fitBounds: true});

  requestAnimationFrame(() => {
    mapInstance?.invalidateSize();
  });

  return mapInstance;
}

export function syncOpenMapMarkers(destinations = [], {fitBounds = true} = {}) {
  if (!mapInstance || !markerLayer) return 0;

  markerLayer.clearLayers();
  const boundsCoords = [];

  destinations.forEach((dest) => {
    const coords = resolveDestCoords(dest);
    if (!coords) return;

    const color = getRegionColor(dest.region);
    const icon = L.divIcon({
      className: 'nge-marker-wrapper',
      html: `<div class="nge-marker-pin" style="background:${color}" title="${escapeHtml(dest.name)}"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    });

    const marker = L.marker([coords.lat, coords.lng], {
      icon,
      title: dest.name,
      alt: `${dest.name} (${dest.region})`,
      keyboard: true,
    });

    marker.bindPopup(buildPopupHtml(dest, coords), {
      maxWidth: 270,
    });
    marker.addTo(markerLayer);
    boundsCoords.push([coords.lat, coords.lng]);
  });

  currentBoundsCoords = boundsCoords;

  if (fitBounds) {
    fitAllMapMarkers();
  }

  return boundsCoords.length;
}

export function fitAllMapMarkers() {
  if (!mapInstance) return;
  if (currentBoundsCoords.length === 1) {
    mapInstance.setView(currentBoundsCoords[0], 13, {animate: true});
    return;
  }
  if (currentBoundsCoords.length > 1) {
    mapInstance.fitBounds(currentBoundsCoords, {padding: [36, 36], maxZoom: 14});
    return;
  }
  mapInstance.setView(ACEH_DEFAULT_CENTER, ACEH_DEFAULT_ZOOM, {animate: true});
}

export function focusMapRegion(regionName) {
  if (!mapInstance) return;
  if (!regionName) {
    fitAllMapMarkers();
    return;
  }
  const target = REGION_CENTERS[regionName];
  if (target) {
    mapInstance.setView([target.lat, target.lng], target.zoom, {animate: true});
  } else {
    fitAllMapMarkers();
  }
}

export function invalidateOpenMapSize() {
  if (mapInstance) {
    mapInstance.invalidateSize();
  }
}
