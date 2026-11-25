import {REGIONS} from '../data/seedData.js';
import {renderCardArtwork} from '../components/svgArt.js';
import {state, t} from '../state/store.js';
import {buildWhatsAppUrl, escapeHtml, formatCurrency} from '../utils/format.js';

export function renderStayGridOnly(container) {
  const grid = container.querySelector('#stayGrid');
  if (!grid) return;

  const q = state.filters.staySearch.trim().toLowerCase();
  const r = state.filters.stayRegion;

  const list = state.stays.filter((item) => {
    const searchable = `${item.name} ${item.region}`.toLowerCase();
    return (!q || searchable.includes(q)) && (!r || item.region === r);
  });

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">${escapeHtml(t('emptyStay'))}</div>`;
    return;
  }

  grid.innerHTML = list
    .map((item, idx) => {
      const waHref = buildWhatsAppUrl(item.contact, item.name, state.language);
      const facilitiesText = (item.facilities || []).join(' · ') || '-';
      const muslimText = (item.muslim || []).join(' · ') || '-';

      return `
        <article class="card">
          ${renderCardArtwork(item.motif || 'stay', t('navStay'), idx, item.image, item.name)}
          <div class="card-body">
            <div class="card-header">
              <h3 class="card-title">${escapeHtml(item.name)}</h3>
              <span class="status-text status-self">Demo</span>
            </div>

            <div class="meta-line">
              <span>${escapeHtml(item.region)}</span>
              <span aria-hidden="true">·</span>
              <span>${escapeHtml(facilitiesText)}</span>
            </div>

            <p class="card-desc">${escapeHtml(muslimText)}</p>

            <div class="card-footer">
              <span class="price-label tabular-nums">${formatCurrency(item.price)} ${escapeHtml(t('perNight'))}</span>
              <a
                class="link-action"
                href="${escapeHtml(waHref)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${escapeHtml(t('contactStay'))} &#8599;
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

export function renderStaysView(container) {
  const {staySearch, stayRegion} = state.filters;

  container.innerHTML = `
    <div class="content-band">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="section-kicker">${escapeHtml(t('stayKicker'))}</p>
            <h1 class="section-title" id="stayHeading">${escapeHtml(t('stayTitle'))}</h1>
            <p class="section-subtitle">${escapeHtml(t('staySubtitle'))}</p>
          </div>
        </div>

        <div class="toolbar">
          <input
            class="field field-search"
            id="staySearchInput"
            type="search"
            value="${escapeHtml(staySearch)}"
            placeholder="${escapeHtml(t('searchStayPlaceholder'))}"
            aria-label="${escapeHtml(t('searchStayPlaceholder'))}"
          />
          <select class="field" id="stayRegionSelect" aria-label="${escapeHtml(t('allRegions'))}">
            <option value="">${escapeHtml(t('allRegions'))}</option>
            ${REGIONS.map(
              (r) =>
                `<option value="${escapeHtml(r)}" ${stayRegion === r ? 'selected' : ''}>${escapeHtml(r)}</option>`
            ).join('')}
          </select>
        </div>

        <div class="notice" style="margin-bottom: 20px;">${escapeHtml(t('stayNotice'))}</div>

        <div class="card-grid" id="stayGrid"></div>
      </div>
    </div>
  `;

  renderStayGridOnly(container);
}
