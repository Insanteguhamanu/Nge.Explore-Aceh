/**
 * Escapes HTML special characters to prevent XSS when interpolating user/local data into DOM templates.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char];
  });
}

/**
 * Formats an integer amount into Indonesian Rupiah.
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const numeric = Number(amount) || 0;
  return `Rp${numeric.toLocaleString('id-ID')}`;
}

/**
 * Strips non-digit characters for WhatsApp deep links.
 * @param {string} phone
 * @returns {string}
 */
export function sanitizePhoneDigits(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

/**
 * Builds a clean WhatsApp inquiry URL.
 * @param {string} phone
 * @param {string} subjectName
 * @param {'id'|'en'} lang
 * @returns {string}
 */
export function buildWhatsAppUrl(phone, subjectName, lang = 'id') {
  const digits = sanitizePhoneDigits(phone);
  const text =
    lang === 'en'
      ? `Hello, I would like to ask about ${subjectName}. Is the information and availability still current?`
      : `Halo, saya ingin bertanya tentang ${subjectName}. Apakah informasi dan ketersediaannya masih berlaku?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
