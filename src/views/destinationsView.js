import {CATEGORIES, REGIONS} from '../data/seedData.js';
import {mountOpenMap, syncOpenMapMarkers} from '../components/openMap.js';
import {isFavorite, state, t} from '../state/store.js';
import {escapeHtml} from '../utils/format.js';
import {renderDestinationCard} from './sharedCards.js';

export function getFilteredDestinations() {
  const query = state.filters.destSearch.trim().toLowerCase();
  const region = state.filters.destRegion;
  const category = state.filters.destCategory;
  const sort = state.filters.destSort;
  const favOnly = state.filters.destFavOnly;

  const filtered = state.destinations.filter((dest) => {
    const searchable = `${dest.name} ${dest.description} ${dest.descriptionEn || ''} ${dest.region}`.toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesRegion = !region || dest.region === region;
    const matchesCategory = !category || dest.category === category;
    const matchesFav = !favOnly || isFavorite(dest.id, 'destination');
    return matchesQuery && matchesRegion && matchesCategory && matchesFav;
  });

  filtered.sort((a, b) => {
    if (sort === 'cost') return Number(a.cost) - Number(b.cost);
    if (sort === 'costDesc') return Number(b.cost) - Number(a.cost);
    return a.name.localeCompare(b.name);
  });

  return filtered;
}

function updateMarkerCountLabel(container, count) {
  const countEl = container.querySelector('#mapMarkerCount');
  if (countEl) {
    countEl.textContent = `${count} ${t('mapShowingCount')}`;
  }
}

export function renderDestinationsGridOnly(container) {
  const grid = container.querySelector('#destGrid');
  if (!grid) return;
  const list = getFilteredDestinations();
  grid.innerHTML = list.length
    ? list.map((dest, idx) => renderDestinationCard(dest, idx)).join('')
    : `<div class="empty-state">${escapeHtml(t('emptyDest'))}</div>`;

  const shownCount = syncOpenMapMarkers(list, {fitBounds: true});
  updateMarkerCountLabel(container, shownCount);
}

export function renderDestinationsView(container) {
  const {destSearch, destRegion, destCategory, destSort, destFavOnly} = state.filters;

  container.innerHTML = `
    <div class="content-band">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="section-kicker">${escapeHtml(t('destKicker'))}</p>
            <h1 class="section-title" id="destHeading">${escapeHtml(t('destTitle'))}</h1>
            <p class="section-subtitle">${escapeHtml(t('destSubtitle'))}</p>
          </div>
        </div>

        <div class="panel map-panel">
          <h3>${escapeHtml(t('mapTitle'))}</h3>
          <p class="section-subtitle" style="margin-top:0">${escapeHtml(t('mapNote'))}</p>

          <div class="map-toolbar">
            <div class="map-region-focus" role="group" aria-label="${escapeHtml(t('allRegions'))}">
              <button
                type="button"
                class="btn btn-sm ${!destRegion ? '' : 'btn-light'}"
                data-action="map-focus-region"
                data-region=""
              >
                ${escapeHtml(t('allRegions'))}
              </button>
              ${REGIONS.map(
                (r) => `
                <button
                  type="button"
                  class="btn btn-sm ${destRegion === r ? '' : 'btn-light'}"
                  data-action="map-focus-region"
                  data-region="${escapeHtml(r)}"
                >
                  ${escapeHtml(r)}
                </button>
              `
              ).join('')}
            </div>
            <button type="button" class="btn btn-light btn-sm" data-action="map-fit-all">
              ${escapeHtml(t('mapFitAll'))}
            </button>
          </div>

          <div
            class="osm-map-frame"
            id="osmMap"
            tabindex="0"
            role="region"
            aria-label="${escapeHtml(t('mapTitle'))}"
          ></div>

          <div class="map-legend">
            <div class="map-legend-items">
              <span class="legend-item">
                <span class="legend-swatch" style="background:#11786b"></span>
                ${escapeHtml(t('mapLegend1'))}
              </span>
              <span class="legend-item">
                <span class="legend-swatch" style="background:#c6963c"></span>
                ${escapeHtml(t('mapLegend2'))}
              </span>
              <span class="legend-item">
                <span class="legend-swatch" style="background:#073f36"></span>
                ${escapeHtml(t('mapLegend3'))}
              </span>
            </div>
            <span class="tabular-nums" id="mapMarkerCount"></span>
          </div>
        </div>

        <div class="toolbar">
          <input
            class="field field-search"
            id="destSearchInput"
            type="search"
            value="${escapeHtml(destSearch)}"
            placeholder="${escapeHtml(t('searchDestPlaceholder'))}"
            aria-label="${escapeHtml(t('searchDestPlaceholder'))}"
          />
          <select class="field" id="destRegionSelect" aria-label="${escapeHtml(t('allRegions'))}">
            <option value="">${escapeHtml(t('allRegions'))}</option>
            ${REGIONS.map(
              (r) =>
                `<option value="${escapeHtml(r)}" ${destRegion === r ? 'selected' : ''}>${escapeHtml(r)}</option>`
            ).join('')}
          </select>
          <select class="field" id="destCategorySelect" aria-label="${escapeHtml(t('allCategories'))}">
            <option value="">${escapeHtml(t('allCategories'))}</option>
            ${CATEGORIES.map(
              (c) =>
                `<option value="${escapeHtml(c)}" ${destCategory === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
            ).join('')}
          </select>
          <select class="field" id="destSortSelect" aria-label="Urutkan">
            <option value="name" ${destSort === 'name' ? 'selected' : ''}>${escapeHtml(t('sortNameAsc'))}</option>
            <option value="cost" ${destSort === 'cost' ? 'selected' : ''}>${escapeHtml(t('sortCostAsc'))}</option>
            <option value="costDesc" ${destSort === 'costDesc' ? 'selected' : ''}>${escapeHtml(t('sortCostDesc'))}</option>
          </select>
          <button
            type="button"
            class="btn btn-sm ${destFavOnly ? '' : 'btn-light'}"
            id="destFavFilterBtn"
            aria-pressed="${destFavOnly ? 'true' : 'false'}"
          >
            ${escapeHtml(t('onlyFavorites'))} (${state.favorites.length})
          </button>
        </div>

        <div class="card-grid" id="destGrid"></div>
      </div>
    </div>
  `;

  const list = getFilteredDestinations();
  const mapEl = container.querySelector('#osmMap');
  mountOpenMap(mapEl, list);
  renderDestinationsGridOnly(container);
}
