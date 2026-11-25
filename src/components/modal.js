let lastFocusedElement = null;

function getElements() {
  return {
    backdrop: document.getElementById('appModal'),
    body: document.getElementById('modalBody'),
    closeBtn: document.getElementById('modalCloseBtn'),
  };
}

export function openModal(htmlContent) {
  const {backdrop, body, closeBtn} = getElements();
  if (!backdrop || !body) return;
  lastFocusedElement = document.activeElement;
  body.innerHTML = htmlContent;
  backdrop.classList.remove('is-hidden');
  document.body.style.overflow = 'hidden';
  if (closeBtn) {
    closeBtn.focus();
  }
}

export function closeModal() {
  const {backdrop, body} = getElements();
  if (!backdrop || backdrop.classList.contains('is-hidden')) return;
  backdrop.classList.add('is-hidden');
  if (body) body.innerHTML = '';
  document.body.style.overflow = '';
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

export function initModalListeners() {
  const {backdrop, closeBtn} = getElements();
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  if (backdrop) {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        closeModal();
      }
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });
}
