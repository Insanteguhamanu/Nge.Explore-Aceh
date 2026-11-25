import {CATEGORIES} from '../data/seedData.js';
import {renderCardArtwork} from '../components/svgArt.js';
import {state, t} from '../state/store.js';
import {escapeHtml, formatCurrency} from '../utils/format.js';

export function renderRecommendGridOnly(container) {
  const grid = container.querySelector('#packageGrid');
  if (!grid) return;

  const interest = state.filters.recoInterest;
  const maxDays = Number(state.filters.recoDays) || 3;
  const budget = Number(state.filters.recoBudget) || 0;

  const matched = state.packages.filter(
    (pkg) =>
      Number(pkg.duration) <= maxDays &&
      Number(pkg.cost) <= budget &&
      (interest === 'all' || (pkg.interests || []).includes(interest))
  );

  if (!matched.length) {
    grid.innerHTML = `<div class="empty-state">${escapeHtml(t('emptyReco'))}</div>`;
    return;
  }

  grid.innerHTML = matched
    .map((pkg, idx) => {
      const placeNames = (pkg.places || [])
        .map((destId) => state.destinations.find((d) => d.id === destId)?.name)
        .filter(Boolean)
        .join(' · ');

      return `
        <article class="card">
          ${renderCardArtwork('highland', `${pkg.duration} ${t('daysUnit')}`, idx, pkg.image, pkg.name)}
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(pkg.name)}</h3>

            <div class="meta-line">
              <span class="tabular-nums">${pkg.duration} ${escapeHtml(t('daysUnit'))}</span>
              <span aria-hidden="true">·</span>
              <span>${escapeHtml((pkg.interests || []).join(' / '))}</span>
            </div>

            <p class="card-desc">${escapeHtml(pkg.description)}</p>

            ${
              placeNames
                ? `<div class="card-specs">${escapeHtml(placeNames)}</div>`
                : ''
            }

            <div class="card-footer">
              <span class="price-label tabular-nums">${formatCurrency(pkg.cost)} ${escapeHtml(t('perPersonEst'))}</span>
              <button
                type="button"
                class="link-action"
                data-action="use-package"
                data-id="${escapeHtml(pkg.id)}"
              >
                ${escapeHtml(t('usePackageBtn'))} &rarr;
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

export function renderRecommendView(container) {
  const {recoInterest, recoDays, recoBudget} = state.filters;

  container.innerHTML = `
    <div class="content-band">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="section-kicker">${escapeHtml(t('recoKicker'))}</p>
            <h1 class="section-title" id="recoHeading">${escapeHtml(t('recoTitle'))}</h1>
            <p class="section-subtitle">${escapeHtml(t('recoSubtitle'))}</p>
          </div>
        </div>

        <div class="panel" style="margin-bottom: 24px;">
          <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); align-items: end;">
            <label class="form-field">
              ${escapeHtml(t('interestLabel'))}
              <select class="field" id="recoInterestSelect">
                <option value="all" ${recoInterest === 'all' ? 'selected' : ''}>${escapeHtml(t('allInterests'))}</option>
                ${CATEGORIES.map(
                  (c) =>
                    `<option value="${escapeHtml(c)}" ${recoInterest === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
                ).join('')}
              </select>
            </label>

            <label class="form-field">
              ${escapeHtml(t('durationLabel'))}
              <select class="field" id="recoDaysSelect">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (n) =>
                      `<option value="${n}" ${Number(recoDays) === n ? 'selected' : ''}>${n} ${escapeHtml(t('daysUnit'))}</option>`
                  )
                  .join('')}
              </select>
            </label>

            <label class="form-field">
              ${escapeHtml(t('totalBudgetLabel'))}
              <input
                class="field tabular-nums"
                id="recoBudgetInput"
                type="number"
                min="0"
                step="100000"
                value="${Number(recoBudget) || 0}"
              />
            </label>

            <div>
              <button type="button" class="btn" id="recoFilterBtn" style="width:100%">
                ${escapeHtml(t('findRecoBtn'))}
              </button>
            </div>
          </div>
        </div>

        <div class="card-grid" id="packageGrid"></div>
      </div>
    </div>
  `;

  renderRecommendGridOnly(container);
}
