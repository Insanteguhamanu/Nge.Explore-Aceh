import {t} from '../state/store.js';
import {escapeHtml} from '../utils/format.js';

export function renderFooter() {
  const footer = document.getElementById('siteFooter');
  if (!footer) return;

  footer.innerHTML = `
    <div class="container footer-grid">
      <div>
        <div class="footer-brand">Nge.Explore Aceh</div>
        <p class="footer-copy">${escapeHtml(t('footerDesc'))}</p>
        <div class="footer-links">
          <a href="#home" data-route="home">${escapeHtml(t('navHome'))}</a>
          <a href="#destinations" data-route="destinations">${escapeHtml(t('navDest'))}</a>
          <a href="#culinary" data-route="culinary">${escapeHtml(t('navFood'))}</a>
          <a href="#stays" data-route="stays">${escapeHtml(t('navStay'))}</a>
          <a href="#planner" data-route="planner">${escapeHtml(t('navPlan'))}</a>
          <a href="#recommend" data-route="recommend">${escapeHtml(t('navReco'))}</a>
          <a href="#login" data-route="login">${escapeHtml(t('navLogin'))}</a>
        </div>
      </div>

      <div>
        <strong style="color:#ffffff;font-size:14px;">${escapeHtml(t('footerRespTitle'))}</strong>
        <p class="footer-copy">${escapeHtml(t('footerRespDesc'))}</p>
        <p class="footer-note">${escapeHtml(t('footerCopyright'))}</p>
      </div>
    </div>
  `;
}
