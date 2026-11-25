import {REGIONS} from '../data/seedData.js';
import {renderCardArtwork} from '../components/svgArt.js';
import {state, t} from '../state/store.js';
import {buildWhatsAppUrl, escapeHtml, formatCurrency} from '../utils/format.js';

function getStatusMeta(status) {
  if (status === 'verified') {
    return {className: 'status-verified', label: t('statusVerified'), symbol: '✓'};
  }
  if (status === 'self') {
    return {className: 'status-self', label: t('statusSelf'), symbol: 'i'};
  }
  return {className: 'status-unverified', label: t('statusUnverified'), symbol: '!'};
}

export function renderFoodGridOnly(container) {
  const grid = container.querySelector('#foodGrid');
  if (!grid) return;

  const q = state.filters.foodSearch.trim().toLowerCase();
  const r = state.filters.foodRegion;
  const s = state.filters.foodStatus;

  const list = state.foods.filter((item) => {
    const searchable = `${item.name} ${item.category} ${item.region}`.toLowerCase();
    return (!q || searchable.includes(q)) && (!r || item.region === r) && (!s || item.status === s);
  });

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">${escapeHtml(t('emptyFood'))}</div>`;
    return;
  }

  grid.innerHTML = list
    .map((item, idx) => {
      const status = getStatusMeta(item.status);
      const waHref = buildWhatsAppUrl(item.contact, item.name, state.language);
      return `
        <article class="card">
          ${renderCardArtwork(item.motif || 'culinary', item.category, idx, item.image, item.name)}
          <div class="card-body">
            <div class="card-header">
              <h3 class="card-title">${escapeHtml(item.name)}</h3>
              <span class="status-text ${status.className}">
                <span aria-hidden="true">[${status.symbol}]</span>
                ${escapeHtml(status.label)}
              </span>
            </div>

            <div class="meta-line">
              <span>${escapeHtml(item.region)}</span>
              <span aria-hidden="true">·</span>
              <span class="tabular-nums">${formatCurrency(item.price)} (${escapeHtml(t('simulationNote'))})</span>
            </div>

            <p class="card-desc">${escapeHtml(item.source)}</p>

            <div class="card-footer">
              <span class="card-specs" style="margin-top:0">${escapeHtml(t('halalStatusLabel'))}: ${escapeHtml(status.label)}</span>
              <a
                class="link-action"
                href="${escapeHtml(waHref)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${escapeHtml(t('contactUmkm'))} &#8599;
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

export function renderCulinaryView(container) {
  const {foodSearch, foodRegion, foodStatus} = state.filters;

  container.innerHTML = `
    <div class="content-band">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="section-kicker">${escapeHtml(t('foodKicker'))}</p>
            <h1 class="section-title" id="foodHeading">${escapeHtml(t('foodTitle'))}</h1>
            <p class="section-subtitle">${escapeHtml(t('foodSubtitle'))}</p>
          </div>
        </div>

        <div class="toolbar">
          <input
            class="field field-search"
            id="foodSearchInput"
            type="search"
            value="${escapeHtml(foodSearch)}"
            placeholder="${escapeHtml(t('searchFoodPlaceholder'))}"
            aria-label="${escapeHtml(t('searchFoodPlaceholder'))}"
          />
          <select class="field" id="foodRegionSelect" aria-label="${escapeHtml(t('allRegions'))}">
            <option value="">${escapeHtml(t('allRegions'))}</option>
            ${REGIONS.map(
              (r) =>
                `<option value="${escapeHtml(r)}" ${foodRegion === r ? 'selected' : ''}>${escapeHtml(r)}</option>`
            ).join('')}
          </select>
          <select class="field" id="foodStatusSelect" aria-label="${escapeHtml(t('allStatus'))}">
            <option value="">${escapeHtml(t('allStatus'))}</option>
            <option value="verified" ${foodStatus === 'verified' ? 'selected' : ''}>${escapeHtml(t('statusVerified'))}</option>
            <option value="unverified" ${foodStatus === 'unverified' ? 'selected' : ''}>${escapeHtml(t('statusUnverified'))}</option>
            <option value="self" ${foodStatus === 'self' ? 'selected' : ''}>${escapeHtml(t('statusSelf'))}</option>
          </select>
        </div>

        <div class="notice" style="margin-bottom: 20px;">${escapeHtml(t('foodNotice'))}</div>

        <div class="card-grid" id="foodGrid"></div>
      </div>
    </div>
  `;

  renderFoodGridOnly(container);
}
