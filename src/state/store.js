import {
  SEED_DEFAULT_ITINERARY,
  SEED_DESTINATIONS,
  SEED_FOODS,
  SEED_PACKAGES,
  SEED_STAYS,
} from '../data/seedData.js';
import {TRANSLATIONS} from '../i18n/translations.js';

const STORAGE_KEYS = {
  favorites: 'nge_favorites',
  itinerary: 'nge_itinerary',
  savedTrips: 'nge_saved_trips',
  plannerConfig: 'nge_planner_config',
  lang: 'nge_lang',
};

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function loadArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cloneData(fallback);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : cloneData(fallback);
  } catch {
    return cloneData(fallback);
  }
}

function loadObject(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {...fallback};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? {...fallback, ...parsed}
      : {...fallback};
  } catch {
    return {...fallback};
  }
}

const VALID_PAGES = new Set([
  'home',
  'destinations',
  'culinary',
  'stays',
  'planner',
  'recommend',
  'login',
  'workspace',
]);

// Security: Auth token is kept strictly in JS memory (never in localStorage or sessionStorage)
let inMemoryAuthToken = null;

export const state = {
  activePage: 'home',
  language: localStorage.getItem(STORAGE_KEYS.lang) === 'en' ? 'en' : 'id',
  currentUser: null,
  bootstrapStatus: {
    adminClaimed: true,
    operatorClaimed: true,
    adminEnvConfigured: false,
    operatorEnvConfigured: false,
  },
  loginTab: 'signin',
  destinations: cloneData(SEED_DESTINATIONS),
  foods: cloneData(SEED_FOODS),
  stays: cloneData(SEED_STAYS),
  packages: cloneData(SEED_PACKAGES),
  adminUsers: [],
  favorites: loadArray(STORAGE_KEYS.favorites, [
    {id: 'seed_fav_1', itemId: 'd1', type: 'destination', addedAt: '2026-01-01T00:00:00.000Z'},
    {id: 'seed_fav_2', itemId: 'd4', type: 'destination', addedAt: '2026-01-01T00:00:00.000Z'},
  ]),
  itinerary: loadArray(STORAGE_KEYS.itinerary, SEED_DEFAULT_ITINERARY),
  savedTrips: loadArray(STORAGE_KEYS.savedTrips, []),
  plannerConfig: loadObject(STORAGE_KEYS.plannerConfig, {
    name: 'Jelajah Aceh',
    date: '',
    days: 3,
    travellers: 2,
    budgetPerPerson: 1500000,
    selectedDestId: 'd1',
    targetDay: 1,
  }),
  filters: {
    destSearch: '',
    destRegion: '',
    destCategory: '',
    destSort: 'name',
    destFavOnly: false,
    foodSearch: '',
    foodRegion: '',
    foodStatus: '',
    staySearch: '',
    stayRegion: '',
    recoInterest: 'all',
    recoDays: 3,
    recoBudget: 3000000,
  },
  adminType: 'destinations',
};

export function t(key) {
  const dict = TRANSLATIONS[state.language] || TRANSLATIONS.id;
  return dict[key] ?? TRANSLATIONS.id[key] ?? key;
}

export function setAuthSession(token, user) {
  inMemoryAuthToken = token || null;
  state.currentUser = user || null;
}

export function clearAuthSession() {
  inMemoryAuthToken = null;
  state.currentUser = null;
  state.adminUsers = [];
  state.savedTrips = loadArray(STORAGE_KEYS.savedTrips, []);
}

export function getAuthToken() {
  return inMemoryAuthToken;
}

export async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (inMemoryAuthToken) {
    headers.Authorization = `Bearer ${inMemoryAuthToken}`;
  }
  const response = await fetch(url, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export async function syncPublicContentFromServer() {
  try {
    const content = await apiFetch('/api/content');
    if (Array.isArray(content.destinations)) state.destinations = content.destinations;
    if (Array.isArray(content.culinary)) state.foods = content.culinary;
    if (Array.isArray(content.stays)) state.stays = content.stays;
    if (Array.isArray(content.packages)) state.packages = content.packages;
  } catch {
    // Keep local seed fallback if offline
  }
}

export async function refreshBootstrapStatus() {
  try {
    state.bootstrapStatus = await apiFetch('/api/auth/bootstrap-status');
  } catch {
    // Ignore transient failure
  }
}

export async function syncUserTripsFromServer() {
  if (!inMemoryAuthToken) return;
  try {
    const data = await apiFetch('/api/user/trips');
    if (Array.isArray(data.trips)) {
      state.savedTrips = data.trips;
    }
  } catch {
    // Ignore
  }
}

export async function syncAdminUsersFromServer() {
  if (!inMemoryAuthToken || state.currentUser?.role !== 'admin') return;
  const data = await apiFetch('/api/admin/users');
  if (Array.isArray(data.users)) {
    state.adminUsers = data.users;
  }
}

export function applyContentPayload(content) {
  if (!content) return;
  if (Array.isArray(content.destinations)) state.destinations = content.destinations;
  if (Array.isArray(content.culinary)) state.foods = content.culinary;
  if (Array.isArray(content.stays)) state.stays = content.stays;
  if (Array.isArray(content.packages)) state.packages = content.packages;
}

export function persistLocalPrefs() {
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(state.favorites));
  localStorage.setItem(STORAGE_KEYS.itinerary, JSON.stringify(state.itinerary));
  if (!inMemoryAuthToken) {
    localStorage.setItem(STORAGE_KEYS.savedTrips, JSON.stringify(state.savedTrips));
  }
  localStorage.setItem(STORAGE_KEYS.plannerConfig, JSON.stringify(state.plannerConfig));
  localStorage.setItem(STORAGE_KEYS.lang, state.language);
}

export function resolveValidPage(candidate) {
  const clean = String(candidate || '').replace(/^#/, '').trim();
  if (clean === 'admin') return 'workspace';
  return VALID_PAGES.has(clean) ? clean : 'home';
}

export function isFavorite(itemId, type = 'destination') {
  return state.favorites.some((fav) => fav.itemId === itemId && fav.type === type);
}

export function toggleFavorite(itemId, type = 'destination') {
  const index = state.favorites.findIndex(
    (fav) => fav.itemId === itemId && fav.type === type
  );
  if (index >= 0) {
    state.favorites.splice(index, 1);
    persistLocalPrefs();
    return false;
  }
  state.favorites.push({
    id: `fav_${Date.now()}`,
    itemId,
    type,
    addedAt: new Date().toISOString(),
  });
  persistLocalPrefs();
  return true;
}

export function addActivityToDay(destinationId, day) {
  const maxDays = Math.min(5, Math.max(1, Number(state.plannerConfig.days) || 3));
  const safeDay = Math.min(maxDays, Math.max(1, Number(day) || 1));
  state.itinerary.push({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    destinationId,
    day: safeDay,
  });
  persistLocalPrefs();
  return safeDay;
}

export function removeActivityById(activityId) {
  state.itinerary = state.itinerary.filter((item) => item.id !== activityId);
  persistLocalPrefs();
}

export async function saveCurrentTrip() {
  const days = Math.min(5, Math.max(1, Number(state.plannerConfig.days) || 3));
  const travellers = Math.max(1, Number(state.plannerConfig.travellers) || 1);
  const total = state.itinerary.reduce((sum, item) => {
    const dest = state.destinations.find((d) => d.id === item.destinationId);
    return sum + (dest ? Number(dest.cost) || 0 : 0) * travellers;
  }, 0);

  const payload = {
    name: state.plannerConfig.name.trim() || 'Jelajah Aceh',
    date: state.plannerConfig.date || '',
    days,
    travellers,
    budgetPerPerson: Number(state.plannerConfig.budgetPerPerson) || 0,
    activities: cloneData(state.itinerary),
  };

  if (inMemoryAuthToken) {
    const res = await apiFetch('/api/user/trips', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.trip) {
      state.savedTrips.unshift(res.trip);
      return res.trip;
    }
  }

  const trip = {
    id: `trip_${Date.now()}`,
    ...payload,
    total,
    savedAt: new Date().toISOString(),
  };

  state.savedTrips.unshift(trip);
  persistLocalPrefs();
  return trip;
}

export function loadSavedTrip(tripId) {
  const trip = state.savedTrips.find((item) => item.id === tripId);
  if (!trip) return false;
  state.plannerConfig.name = trip.name;
  state.plannerConfig.date = trip.date || '';
  state.plannerConfig.days = trip.days;
  state.plannerConfig.travellers = trip.travellers;
  state.plannerConfig.budgetPerPerson = trip.budgetPerPerson ?? 1500000;
  state.itinerary = cloneData(trip.activities || []);
  persistLocalPrefs();
  return true;
}

export async function deleteSavedTrip(tripId) {
  if (inMemoryAuthToken) {
    await apiFetch(`/api/user/trips/${encodeURIComponent(tripId)}`, {
      method: 'DELETE',
    });
  }
  state.savedTrips = state.savedTrips.filter((item) => item.id !== tripId);
  persistLocalPrefs();
}

export function applyPackageToPlanner(packageId) {
  const pkg = state.packages.find((p) => p.id === packageId);
  if (!pkg) return false;
  const duration = Math.min(5, Math.max(1, Number(pkg.duration) || 3));
  state.plannerConfig.name = pkg.name;
  state.plannerConfig.days = duration;
  state.itinerary = (pkg.places || []).map((destId, idx) => ({
    id: `act_${Date.now()}_${idx}`,
    destinationId: destId,
    day: Math.min(duration, idx + 1),
  }));
  persistLocalPrefs();
  return true;
}

export function getAdminCollection(type = state.adminType) {
  if (type === 'destinations') return state.destinations;
  if (type === 'culinary') return state.foods;
  if (type === 'stays') return state.stays;
  if (type === 'packages') return state.packages;
  return state.adminUsers;
}

export function getRoleDisplayLabel(role) {
  if (role === 'admin') return t('roleLabelAdmin');
  if (role === 'operator') return t('roleLabelOperator');
  return t('roleLabelUser');
}
