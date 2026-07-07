/* ═══════════════════════════════════════════════════════════
   SpotLab — Toast Notification System
   ═══════════════════════════════════════════════════════════ */

const ICONS = {
  success: '✅',
  error: '🛑',
  info: 'ℹ️',
  warning: '⚠️',
};

const DURATIONS = {
  success: 4000,
  error: 5000,
  info: 3500,
  warning: 4500,
};

let container = null;

/**
 * Initialize the toast system
 */
export function initToast() {
  container = document.getElementById('toast-container');
}

/**
 * Show a toast notification
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {string} title
 * @param {string} message
 * @param {number} [duration] - Auto-dismiss duration in ms
 */
export function showToast(type, title, message, duration) {
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || 'ℹ️'}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    dismissToast(toast);
  });

  container.appendChild(toast);

  // Auto dismiss
  const timeout = duration || DURATIONS[type] || 4000;
  setTimeout(() => {
    dismissToast(toast);
  }, timeout);
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  
  // Use timeout instead of animationend for better browser compatibility
  setTimeout(() => {
    toast.remove();
  }, 300);
}
