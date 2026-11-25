import {state, t} from '../state/store.js';
import {escapeHtml, formatCurrency} from '../utils/format.js';

export function renderPlannerSummaryOnly(container) {
  const summaryEl = container.querySelector('#plannerSummaryColumn');
  if (!summaryEl) return;

  const days = Math.min(5, Math.max(1, Number(state.plannerConfig.days) || 3));
  const travellers = Math.max(1, Number(state.plannerConfig.travellers) || 1);
  const budgetPerPerson = Math.max(0, Number(state.plannerConfig.budgetPerPerson) || 0);

  const totalCost = state.itinerary.reduce((sum, act) => {
    const dest = state.destinations.find((d) => d.id === act.destinationId);
    return sum + (dest ? Number(dest.cost) || 0 : 0) * travellers;
  }, 0);
  const availableBudget = budgetPerPerson * travellers;
  const isOverBudget = totalCost > availableBudget;

  const daysMarkup = Array.from({length: days}, (_, index) => {
    const dayNumber = index + 1;
    const activities = state.itinerary.filter((act) => act.day === dayNumber);
    return `
      <div class="day-card">
        <h4>${escapeHtml(t('dayLabel'))} ${dayNumber}</h4>
        ${
          activities.length
            ? `<div class="stack-list">
                ${activities
                  .map((act) => {
                    const dest = state.destinations.find((d) => d.id === act.destinationId);
                    if (!dest) return '';
                    return `
                      <div class="row-item">
                        <div>
                          <span class="row-item-title">${escapeHtml(dest.name)}</span>
                          <span class="row-item-sub tabular-nums">
                            ${escapeHtml(dest.region)} · ${formatCurrency(dest.cost)} ${escapeHtml(t('perPersonEst'))}
                          </span>
                        </div>
                        <button
                          type="button"
                          class="link-action"
                          data-action="remove-activity"
                          data-id="${escapeHtml(act.id)}"
                        >
                          ${escapeHtml(t('removeBtn'))}
                        </button>
                      </div>
                    `;
                  })
                  .join('')}
              </div>`
            : `<p class="card-desc" style="margin-top:0">${escapeHtml(t('noActivities'))}</p>`
        }
      </div>
    `;
  }).join('');

  const savedTripsMarkup = state.savedTrips.length
    ? state.savedTrips
        .map(
          (trip) => `
        <div class="row-item">
          <div>
            <span class="row-item-title">${escapeHtml(trip.name)}</span>
            <span class="row-item-sub tabular-nums">
              ${trip.days} ${escapeHtml(t('daysUnit'))} · ${trip.travellers} pax · ${formatCurrency(trip.total)}
              ${trip.date ? ` · ${escapeHtml(trip.date)}` : ''}
            </span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button
              type="button"
              class="btn btn-light btn-sm"
              data-action="load-saved-trip"
              data-id="${escapeHtml(trip.id)}"
            >
              ${escapeHtml(t('loadTripBtn'))}
            </button>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              data-action="delete-saved-trip"
              data-id="${escapeHtml(trip.id)}"
            >
              ${escapeHtml(t('deleteTripBtn'))}
            </button>
          </div>
        </div>
      `
        )
        .join('')
    : `<p class="card-desc" style="margin-top:0">${escapeHtml(t('noSavedTrips'))}</p>`;

  summaryEl.innerHTML = `
    <div class="panel">
      <h3>${escapeHtml(t('tripSummaryTitle'))}</h3>
      <div class="stack-list">${daysMarkup}</div>

      <div class="budget-summary">
        <div>
          <small>${escapeHtml(t('totalEstLabel'))}</small>
          <strong class="tabular-nums">${formatCurrency(totalCost)}</strong>
        </div>
        <div>
          <small>${escapeHtml(t('availableBudgetLabel'))}</small>
          <strong class="tabular-nums">${formatCurrency(availableBudget)}</strong>
        </div>
      </div>

      <p
        class="status-text ${isOverBudget ? 'status-unverified' : 'status-verified'}"
        style="margin-top: 12px; white-space: normal;"
      >
        ${escapeHtml(isOverBudget ? t('budgetOverMsg') : t('budgetOkMsg'))}
      </p>

      <div class="detail-actions">
        <button type="button" class="btn btn-sm" data-action="save-trip">
          ${escapeHtml(t('saveTripBtn'))}
        </button>
        <button type="button" class="btn btn-light btn-sm" data-action="clear-trip">
          ${escapeHtml(t('resetTripBtn'))}
        </button>
      </div>
    </div>

    <div class="panel saved-trips-section">
      <h3>${escapeHtml(t('savedTripsTitle'))}</h3>
      <div class="stack-list">${savedTripsMarkup}</div>
    </div>
  `;
}

export function renderPlannerView(container) {
  const cfg = state.plannerConfig;
  const maxDays = Math.min(5, Math.max(1, Number(cfg.days) || 3));
  const selectedDest =
    state.destinations.some((d) => d.id === cfg.selectedDestId)
      ? cfg.selectedDestId
      : state.destinations[0]?.id || '';

  container.innerHTML = `
    <div class="content-band">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="section-kicker">${escapeHtml(t('planKicker'))}</p>
            <h1 class="section-title" id="plannerHeading">${escapeHtml(t('planTitle'))}</h1>
            <p class="section-subtitle">${escapeHtml(t('planSubtitle'))}</p>
          </div>
        </div>

        <div class="split-grid">
          <div class="panel">
            <h3>${escapeHtml(t('tripDetailsTitle'))}</h3>
            <div class="form-grid">
              <label class="form-field form-field-full">
                ${escapeHtml(t('tripNameLabel'))}
                <input
                  class="field"
                  id="plannerTripName"
                  type="text"
                  value="${escapeHtml(cfg.name)}"
                />
              </label>

              <label class="form-field">
                ${escapeHtml(t('tripDateLabel'))}
                <input
                  class="field"
                  id="plannerTripDate"
                  type="date"
                  value="${escapeHtml(cfg.date)}"
                />
              </label>

              <label class="form-field">
                ${escapeHtml(t('tripDaysLabel'))}
                <select class="field" id="plannerDays">
                  ${[1, 2, 3, 4, 5]
                    .map(
                      (n) =>
                        `<option value="${n}" ${maxDays === n ? 'selected' : ''}>${n} ${escapeHtml(t('daysUnit'))}</option>`
                    )
                    .join('')}
                </select>
              </label>

              <label class="form-field">
                ${escapeHtml(t('travellersLabel'))}
                <input
                  class="field tabular-nums"
                  id="plannerTravellers"
                  type="number"
                  min="1"
                  max="30"
                  value="${Number(cfg.travellers) || 1}"
                />
              </label>

              <label class="form-field">
                ${escapeHtml(t('budgetPerPersonLabel'))}
                <input
                  class="field tabular-nums"
                  id="plannerBudget"
                  type="number"
                  min="0"
                  step="50000"
                  value="${Number(cfg.budgetPerPerson) || 0}"
                />
              </label>

              <label class="form-field">
                ${escapeHtml(t('addDestLabel'))}
                <select class="field" id="plannerDestSelect">
                  ${state.destinations
                    .map(
                      (d) =>
                        `<option value="${escapeHtml(d.id)}" ${selectedDest === d.id ? 'selected' : ''}>${escapeHtml(d.name)} — ${escapeHtml(d.region)}</option>`
                    )
                    .join('')}
                </select>
              </label>

              <label class="form-field">
                ${escapeHtml(t('targetDayLabel'))}
                <select class="field" id="plannerTargetDay">
                  ${Array.from({length: maxDays}, (_, idx) => {
                    const dayNum = idx + 1;
                    const active = Math.min(maxDays, Number(cfg.targetDay) || 1) === dayNum;
                    return `<option value="${dayNum}" ${active ? 'selected' : ''}>${escapeHtml(t('dayLabel'))} ${dayNum}</option>`;
                  }).join('')}
                </select>
              </label>

              <div class="form-field form-field-full">
                <button type="button" class="btn" id="plannerAddActivityBtn">
                  + ${escapeHtml(t('addToItineraryBtn'))}
                </button>
              </div>
            </div>

            <div class="notice" style="margin-top: 18px;">${escapeHtml(t('plannerNotice'))}</div>
          </div>

          <div id="plannerSummaryColumn"></div>
        </div>
      </div>
    </div>
  `;

  renderPlannerSummaryOnly(container);
}
