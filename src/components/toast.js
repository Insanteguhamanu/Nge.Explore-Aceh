let toastTimer = null;

export function showToast(message) {
  const el = document.getElementById('appToast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('is-hidden');
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    el.classList.add('is-hidden');
  }, 2600);
}
