import {CATEGORIES, REGIONS} from '../data/seedData.js';
import {closeModal, openModal} from '../components/modal.js';
import {showToast} from '../components/toast.js';
import {
  apiFetch,
  applyContentPayload,
  getAdminCollection,
  getRoleDisplayLabel,
  state,
  syncAdminUsersFromServer,
  t,
} from '../state/store.js';
import {escapeHtml, formatCurrency} from '../utils/format.js';

function getTabLabel(type) {
  const map = {
    destinations: t('tabDestinations'),
    culinary: t('tabCulinary'),
    stays: t('tabStays'),
    packages: t('tabPackages'),
    users: t('tabUsers'),
  };
  return map[type] || type;
}

function renderRoleHeaderBanner(user, kicker, title, subtitle) {
  return `
    <div class="section-head">
      <div>
        <p class="section-kicker">${escapeHtml(kicker)}</p>
        <h1 class="section-title" id="workspaceHeading">${escapeHtml(title)}</h1>
        <p class="section-subtitle">${escapeHtml(subtitle)}</p>
      </div>
      <div class="row-item" style="padding: 10px 16px;">
        <div>
          <span class="row-item-title">${escapeHtml(user.name)}</span>
          <span class="row-item-sub">${escapeHtml(user.email)} · ${escapeHtml(getRoleDisplayLabel(user.role))}</span>
        </div>
        <button type="button" class="btn btn-light btn-sm" data-action="logout">
          ${escapeHtml(t('navLogout'))}
        </button>
      </div>
    </div>
  `;
}

function renderStandardUserWorkspace(container, user) {
  const favDestinations = state.destinations.filter((d) =>
    state.favorites.some((f) => f.itemId === d.id && f.type === 'destination')
  );

  container.innerHTML = `
    <div class="content-band">
      <div class="container">
        ${renderRoleHeaderBanner(
          user,
          t('userSpaceKicker'),
          t('userSpaceTitle'),
          t('userSpaceSubtitle')
        )}

        <div class="split-grid">
          <div class="panel">
            <h3>${escapeHtml(t('favSummaryTitle'))} (${favDestinations.length})</h3>
            ${
              favDestinations.length
                ? `<div class="stack-list">
                    ${favDestinations
                      .map(
                        (d) => `
                      <div class="row-item">
                        <div>
                          <span class="row-item-title">${escapeHtml(d.name)}</span>
                          <span class="row-item-sub">${escapeHtml(d.region)} · ${escapeHtml(d.category)}</span>
                        </div>
                        <button
                          type="button"
                          class="link-action"
                          data-action="open-dest-detail"
                          data-id="${escapeHtml(d.id)}"
                        >
                          ${escapeHtml(t('detailBtn'))} &rarr;
                        </button>
                      </div>
                    `
                      )
                      .join('')}
                  </div>`
                : `<p class="card-desc" style="margin-top:0">${escapeHtml(t('noFavYet'))}</p>`
            }
          </div>

          <div class="panel">
            <div class="section-head" style="margin-bottom: 14px;">
              <h3 style="margin-bottom:0">${escapeHtml(t('savedTripsTitle'))} (${state.savedTrips.length})</h3>
              <a class="btn btn-sm" href="#planner" data-route="planner">
                ${escapeHtml(t('openPlannerBtn'))}
              </a>
            </div>
            ${
              state.savedTrips.length
                ? `<div class="stack-list">
                    ${state.savedTrips
                      .map(
                        (trip) => `
                      <div class="row-item">
                        <div>
                          <span class="row-item-title">${escapeHtml(trip.name)}</span>
                          <span class="row-item-sub tabular-nums">
                            ${trip.days} ${escapeHtml(t('daysUnit'))} · ${trip.travellers} pax · ${formatCurrency(trip.total)}
                          </span>
                        </div>
                        <button
                          type="button"
                          class="btn btn-light btn-sm"
                          data-action="load-saved-trip-go"
                          data-id="${escapeHtml(trip.id)}"
                        >
                          ${escapeHtml(t('loadTripBtn'))}
                        </button>
                      </div>
                    `
                      )
                      .join('')}
                  </div>`
                : `<p class="card-desc" style="margin-top:0">${escapeHtml(t('noSavedTrips'))}</p>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderUsersManagementList() {
  if (!state.adminUsers.length) {
    return `<div class="empty-state">${escapeHtml(t('noUsersYet'))}</div>`;
  }

  return state.adminUsers
    .map((usr) => {
      const isSelf = usr.id === state.currentUser?.id;
      return `
        <div class="row-item">
          <div>
            <span class="row-item-title">${escapeHtml(usr.name)}</span>
            <span class="row-item-sub">
              ${escapeHtml(usr.email)} ·
              <span class="${usr.active ? 'status-verified' : 'status-unverified'}">
                ${escapeHtml(usr.active ? t('userStatusActive') : t('userStatusInactive'))}
              </span>
            </span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <select
              class="field"
              style="min-height:36px;padding:6px 10px;"
              data-action="admin-user-role"
              data-id="${escapeHtml(usr.id)}"
              ${isSelf ? 'disabled' : ''}
              aria-label="Role untuk ${escapeHtml(usr.name)}"
            >
              <option value="user" ${usr.role === 'user' ? 'selected' : ''}>${escapeHtml(t('roleLabelUser'))}</option>
              <option value="operator" ${usr.role === 'operator' ? 'selected' : ''}>${escapeHtml(t('roleLabelOperator'))}</option>
              <option value="admin" ${usr.role === 'admin' ? 'selected' : ''}>${escapeHtml(t('roleLabelAdmin'))}</option>
            </select>
            <button
              type="button"
              class="btn btn-light btn-sm"
              data-action="admin-user-toggle"
              data-id="${escapeHtml(usr.id)}"
              data-active="${usr.active ? 'true' : 'false'}"
              ${isSelf ? 'disabled' : ''}
            >
              ${escapeHtml(t('toggleActiveBtn'))}
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

export function renderWorkspaceView(container) {
  const user = state.currentUser;
  if (!user) {
    container.innerHTML = `
      <div class="content-band">
        <div class="container">
          <div class="panel" style="max-width: 560px;">
            <p class="section-kicker">${escapeHtml(t('loginKicker'))}</p>
            <h1 class="section-title" id="workspaceHeading" style="margin-bottom: 10px;">
              ${escapeHtml(t('loginTitle'))}
            </h1>
            <p class="card-desc" style="margin-bottom: 20px;">${escapeHtml(t('loginRequiredNotice'))}</p>
            <a class="btn" href="#login" data-route="login">${escapeHtml(t('navLogin'))}</a>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (user.role === 'user') {
    renderStandardUserWorkspace(container, user);
    return;
  }

  const isAdmin = user.role === 'admin';
  const availableTabs = isAdmin
    ? ['destinations', 'culinary', 'stays', 'packages', 'users']
    : ['destinations', 'culinary', 'stays'];

  if (!availableTabs.includes(state.adminType)) {
    state.adminType = 'destinations';
  }

  const isUsersTab = state.adminType === 'users' && isAdmin;
  const items = getAdminCollection(state.adminType);

  container.innerHTML = `
    <div class="content-band">
      <div class="container">
        ${renderRoleHeaderBanner(
          user,
          isAdmin ? t('adminKicker') : t('operatorKicker'),
          isAdmin ? t('adminTitle') : t('operatorTitle'),
          isAdmin ? t('adminSubtitle') : t('operatorSubtitle')
        )}

        <div class="notice" style="margin-bottom: 20px;">
          ${escapeHtml(isAdmin ? t('adminNotice') : t('operatorScopeNotice'))}
        </div>

        <div class="segmented-bar" role="tablist" aria-label="Kategori ruang kerja">
          ${availableTabs
            .map(
              (type) => `
            <button
              type="button"
              role="tab"
              aria-selected="${state.adminType === type ? 'true' : 'false'}"
              class="segmented-btn ${state.adminType === type ? 'is-active' : ''}"
              data-action="admin-tab"
              data-type="${type}"
            >
              ${escapeHtml(getTabLabel(type))}
            </button>
          `
            )
            .join('')}
        </div>

        <div class="panel">
          <div class="section-head" style="margin-bottom: 16px;">
            <h2 style="font-family:var(--font-display);font-size:20px;">
              ${escapeHtml(getTabLabel(state.adminType))} (${items.length})
            </h2>
            ${
              isUsersTab
                ? ''
                : `<div style="display:flex;gap:8px;flex-wrap:wrap">
                    ${
                      isAdmin
                        ? `<button type="button" class="btn btn-light btn-sm" data-action="admin-restore">
                            ${escapeHtml(t('resetSeedBtn'))}
                          </button>`
                        : ''
                    }
                    <button type="button" class="btn btn-sm" data-action="admin-add">
                      + ${escapeHtml(t('addDataBtn'))}
                    </button>
                  </div>`
            }
          </div>

          <div class="stack-list">
            ${
              isUsersTab
                ? renderUsersManagementList()
                : items.length
                  ? items
                      .map((item) => {
                        const sub =
                          state.adminType === 'packages'
                            ? `${item.duration} ${t('daysUnit')} · ${formatCurrency(item.cost)}`
                            : `${item.region || '-'} · ${formatCurrency(item.cost ?? item.price ?? 0)}${
                                state.adminType === 'culinary' ? ` · ${item.status}` : ''
                              }`;
                        return `
                          <div class="row-item">
                            <div>
                              <span class="row-item-title">${escapeHtml(item.name)}</span>
                              <span class="row-item-sub tabular-nums">${escapeHtml(sub)} · ID ${escapeHtml(item.id)}</span>
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap">
                              <button
                                type="button"
                                class="btn btn-light btn-sm"
                                data-action="admin-edit"
                                data-id="${escapeHtml(item.id)}"
                              >
                                ${escapeHtml(t('editBtn'))}
                              </button>
                              ${
                                isAdmin
                                  ? `<button
                                      type="button"
                                      class="btn btn-danger btn-sm"
                                      data-action="admin-delete"
                                      data-id="${escapeHtml(item.id)}"
                                    >
                                      ${escapeHtml(t('deleteBtn'))}
                                    </button>`
                                  : ''
                              }
                            </div>
                          </div>
                        `;
                      })
                      .join('')
                  : `<div class="empty-state">${escapeHtml(t('emptyAdmin'))}</div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

export function openContentFormModal(itemId = null, onSaved) {
  const type = state.adminType;
  const existing = itemId ? getAdminCollection(type).find((x) => x.id === itemId) : null;
  const isEdit = Boolean(existing);

  let fieldsHtml = '';
  if (type === 'destinations') {
    fieldsHtml = `
      <label class="form-field form-field-full">
        Nama destinasi
        <input class="field" name="name" value="${escapeHtml(existing?.name || '')}" required />
      </label>
      <label class="form-field">
        Kategori
        <select class="field" name="category">
          ${CATEGORIES.map(
            (c) =>
              `<option value="${escapeHtml(c)}" ${existing?.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
          ).join('')}
        </select>
      </label>
      <label class="form-field">
        Wilayah
        <select class="field" name="region">
          ${REGIONS.map(
            (r) =>
              `<option value="${escapeHtml(r)}" ${existing?.region === r ? 'selected' : ''}>${escapeHtml(r)}</option>`
          ).join('')}
        </select>
      </label>
      <label class="form-field">
        Estimasi biaya (Rp)
        <input class="field tabular-nums" name="cost" type="number" min="0" value="${Number(existing?.cost ?? 0)}" required />
      </label>
      <label class="form-field">
        Highlight singkat
        <input class="field" name="highlight" value="${escapeHtml(existing?.highlight || '')}" required />
      </label>
      <label class="form-field form-field-full">
        Alamat / lokasi
        <input class="field" name="address" value="${escapeHtml(existing?.address || '')}" required />
      </label>
      <label class="form-field">
        Latitude (opsional)
        <input class="field tabular-nums" name="lat" type="number" step="any" min="-90" max="90" placeholder="5.5536" value="${existing?.lat !== undefined ? escapeHtml(String(existing.lat)) : ''}" />
      </label>
      <label class="form-field">
        Longitude (opsional)
        <input class="field tabular-nums" name="lng" type="number" step="any" min="-180" max="180" placeholder="95.3174" value="${existing?.lng !== undefined ? escapeHtml(String(existing.lng)) : ''}" />
      </label>
      <label class="form-field form-field-full">
        Tautan Google Maps
        <input class="field" name="maps" type="url" value="${escapeHtml(existing?.maps || 'https://www.google.com/maps')}" required />
      </label>
      <label class="form-field form-field-full">
        Deskripsi
        <textarea class="field" name="description" rows="3" required>${escapeHtml(existing?.description || '')}</textarea>
      </label>
    `;
  } else if (type === 'culinary') {
    fieldsHtml = `
      <label class="form-field form-field-full">
        Nama kuliner / produk
        <input class="field" name="name" value="${escapeHtml(existing?.name || '')}" required />
      </label>
      <label class="form-field">
        Kategori
        <input class="field" name="category" value="${escapeHtml(existing?.category || 'Kuliner khas')}" required />
      </label>
      <label class="form-field">
        Wilayah
        <select class="field" name="region">
          ${REGIONS.map(
            (r) =>
              `<option value="${escapeHtml(r)}" ${existing?.region === r ? 'selected' : ''}>${escapeHtml(r)}</option>`
          ).join('')}
        </select>
      </label>
      <label class="form-field">
        Harga estimasi (Rp)
        <input class="field tabular-nums" name="price" type="number" min="0" value="${Number(existing?.price ?? 25000)}" required />
      </label>
      <label class="form-field">
        Status verifikasi halal
        <select class="field" name="status">
          <option value="unverified" ${existing?.status === 'unverified' ? 'selected' : ''}>Belum diverifikasi</option>
          <option value="self" ${existing?.status === 'self' ? 'selected' : ''}>Informasi penyedia</option>
          <option value="verified" ${existing?.status === 'verified' ? 'selected' : ''}>Terverifikasi resmi</option>
        </select>
      </label>
      <label class="form-field form-field-full">
        Sumber informasi
        <input class="field" name="source" value="${escapeHtml(existing?.source || '')}" required />
      </label>
      <label class="form-field form-field-full">
        Nomor kontak (WhatsApp)
        <input class="field" name="contact" value="${escapeHtml(existing?.contact || '+628111000000')}" required />
      </label>
    `;
  } else if (type === 'stays') {
    fieldsHtml = `
      <label class="form-field form-field-full">
        Nama akomodasi
        <input class="field" name="name" value="${escapeHtml(existing?.name || '')}" required />
      </label>
      <label class="form-field">
        Wilayah
        <select class="field" name="region">
          ${REGIONS.map(
            (r) =>
              `<option value="${escapeHtml(r)}" ${existing?.region === r ? 'selected' : ''}>${escapeHtml(r)}</option>`
          ).join('')}
        </select>
      </label>
      <label class="form-field">
        Tarif per malam (Rp)
        <input class="field tabular-nums" name="price" type="number" min="0" value="${Number(existing?.price ?? 250000)}" required />
      </label>
      <label class="form-field form-field-full">
        Nomor kontak (WhatsApp)
        <input class="field" name="contact" value="${escapeHtml(existing?.contact || '+628111200000')}" required />
      </label>
    `;
  } else {
    fieldsHtml = `
      <label class="form-field form-field-full">
        Nama paket wisata
        <input class="field" name="name" value="${escapeHtml(existing?.name || '')}" required />
      </label>
      <label class="form-field">
        Durasi (1–5 hari)
        <input class="field tabular-nums" name="duration" type="number" min="1" max="5" value="${Number(existing?.duration ?? 2)}" required />
      </label>
      <label class="form-field">
        Estimasi biaya (Rp)
        <input class="field tabular-nums" name="cost" type="number" min="0" value="${Number(existing?.cost ?? 750000)}" required />
      </label>
      <label class="form-field form-field-full">
        Deskripsi paket
        <textarea class="field" name="description" rows="3" required>${escapeHtml(existing?.description || '')}</textarea>
      </label>
    `;
  }

  openModal(`
    <div class="modal-kicker">${escapeHtml(getTabLabel(type))}</div>
    <h2 class="modal-title" id="modalTitle">${escapeHtml(isEdit ? t('editBtn') : t('addDataBtn'))}</h2>
    <form id="adminRecordForm" class="form-grid">
      ${fieldsHtml}
      <p id="modalFormError" class="status-text status-unverified is-hidden form-field-full" role="alert"></p>
      <div class="form-field form-field-full" style="margin-top: 8px;">
        <button type="submit" class="btn">${escapeHtml(t('saveDataBtn'))}</button>
      </div>
    </form>
  `);

  const form = document.getElementById('adminRecordForm');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const payload = {...(existing || {})};

    for (const [key, val] of fd.entries()) {
      if (['cost', 'price', 'duration'].includes(key)) {
        payload[key] = Math.max(0, Number(val) || 0);
      } else if (key === 'lat' || key === 'lng') {
        const trimmed = String(val).trim();
        if (trimmed === '') {
          delete payload[key];
        } else {
          const parsedNum = Number(trimmed);
          if (Number.isFinite(parsedNum)) payload[key] = parsedNum;
        }
      } else {
        payload[key] = String(val).trim();
      }
    }

    try {
      const endpoint = isEdit
        ? `/api/content/${encodeURIComponent(type)}/${encodeURIComponent(existing.id)}`
        : `/api/content/${encodeURIComponent(type)}`;
      const res = await apiFetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      applyContentPayload(res.content);
      closeModal();
      showToast(t('toastDataSaved'));
      if (onSaved) onSaved();
    } catch (err) {
      const errEl = document.getElementById('modalFormError');
      if (errEl) {
        errEl.textContent = err.message;
        errEl.classList.remove('is-hidden');
      }
    }
  });
}

export function openConfirmDeleteModal(itemId, onDeleted) {
  openModal(`
    <div class="modal-kicker">${escapeHtml(getTabLabel(state.adminType))}</div>
    <h2 class="modal-title" id="modalTitle">${escapeHtml(t('confirmDeleteTitle'))}</h2>
    <p class="card-desc" style="margin-bottom: 20px;">${escapeHtml(t('confirmDeleteBody'))}</p>
    <div class="detail-actions">
      <button type="button" class="btn btn-light" id="confirmCancelBtn">${escapeHtml(t('cancelBtn'))}</button>
      <button type="button" class="btn btn-danger" id="confirmProceedBtn">${escapeHtml(t('confirmBtn'))}</button>
    </div>
  `);

  document.getElementById('confirmCancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('confirmProceedBtn')?.addEventListener('click', async () => {
    try {
      const res = await apiFetch(
        `/api/content/${encodeURIComponent(state.adminType)}/${encodeURIComponent(itemId)}`,
        {method: 'DELETE'}
      );
      applyContentPayload(res.content);
      closeModal();
      showToast(t('toastDataDeleted'));
      if (onDeleted) onDeleted();
    } catch (err) {
      closeModal();
      showToast(err.message);
    }
  });
}

export function openConfirmRestoreModal(onRestored) {
  openModal(`
    <div class="modal-kicker">${escapeHtml(t('adminKicker'))}</div>
    <h2 class="modal-title" id="modalTitle">${escapeHtml(t('confirmResetTitle'))}</h2>
    <p class="card-desc" style="margin-bottom: 20px;">${escapeHtml(t('confirmResetBody'))}</p>
    <div class="detail-actions">
      <button type="button" class="btn btn-light" id="confirmCancelBtn">${escapeHtml(t('cancelBtn'))}</button>
      <button type="button" class="btn" id="confirmProceedBtn">${escapeHtml(t('confirmBtn'))}</button>
    </div>
  `);

  document.getElementById('confirmCancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('confirmProceedBtn')?.addEventListener('click', async () => {
    try {
      const res = await apiFetch('/api/content/restore', {method: 'POST'});
      applyContentPayload(res.content);
      closeModal();
      showToast(t('toastDataReset'));
      if (onRestored) onRestored();
    } catch (err) {
      closeModal();
      showToast(err.message);
    }
  });
}

export async function refreshAdminUsersAndRender(container) {
  try {
    await syncAdminUsersFromServer();
  } catch (err) {
    showToast(err.message);
  }
  renderWorkspaceView(container);
}
