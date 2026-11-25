import 'leaflet/dist/leaflet.css';
import './styles/main.css';

import {closeModal, initModalListeners} from './components/modal.js';
import {
  fitAllMapMarkers,
  focusMapRegion,
  invalidateOpenMapSize,
} from './components/openMap.js';
import {showToast} from './components/toast.js';
import {
  addActivityToDay,
  apiFetch,
  applyPackageToPlanner,
  clearAuthSession,
  deleteSavedTrip,
  getRoleDisplayLabel,
  loadSavedTrip,
  persistLocalPrefs,
  refreshBootstrapStatus,
  removeActivityById,
  resolveValidPage,
  saveCurrentTrip,
  state,
  syncAdminUsersFromServer,
  syncPublicContentFromServer,
  t,
  toggleFavorite,
} from './state/store.js';
import {renderCulinaryView, renderFoodGridOnly} from './views/culinaryView.js';
import {
  renderDestinationsGridOnly,
  renderDestinationsView,
} from './views/destinationsView.js';
import {renderFooter} from './views/footerView.js';
import {renderHomeView} from './views/homeView.js';
import {renderLoginView} from './views/loginView.js';
import {renderPlannerSummaryOnly, renderPlannerView} from './views/plannerView.js';
import {
  renderRecommendGridOnly,
  renderRecommendView,
} from './views/recommendView.js';
import {openDestinationDetailModal} from './views/sharedCards.js';
import {renderStayGridOnly, renderStaysView} from './views/staysView.js';
import {
  openConfirmDeleteModal,
  openConfirmRestoreModal,
  openContentFormModal,
  refreshAdminUsersAndRender,
  renderWorkspaceView,
} from './views/workspaceView.js';

function getPageContainer(page) {
  return document.getElementById(`page-${page}`);
}

function updateHeaderAuthChrome() {
  const workspaceLink = document.getElementById('navWorkspaceLink');
  const authBtn = document.getElementById('headerAuthBtn');
  const user = state.currentUser;

  if (workspaceLink) {
    if (user) {
      workspaceLink.classList.remove('is-hidden');
      if (user.role === 'admin') {
        workspaceLink.textContent = t('navWorkspaceAdmin');
      } else if (user.role === 'operator') {
        workspaceLink.textContent = t('navWorkspaceOperator');
      } else {
        workspaceLink.textContent = t('navWorkspaceUser');
      }
    } else {
      workspaceLink.classList.add('is-hidden');
      workspaceLink.textContent = '';
    }
  }

  if (authBtn) {
    if (user) {
      authBtn.textContent = `${user.name.split(' ')[0]} · ${getRoleDisplayLabel(user.role)}`;
      authBtn.setAttribute('href', '#workspace');
      authBtn.setAttribute('data-route', 'workspace');
      authBtn.classList.remove('btn');
      authBtn.classList.add('lang-switch');
    } else {
      authBtn.textContent = t('navLogin');
      authBtn.setAttribute('href', '#login');
      authBtn.setAttribute('data-route', 'login');
      authBtn.classList.remove('lang-switch');
      authBtn.classList.add('btn', 'btn-sm');
    }
  }
}

function renderActivePage() {
  const page = state.activePage;
  document.querySelectorAll('.page-section').forEach((section) => {
    section.classList.toggle('is-hidden', section.id !== `page-${page}`);
  });

  document.querySelectorAll('.nav-link').forEach((link) => {
    const isActive = link.getAttribute('data-route') === page;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  const container = getPageContainer(page);
  if (!container) return;

  if (page === 'home') renderHomeView(container);
  else if (page === 'destinations') {
    renderDestinationsView(container);
    requestAnimationFrame(() => invalidateOpenMapSize());
  } else if (page === 'culinary') renderCulinaryView(container);
  else if (page === 'stays') renderStaysView(container);
  else if (page === 'planner') renderPlannerView(container);
  else if (page === 'recommend') renderRecommendView(container);
  else if (page === 'login') {
    renderLoginView(container, async () => {
      await refreshBootstrapStatus();
      updateHeaderAuthChrome();
      navigateTo('workspace');
    });
  } else if (page === 'workspace') {
    renderWorkspaceView(container);
  }
}

function updateChromeLanguage() {
  document.documentElement.lang = state.language;

  const skipLink = document.getElementById('skipLink');
  if (skipLink) skipLink.textContent = t('skipLink');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.textContent = t('langBtnText');
    langBtn.setAttribute('aria-label', t('langToggleLabel'));
  }

  updateHeaderAuthChrome();
  renderFooter();
}

function closeMobileNav() {
  const nav = document.getElementById('primaryNav');
  const toggle = document.getElementById('navToggle');
  if (nav && nav.classList.contains('is-open')) {
    nav.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
  }
}

function navigateTo(page, updateHash = true) {
  const validPage = resolveValidPage(page);
  state.activePage = validPage;
  if (updateHash && window.location.hash !== `#${validPage}`) {
    window.location.hash = validPage;
  }
  closeMobileNav();
  renderActivePage();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

async function handleDocumentClick(event) {
  const routeTrigger = event.target.closest('[data-route]');
  if (routeTrigger) {
    event.preventDefault();
    navigateTo(routeTrigger.getAttribute('data-route'));
    return;
  }

  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.getAttribute('data-action');
  const id = actionEl.getAttribute('data-id');

  if (action === 'map-focus-region') {
    const region = actionEl.getAttribute('data-region') || '';
    state.filters.destRegion = region;
    const container = getPageContainer('destinations');
    const regionSelect = container?.querySelector('#destRegionSelect');
    if (regionSelect) regionSelect.value = region;
    container?.querySelectorAll('[data-action="map-focus-region"]').forEach((btn) => {
      const btnRegion = btn.getAttribute('data-region') || '';
      btn.classList.toggle('btn-light', btnRegion !== region);
    });
    renderDestinationsGridOnly(container);
    if (region) {
      focusMapRegion(region);
    } else {
      fitAllMapMarkers();
    }
    return;
  }

  if (action === 'map-fit-all') {
    fitAllMapMarkers();
    return;
  }

  if (action === 'login-tab') {
    state.loginTab = actionEl.getAttribute('data-tab') || 'signin';
    renderActivePage();
    return;
  }

  if (action === 'logout') {
    clearAuthSession();
    updateHeaderAuthChrome();
    showToast(t('toastLogoutSuccess'));
    navigateTo('home');
    return;
  }

  if (action === 'toggle-fav' && id) {
    const added = toggleFavorite(id, 'destination');
    showToast(added ? t('toastFavAdd') : t('toastFavRemove'));
    if (state.activePage === 'home') {
      renderHomeView(getPageContainer('home'));
    } else if (state.activePage === 'destinations') {
      const container = getPageContainer('destinations');
      const favFilterBtn = container?.querySelector('#destFavFilterBtn');
      if (favFilterBtn) {
        favFilterBtn.textContent = `${t('onlyFavorites')} (${state.favorites.length})`;
      }
      renderDestinationsGridOnly(container);
    }
    return;
  }

  if (action === 'open-dest-detail' && id) {
    openDestinationDetailModal(id);
    return;
  }

  if (action === 'add-dest-to-trip' && id) {
    const nextDay =
      (state.itinerary.length % Math.max(1, Number(state.plannerConfig.days) || 3)) + 1;
    const assignedDay = addActivityToDay(id, nextDay);
    closeModal();
    showToast(`${t('toastAddedDay')} ${assignedDay}`);
    if (state.activePage === 'planner') {
      renderPlannerSummaryOnly(getPageContainer('planner'));
    }
    return;
  }

  if (action === 'remove-activity' && id) {
    removeActivityById(id);
    renderPlannerSummaryOnly(getPageContainer('planner'));
    return;
  }

  if (action === 'save-trip') {
    try {
      await saveCurrentTrip();
      renderPlannerSummaryOnly(getPageContainer('planner'));
      showToast(t('toastTripSaved'));
    } catch (err) {
      showToast(err.message);
    }
    return;
  }

  if (action === 'clear-trip') {
    state.itinerary = [];
    persistLocalPrefs();
    renderPlannerSummaryOnly(getPageContainer('planner'));
    showToast(t('toastTripCleared'));
    return;
  }

  if (action === 'load-saved-trip' && id) {
    if (loadSavedTrip(id)) {
      renderPlannerView(getPageContainer('planner'));
      showToast(t('toastTripLoaded'));
    }
    return;
  }

  if (action === 'load-saved-trip-go' && id) {
    if (loadSavedTrip(id)) {
      showToast(t('toastTripLoaded'));
      navigateTo('planner');
    }
    return;
  }

  if (action === 'delete-saved-trip' && id) {
    try {
      await deleteSavedTrip(id);
      renderPlannerSummaryOnly(getPageContainer('planner'));
      showToast(t('toastTripDeleted'));
    } catch (err) {
      showToast(err.message);
    }
    return;
  }

  if (action === 'use-package' && id) {
    if (applyPackageToPlanner(id)) {
      showToast(t('toastPackageApplied'));
      navigateTo('planner');
    }
    return;
  }

  if (action === 'admin-tab') {
    state.adminType = actionEl.getAttribute('data-type') || 'destinations';
    const wsContainer = getPageContainer('workspace');
    if (state.adminType === 'users' && state.currentUser?.role === 'admin') {
      await refreshAdminUsersAndRender(wsContainer);
    } else {
      renderWorkspaceView(wsContainer);
    }
    return;
  }

  if (action === 'admin-add') {
    openContentFormModal(null, () => renderWorkspaceView(getPageContainer('workspace')));
    return;
  }

  if (action === 'admin-edit' && id) {
    openContentFormModal(id, () => renderWorkspaceView(getPageContainer('workspace')));
    return;
  }

  if (action === 'admin-delete' && id) {
    openConfirmDeleteModal(id, () => renderWorkspaceView(getPageContainer('workspace')));
    return;
  }

  if (action === 'admin-restore') {
    openConfirmRestoreModal(() => renderWorkspaceView(getPageContainer('workspace')));
    return;
  }

  if (action === 'admin-user-toggle' && id) {
    const currentlyActive = actionEl.getAttribute('data-active') === 'true';
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({active: !currentlyActive}),
      });
      await syncAdminUsersFromServer();
      renderWorkspaceView(getPageContainer('workspace'));
      showToast(t('toastUserUpdated'));
    } catch (err) {
      showToast(err.message);
    }
  }
}

async function handleDocumentInputOrChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  // Admin user role selector
  if (
    event.type === 'change' &&
    target.getAttribute('data-action') === 'admin-user-role'
  ) {
    const userId = target.getAttribute('data-id');
    const nextRole = target.value;
    if (userId) {
      try {
        await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          body: JSON.stringify({role: nextRole}),
        });
        await syncAdminUsersFromServer();
        renderWorkspaceView(getPageContainer('workspace'));
        showToast(t('toastUserUpdated'));
      } catch (err) {
        showToast(err.message);
      }
    }
    return;
  }

  // Destinations filters
  if (target.id === 'destSearchInput') {
    state.filters.destSearch = target.value;
    renderDestinationsGridOnly(getPageContainer('destinations'));
    return;
  }
  if (target.id === 'destRegionSelect') {
    state.filters.destRegion = target.value;
    const container = getPageContainer('destinations');
    container?.querySelectorAll('[data-action="map-focus-region"]').forEach((btn) => {
      const btnRegion = btn.getAttribute('data-region') || '';
      btn.classList.toggle('btn-light', btnRegion !== target.value);
    });
    renderDestinationsGridOnly(container);
    return;
  }
  if (target.id === 'destCategorySelect') {
    state.filters.destCategory = target.value;
    renderDestinationsGridOnly(getPageContainer('destinations'));
    return;
  }
  if (target.id === 'destSortSelect') {
    state.filters.destSort = target.value;
    renderDestinationsGridOnly(getPageContainer('destinations'));
    return;
  }

  // Culinary filters
  if (target.id === 'foodSearchInput') {
    state.filters.foodSearch = target.value;
    renderFoodGridOnly(getPageContainer('culinary'));
    return;
  }
  if (target.id === 'foodRegionSelect') {
    state.filters.foodRegion = target.value;
    renderFoodGridOnly(getPageContainer('culinary'));
    return;
  }
  if (target.id === 'foodStatusSelect') {
    state.filters.foodStatus = target.value;
    renderFoodGridOnly(getPageContainer('culinary'));
    return;
  }

  // Stays filters
  if (target.id === 'staySearchInput') {
    state.filters.staySearch = target.value;
    renderStayGridOnly(getPageContainer('stays'));
    return;
  }
  if (target.id === 'stayRegionSelect') {
    state.filters.stayRegion = target.value;
    renderStayGridOnly(getPageContainer('stays'));
    return;
  }

  // Planner inputs
  if (target.id === 'plannerTripName') {
    state.plannerConfig.name = target.value;
    persistLocalPrefs();
    return;
  }
  if (target.id === 'plannerTripDate') {
    state.plannerConfig.date = target.value;
    persistLocalPrefs();
    return;
  }
  if (target.id === 'plannerDays') {
    const newDays = Math.min(5, Math.max(1, Number(target.value) || 3));
    state.plannerConfig.days = newDays;
    if (Number(state.plannerConfig.targetDay) > newDays) {
      state.plannerConfig.targetDay = newDays;
    }
    persistLocalPrefs();
    renderPlannerView(getPageContainer('planner'));
    return;
  }
  if (target.id === 'plannerTravellers') {
    state.plannerConfig.travellers = Math.max(1, Math.min(30, Number(target.value) || 1));
    persistLocalPrefs();
    renderPlannerSummaryOnly(getPageContainer('planner'));
    return;
  }
  if (target.id === 'plannerBudget') {
    state.plannerConfig.budgetPerPerson = Math.max(0, Number(target.value) || 0);
    persistLocalPrefs();
    renderPlannerSummaryOnly(getPageContainer('planner'));
    return;
  }
  if (target.id === 'plannerDestSelect') {
    state.plannerConfig.selectedDestId = target.value;
    persistLocalPrefs();
    return;
  }
  if (target.id === 'plannerTargetDay') {
    state.plannerConfig.targetDay = Number(target.value) || 1;
    persistLocalPrefs();
    return;
  }

  // Recommendation filters
  if (target.id === 'recoInterestSelect') {
    state.filters.recoInterest = target.value;
    renderRecommendGridOnly(getPageContainer('recommend'));
    return;
  }
  if (target.id === 'recoDaysSelect') {
    state.filters.recoDays = Number(target.value) || 3;
    renderRecommendGridOnly(getPageContainer('recommend'));
    return;
  }
  if (target.id === 'recoBudgetInput') {
    state.filters.recoBudget = Math.max(0, Number(target.value) || 0);
    renderRecommendGridOnly(getPageContainer('recommend'));
  }
}

function handleSpecialButtonClicks(event) {
  const target = event.target.closest('button');
  if (!target) return;

  if (target.id === 'destFavFilterBtn') {
    state.filters.destFavOnly = !state.filters.destFavOnly;
    target.classList.toggle('btn-light', !state.filters.destFavOnly);
    target.setAttribute('aria-pressed', state.filters.destFavOnly ? 'true' : 'false');
    renderDestinationsGridOnly(getPageContainer('destinations'));
    return;
  }

  if (target.id === 'plannerAddActivityBtn') {
    const destId = state.plannerConfig.selectedDestId || state.destinations[0]?.id;
    if (!destId) return;
    const assignedDay = addActivityToDay(destId, state.plannerConfig.targetDay);
    renderPlannerSummaryOnly(getPageContainer('planner'));
    showToast(`${t('toastAddedDay')} ${assignedDay}`);
    return;
  }

  if (target.id === 'recoFilterBtn') {
    renderRecommendGridOnly(getPageContainer('recommend'));
  }
}

async function init() {
  initModalListeners();

  const langBtn = document.getElementById('langBtn');
  langBtn?.addEventListener('click', () => {
    state.language = state.language === 'id' ? 'en' : 'id';
    persistLocalPrefs();
    updateChromeLanguage();
    renderActivePage();
    showToast(state.language === 'id' ? t('toastLangId') : t('toastLangEn'));
  });

  const navToggle = document.getElementById('navToggle');
  const primaryNav = document.getElementById('primaryNav');
  navToggle?.addEventListener('click', () => {
    const isOpen = primaryNav?.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('click', handleSpecialButtonClicks);
  document.addEventListener('input', handleDocumentInputOrChange);
  document.addEventListener('change', handleDocumentInputOrChange);

  window.addEventListener('hashchange', () => {
    const nextPage = resolveValidPage(window.location.hash);
    if (nextPage !== state.activePage) {
      navigateTo(nextPage, false);
    }
  });

  state.activePage = resolveValidPage(window.location.hash || 'home');
  updateChromeLanguage();
  renderActivePage();

  await Promise.all([syncPublicContentFromServer(), refreshBootstrapStatus()]);
  updateHeaderAuthChrome();
  renderActivePage();
}

init();
