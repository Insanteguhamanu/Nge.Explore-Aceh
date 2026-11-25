import {renderCardArtwork} from '../components/svgArt.js';
import {openModal} from '../components/modal.js';
import {isFavorite, state, t} from '../state/store.js';
import {escapeHtml, formatCurrency} from '../utils/format.js';

function getDestDescription(dest) {
  if (state.language === 'en' && dest.descriptionEn) {
    return dest.descriptionEn;
  }
  return dest.description;
}

export function renderDestinationCard(dest, index) {
  const favored = isFavorite(dest.id, 'destination');
  const prayerInfo = (dest.prayer && dest.prayer[0]) || 'Perlu konfirmasi';
  const costText =
    Number(dest.cost) === 0
      ? t('freeLabel')
      : `${formatCurrency(dest.cost)} ${t('perPersonEst')}`;

  return `
    <article class="card">
      ${renderCardArtwork(dest.motif, dest.category, index, dest.image, dest.name)}
      <div class="card-body">
        <div class="card-header">
          <h3 class="card-title">${escapeHtml(dest.name)}</h3>
          <button
            class="fav-btn ${favored ? 'is-active' : ''}"
            type="button"
            data-action="toggle-fav"
            data-id="${escapeHtml(dest.id)}"
            aria-pressed="${favored ? 'true' : 'false'}"
            aria-label="${escapeHtml(favored ? t('favRemove') : t('favAdd'))}"
            title="${escapeHtml(favored ? t('favRemove') : t('favAdd'))}"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="${favored ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <div class="meta-line">
          <span>${escapeHtml(dest.region)}</span>
          <span aria-hidden="true">·</span>
          <span>${escapeHtml(dest.address || 'Aceh')}</span>
        </div>

        <p class="card-desc">${escapeHtml(getDestDescription(dest))}</p>

        <div class="card-specs">
          <span>${escapeHtml(dest.highlight || dest.category)}</span>
          <span aria-hidden="true"> · </span>
          <span>${escapeHtml(t('prayerLabel'))}: ${escapeHtml(prayerInfo)}</span>
        </div>

        <div class="card-footer">
          <span class="price-label tabular-nums">${escapeHtml(costText)}</span>
          <button
            class="link-action"
            type="button"
            data-action="open-dest-detail"
            data-id="${escapeHtml(dest.id)}"
          >
            ${escapeHtml(t('detailBtn'))} &rarr;
          </button>
        </div>
      </div>
    </article>
  `;
}

export function openDestinationDetailModal(destId) {
  const dest = state.destinations.find((item) => item.id === destId);
  if (!dest) return;

  const facilities = (dest.facilities || []).join(' · ') || '-';
  const prayer = (dest.prayer || []).join(', ') || '-';
  const costText =
    Number(dest.cost) === 0
      ? t('freeLabel')
      : `${formatCurrency(dest.cost)} ${t('perPersonEst')}`;

  const heroMedia = dest.image
    ? `<div class="modal-hero-media">
        <img
          src="${escapeHtml(dest.image)}"
          alt="${escapeHtml(dest.name)}"
          referrerPolicy="no-referrer"
          onerror="this.parentElement.classList.add('is-hidden')"
        />
      </div>`
    : '';

  const lat = Number(dest.lat);
  const lng = Number(dest.lng);
  const hasCoords =
    dest.lat !== undefined &&
    dest.lng !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (lat !== 0 || lng !== 0);
  const coordsLine = hasCoords
    ? `<div><strong>${escapeHtml(t('modalCoords'))}:</strong> <span class="tabular-nums">${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E</span></div>`
    : '';
  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${dest.name}, ${dest.region}, Aceh`)}`;

  openModal(`
    ${heroMedia}
    <div class="modal-kicker">${escapeHtml(dest.category)} · ${escapeHtml(dest.region)}</div>
    <h2 class="modal-title" id="modalTitle">${escapeHtml(dest.name)}</h2>
    <p class="card-desc">${escapeHtml(getDestDescription(dest))}</p>

    <div class="detail-meta-list">
      <div><strong>${escapeHtml(t('modalAddress'))}:</strong> ${escapeHtml(dest.address || '-')}</div>
      ${coordsLine}
      <div><strong>${escapeHtml(t('modalPrayer'))}:</strong> ${escapeHtml(prayer)}</div>
      <div><strong>${escapeHtml(t('modalFacilities'))}:</strong> ${escapeHtml(facilities)}</div>
      <div><strong>${escapeHtml(t('modalCost'))}:</strong> <span class="tabular-nums">${escapeHtml(costText)}</span></div>
    </div>

    <div class="notice">${escapeHtml(t('modalDisclaimer'))}</div>

    <div class="detail-actions">
      <a
        class="btn"
        href="${escapeHtml(osmUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeHtml(t('openOsmBtn'))} &#8599;
      </a>
      <a
        class="btn btn-light"
        href="${escapeHtml(dest.maps || '#')}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeHtml(t('openMapsBtn'))} &#8599;
      </a>
      <button
        class="btn btn-light"
        type="button"
        data-action="add-dest-to-trip"
        data-id="${escapeHtml(dest.id)}"
      >
        ${escapeHtml(t('addDestModalBtn'))}
      </button>
    </div>
  `);
}
