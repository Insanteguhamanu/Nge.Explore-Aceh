import {showToast} from '../components/toast.js';
import {
  apiFetch,
  getRoleDisplayLabel,
  setAuthSession,
  state,
  syncAdminUsersFromServer,
  syncUserTripsFromServer,
  t,
} from '../state/store.js';
import {escapeHtml} from '../utils/format.js';

function renderPasswordField(name, autocomplete, placeholder) {
  return `
    <label class="form-field">
      <span>${escapeHtml(t('passwordLabel'))}</span>
      <div class="password-input-wrap">
        <input
          class="field"
          name="${escapeHtml(name)}"
          type="password"
          required
          ${name === 'password' && autocomplete !== 'current-password' ? 'minlength="8"' : ''}
          placeholder="${escapeHtml(placeholder)}"
          autocomplete="${escapeHtml(autocomplete)}"
        />
        <button
          type="button"
          class="password-toggle-btn"
          data-action="toggle-password"
          aria-label="${escapeHtml(t('showPasswordLabel'))}"
          aria-pressed="false"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </label>
  `;
}

export function renderLoginView(container, onAuthenticated) {
  const {adminClaimed, operatorClaimed} = state.bootstrapStatus;
  const setupAvailable = !adminClaimed || !operatorClaimed;
  if (state.loginTab === 'setup' && !setupAvailable) {
    state.loginTab = 'signin';
  }

  const unclaimedRoles = [];
  if (!operatorClaimed) unclaimedRoles.push({value: 'operator', label: t('roleLabelOperator')});
  if (!adminClaimed) unclaimedRoles.push({value: 'admin', label: t('roleLabelAdmin')});

  let formMarkup = '';
  if (state.loginTab === 'register') {
    formMarkup = `
      <form id="registerForm" class="auth-form" novalidate>
        <label class="form-field">
          <span>${escapeHtml(t('fullNameLabel'))}</span>
          <input
            class="field"
            name="name"
            type="text"
            required
            minlength="2"
            placeholder="${escapeHtml(t('namePlaceholder'))}"
            autocomplete="name"
          />
        </label>
        <label class="form-field">
          <span>${escapeHtml(t('emailLabel'))}</span>
          <input
            class="field"
            name="email"
            type="email"
            required
            placeholder="${escapeHtml(t('emailPlaceholder'))}"
            autocomplete="email"
          />
        </label>
        ${renderPasswordField('password', 'new-password', t('passwordMinPlaceholder'))}
        <p id="authFormError" class="auth-error is-hidden" role="alert"></p>
        <button type="submit" class="btn auth-submit-btn">${escapeHtml(t('registerBtn'))}</button>
      </form>
    `;
  } else if (state.loginTab === 'setup' && setupAvailable) {
    formMarkup = `
      <form id="setupRoleForm" class="auth-form" novalidate>
        <label class="form-field">
          <span>${escapeHtml(t('roleSelectLabel'))}</span>
          <select class="field" name="role">
            ${unclaimedRoles
              .map(
                (r) => `<option value="${escapeHtml(r.value)}">${escapeHtml(r.label)}</option>`
              )
              .join('')}
          </select>
        </label>
        <label class="form-field">
          <span>${escapeHtml(t('fullNameLabel'))}</span>
          <input
            class="field"
            name="name"
            type="text"
            required
            minlength="2"
            placeholder="${escapeHtml(t('namePlaceholder'))}"
          />
        </label>
        <label class="form-field">
          <span>${escapeHtml(t('emailLabel'))}</span>
          <input
            class="field"
            name="email"
            type="email"
            required
            placeholder="${escapeHtml(t('emailPlaceholder'))}"
          />
        </label>
        ${renderPasswordField('password', 'new-password', t('passwordMinPlaceholder'))}
        <p id="authFormError" class="auth-error is-hidden" role="alert"></p>
        <button type="submit" class="btn auth-submit-btn">${escapeHtml(t('claimRoleBtn'))}</button>
      </form>
    `;
  } else {
    formMarkup = `
      <form id="signInForm" class="auth-form" novalidate>
        <label class="form-field">
          <span>${escapeHtml(t('emailLabel'))}</span>
          <input
            class="field"
            name="email"
            type="text"
            required
            placeholder="${escapeHtml(t('emailPlaceholder'))}"
            autocomplete="username"
          />
        </label>
        ${renderPasswordField('password', 'current-password', t('passwordPlaceholder'))}
        <p id="authFormError" class="auth-error is-hidden" role="alert"></p>
        <button type="submit" class="btn auth-submit-btn">${escapeHtml(t('signInBtn'))}</button>
        ${
          setupAvailable
            ? `<div class="auth-secondary-action">
                <button type="button" class="link-action" data-action="login-tab" data-tab="setup">
                  ${escapeHtml(t('loginTabSetup'))} &rarr;
                </button>
              </div>`
            : ''
        }
      </form>
    `;
  }

  container.innerHTML = `
    <div class="auth-band">
      <div class="container">
        <div class="auth-shell">
          <div class="auth-head">
            <p class="section-kicker">${escapeHtml(t('loginKicker'))}</p>
            <h1 class="section-title" id="loginHeading">${escapeHtml(t('loginTitle'))}</h1>
            <p class="section-subtitle">${escapeHtml(t('loginSubtitle'))}</p>
          </div>

          ${
            setupAvailable
              ? `<div class="notice" style="margin-bottom: 18px;">${escapeHtml(t('setupNotice'))}</div>`
              : ''
          }

          <div class="auth-card">
            <div class="segmented-bar" role="tablist" aria-label="Mode autentikasi">
              <button
                type="button"
                role="tab"
                aria-selected="${state.loginTab === 'signin' ? 'true' : 'false'}"
                class="segmented-btn ${state.loginTab === 'signin' ? 'is-active' : ''}"
                data-action="login-tab"
                data-tab="signin"
              >
                ${escapeHtml(t('loginTabSignIn'))}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected="${state.loginTab === 'register' ? 'true' : 'false'}"
                class="segmented-btn ${state.loginTab === 'register' ? 'is-active' : ''}"
                data-action="login-tab"
                data-tab="register"
              >
                ${escapeHtml(t('loginTabRegister'))}
              </button>
              ${
                setupAvailable
                  ? `<button
                      type="button"
                      role="tab"
                      aria-selected="${state.loginTab === 'setup' ? 'true' : 'false'}"
                      class="segmented-btn ${state.loginTab === 'setup' ? 'is-active' : ''}"
                      data-action="login-tab"
                      data-tab="setup"
                    >
                      ${escapeHtml(t('loginTabSetup'))}
                    </button>`
                  : ''
              }
            </div>

            ${formMarkup}
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-action="toggle-password"]').forEach((toggleBtn) => {
    toggleBtn.addEventListener('click', () => {
      const wrap = toggleBtn.closest('.password-input-wrap');
      const input = wrap?.querySelector('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggleBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
      toggleBtn.setAttribute(
        'aria-label',
        show ? t('hidePasswordLabel') : t('showPasswordLabel')
      );
    });
  });

  const bindAuthSubmit = (formId, endpoint) => {
    const form = container.querySelector(formId);
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorEl = container.querySelector('#authFormError');
      if (errorEl) {
        errorEl.classList.add('is-hidden');
        errorEl.textContent = '';
      }

      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      try {
        const res = await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setAuthSession(res.token, res.user);
        await syncUserTripsFromServer();
        if (res.user?.role === 'admin') {
          await syncAdminUsersFromServer();
        }
        showToast(`${t('toastLoginSuccess')} ${getRoleDisplayLabel(res.user.role)}`);
        if (onAuthenticated) onAuthenticated(res.user);
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('is-hidden');
        }
      }
    });
  };

  bindAuthSubmit('#signInForm', '/api/auth/login');
  bindAuthSubmit('#registerForm', '/api/auth/register');
  bindAuthSubmit('#setupRoleForm', '/api/auth/claim-role');
}
