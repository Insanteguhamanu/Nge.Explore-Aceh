import {escapeHtml} from '../utils/format.js';

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #275e51 0%, #0f3f36 100%)',
  'linear-gradient(135deg, #2b626c 0%, #133c46 100%)',
  'linear-gradient(135deg, #755b33 0%, #44331a 100%)',
  'linear-gradient(135deg, #1f5c66 0%, #0e3841 100%)',
  'linear-gradient(135deg, #476440 0%, #243b22 100%)',
];

const MOTIF_SVGS = {
  mosque:
    '<path d="M12 34h40M16 34V22c0-5 7-9 16-14 9 5 16 9 16 14v12M26 34v-8a6 6 0 0 1 12 0v8M32 4v4" />',
  museum:
    '<path d="M12 40h40M16 40V22M26 40V22M38 40V22M48 40V22M10 22h44L32 10 10 22Z" />',
  memorial:
    '<path d="M10 38c6-3 12 3 18 0s12 3 18 0 8-1 8-1M14 31l6-12h24l6 12M26 19v-7h12v7" />',
  coastal:
    '<path d="M8 38c6-4 12-4 18 0s12 4 18 0 10-3 12-1M8 45c6-4 12-4 18 0s12 4 18 0 10-3 12-1M40 16a6 6 0 1 0 0 .1Z" />',
  reef:
    '<path d="M10 36c8-6 18-6 26 0s12 4 18-2M20 26c4-8 14-8 20-2M32 44V28M24 38c2-4 5-6 8-6s6 2 8 6" />',
  monument:
    '<path d="M22 48h20M26 48l3-28h6l3 28M32 10v6M20 20h24" />',
  waterfall:
    '<path d="M18 12h20v24M24 12v28M30 12v30M10 42c6-3 12 3 18 0s12 3 18 0 8-2 8-2" />',
  lake:
    '<path d="M8 32l12-12 10 8 14-14 12 18M8 40c8-3 16 3 24 0s16 3 24 0M12 46c8-2 16 2 24 0s16 2 20 0" />',
  culture:
    '<path d="M32 10l18 14v22H14V24L32 10ZM24 46V32h16v14M18 24h28" />',
  highland:
    '<path d="M8 44L22 20l10 12 10-16 14 28H8ZM46 14a4 4 0 1 0 0 .1Z" />',
  coffee:
    '<path d="M16 24h24v10a12 12 0 0 1-24 0V24ZM40 26h4a4 4 0 0 1 0 8h-4M22 14c0-3 3-4 3-7M30 14c0-3 3-4 3-7" />',
  culinary:
    '<path d="M12 28h40c0 11-9 18-20 18s-20-7-20-18ZM20 18c0-3 3-4 3-7M32 18c0-3 3-4 3-7M44 18c0-3 3-4 3-7" />',
  stay:
    '<path d="M12 28l20-14 20 14M18 24v22h28V24M27 46V34h10v12" />',
};

export function renderHeroSceneSvg() {
  return `
    <svg viewBox="0 0 560 360" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustrasi pegunungan dataran tinggi dan garis pantai Aceh">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#175a4e" />
          <stop offset="100%" stop-color="#093830" />
        </linearGradient>
        <linearGradient id="ridgeBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2c7566" />
          <stop offset="100%" stop-color="#164b41" />
        </linearGradient>
        <linearGradient id="ridgeFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1d5b4f" />
          <stop offset="100%" stop-color="#0b352d" />
        </linearGradient>
      </defs>
      <rect width="560" height="360" fill="url(#skyGrad)" />
      <circle cx="426" cy="94" r="44" fill="#ecd28a" opacity="0.92" />
      <circle cx="426" cy="94" r="68" stroke="#ecd28a" stroke-opacity="0.22" stroke-width="1.5" />
      <path d="M0 245 L110 172 L215 224 L345 142 L465 212 L560 168 L560 360 L0 360 Z" fill="url(#ridgeBack)" />
      <path d="M0 278 L145 214 L270 264 L398 194 L560 256 L560 360 L0 360 Z" fill="url(#ridgeFront)" />
      <path d="M40 306 Q160 288 280 306 T520 302" stroke="#9ad1be" stroke-opacity="0.35" stroke-width="2" fill="none" />
      <path d="M230 224 C230 206 254 192 276 182 C298 192 322 206 322 224 Z" fill="#0d463c" stroke="#e6c677" stroke-opacity="0.45" stroke-width="1.5" />
      <line x1="276" y1="168" x2="276" y2="182" stroke="#e6c677" stroke-width="1.5" />
      <rect x="0" y="290" width="560" height="70" fill="url(#ridgeFront)" opacity="0.45" />
    </svg>
  `;
}

export function renderCardArtwork(motif, caption, index = 0, imageUrl = '', altText = '') {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const path = MOTIF_SVGS[motif] || MOTIF_SVGS.highland;
  const imgTag = imageUrl
    ? `<img
        class="card-media-img"
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(altText || caption)}"
        loading="lazy"
        referrerPolicy="no-referrer"
        onerror="this.classList.add('is-hidden')"
      />`
    : '';

  return `
    <div class="card-media" style="background:${gradient}">
      <div class="card-media-art" aria-hidden="true">
        <svg width="76" height="76" viewBox="0 0 64 56" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          ${path}
        </svg>
      </div>
      ${imgTag}
      <div class="card-media-scrim"></div>
      <span class="card-media-caption">${escapeHtml(caption)}</span>
    </div>
  `;
}
