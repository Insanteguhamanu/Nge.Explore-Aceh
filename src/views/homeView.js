import {CATEGORIES, HERO_IMAGE, REGIONS} from '../data/seedData.js';
import {renderHeroSceneSvg} from '../components/svgArt.js';
import {state, t} from '../state/store.js';
import {escapeHtml} from '../utils/format.js';
import {renderDestinationCard} from './sharedCards.js';

export function renderHomeView(container) {
  const featured = state.destinations.slice(0, 3);
  const points = t('commitmentPoints');

  container.innerHTML = `
    <div class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="hero-origin">${escapeHtml(t('heroOrigin'))}</p>
          <h1 class="hero-title" id="heroTitle">${escapeHtml(t('heroTitle'))}</h1>
          <p class="hero-desc">${escapeHtml(t('heroDesc'))}</p>
          <div class="hero-actions">
            <a class="btn btn-gold" href="#destinations" data-route="destinations">
              ${escapeHtml(t('heroExploreCta'))} &#8599;
            </a>
            <a class="btn btn-outline-light" href="#planner" data-route="planner">
              ${escapeHtml(t('heroPlanCta'))}
            </a>
          </div>
        </div>

        <div class="hero-visual">
          ${renderHeroSceneSvg()}
          <img
            class="hero-visual-img"
            src="${escapeHtml(HERO_IMAGE)}"
            alt="${escapeHtml(t('heroVisualLabel'))}"
            referrerPolicy="no-referrer"
            onerror="this.classList.add('is-hidden')"
          />
          <div class="hero-visual-scrim"></div>
          <div class="hero-visual-caption">
            <span>${escapeHtml(t('heroVisualLabel'))}</span>
            <strong>${escapeHtml(t('heroVisualSub'))}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="container summary-strip-wrap">
      <div class="summary-strip" aria-label="Ringkasan platform">
        <div class="summary-item">
          <strong class="tabular-nums">${state.destinations.length}+</strong>
          <span>${escapeHtml(t('statDestLabel'))}</span>
        </div>
        <div class="summary-item">
          <strong class="tabular-nums">${REGIONS.length}</strong>
          <span>${escapeHtml(t('statRegionLabel'))}</span>
        </div>
        <div class="summary-item">
          <strong class="tabular-nums">${CATEGORIES.length}</strong>
          <span>${escapeHtml(t('statCatLabel'))}</span>
        </div>
        <div class="summary-item">
          <strong class="tabular-nums">1–5</strong>
          <span>${escapeHtml(t('statPlanLabel'))}</span>
        </div>
      </div>
    </div>

    <section class="content-band">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="section-kicker">${escapeHtml(t('featuredKicker'))}</p>
            <h2 class="section-title">${escapeHtml(t('featuredTitle'))}</h2>
            <p class="section-subtitle">${escapeHtml(t('featuredSubtitle'))}</p>
          </div>
          <a class="btn btn-light btn-sm" href="#destinations" data-route="destinations">
            ${escapeHtml(t('viewAll'))} &rarr;
          </a>
        </div>

        <div class="card-grid">
          ${featured.map((dest, idx) => renderDestinationCard(dest, idx)).join('')}
        </div>
      </div>
    </section>

    <section class="content-band content-band-surface">
      <div class="container split-grid">
        <div>
          <p class="section-kicker">${escapeHtml(t('commitmentKicker'))}</p>
          <h2 class="section-title">${escapeHtml(t('commitmentTitle'))}</h2>
          <p class="section-subtitle">${escapeHtml(t('commitmentDesc'))}</p>

          <ul class="principle-list">
            ${points
              .map(
                (pt, i) => `
              <li>
                <strong>0${i + 1}. ${escapeHtml(pt.title)}</strong> — ${escapeHtml(pt.text)}
              </li>
            `
              )
              .join('')}
          </ul>

          <a class="btn" href="#planner" data-route="planner">
            ${escapeHtml(t('startPlanning'))}
          </a>
        </div>

        <div class="panel">
          <h3>${escapeHtml(t('commitmentPanelTitle'))}</h3>
          <p class="card-desc" style="margin-bottom: 16px;">${escapeHtml(t('commitmentPanelBody'))}</p>
          <div class="notice">${escapeHtml(t('commitmentNotice'))}</div>
        </div>
      </div>
    </section>
  `;
}
