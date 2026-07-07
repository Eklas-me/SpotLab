/* ═══════════════════════════════════════════════════════════
   SpotLab — Formatting Utilities
   ═══════════════════════════════════════════════════════════ */

/**
 * Format a number as USD currency
 */
export function formatUSD(value, decimals = 2) {
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  return `${sign}$${absVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format a crypto price with appropriate precision
 */
export function formatPrice(price, precision = 2) {
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/**
 * Format a quantity with appropriate precision
 */
export function formatQty(qty, precision = 5) {
  return Number(qty).toFixed(precision);
}

/**
 * Format a percentage
 */
export function formatPercent(value, decimals = 2) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format P&L with color class
 */
export function formatPnL(value, decimals = 2) {
  const formatted = formatUSD(value, decimals);
  const sign = value > 0 ? '+' : '';
  return {
    text: `${sign}${formatted}`,
    class: value > 0 ? 'pnl-positive' : value < 0 ? 'pnl-negative' : 'pnl-neutral',
  };
}

/**
 * Format a duration in milliseconds to human readable
 */
export function formatDuration(ms) {
  if (ms < 0) return '--';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format a timestamp to local date/time string
 */
export function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format a timestamp to short time
 */
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Escape text before interpolating into HTML templates.
 */
export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
