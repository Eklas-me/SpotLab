/* ═══════════════════════════════════════════════════════════
   SpotLab — History Panel UI
   Trade history table with filters & export
   ═══════════════════════════════════════════════════════════ */

import { TRADING_PAIRS, CLOSE_REASONS } from '../utils/constants.js';
import { formatPrice, formatQty, formatUSD, formatPnL, formatDuration, formatDateTime } from '../utils/formatters.js';
import { tradingEngine } from '../core/trading.js';

const CLOSE_REASON_LABELS = {
  [CLOSE_REASONS.MANUAL]: 'Manual',
  [CLOSE_REASONS.STOP_LOSS]: '🛑 SL',
  [CLOSE_REASONS.TAKE_PROFIT]: '✅ TP',
};

/**
 * Initialize history panel
 */
export function initHistoryPanel() {
  // Re-render when history updates
  tradingEngine.on('history', () => {
    renderHistory();
    updatePairFilter();
  });

  // Filter change handlers
  document.getElementById('filter-pair').addEventListener('change', renderHistory);
  document.getElementById('filter-result').addEventListener('change', renderHistory);
  document.getElementById('filter-close-reason').addEventListener('change', renderHistory);

  // Export button
  document.getElementById('export-btn').addEventListener('click', handleExport);

  renderHistory();
  updatePairFilter();
}

function getFilters() {
  return {
    pair: document.getElementById('filter-pair').value,
    result: document.getElementById('filter-result').value,
    closeReason: document.getElementById('filter-close-reason').value,
  };
}

function renderHistory() {
  const tbody = document.getElementById('history-body');
  const filters = getFilters();
  const trades = tradingEngine.getFilteredHistory(filters);

  if (trades.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No trade history yet</td></tr>';
    return;
  }

  tbody.innerHTML = trades.map((trade, idx) => {
    const pair = TRADING_PAIRS.find((p) => p.symbol === trade.symbol);
    const pnlFormatted = formatPnL(trade.pnl);

    return `
      <tr>
        <td style="color: var(--text-muted);">${trades.length - idx}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${trade.base}/USDT</td>
        <td><span style="color: var(--color-buy); font-weight: 600;">BUY</span></td>
        <td>${formatPrice(trade.entryPrice, pair?.pricePrecision || 2)}</td>
        <td>${formatPrice(trade.exitPrice, pair?.pricePrecision || 2)}</td>
        <td>${formatQty(trade.quantity, pair?.qtyPrecision || 5)}</td>
        <td class="${pnlFormatted.class}" style="font-weight: 600;">${pnlFormatted.text}</td>
        <td>${formatDuration(trade.duration)}</td>
        <td>${CLOSE_REASON_LABELS[trade.closeReason] || trade.closeReason}</td>
        <td style="color: var(--text-muted);">${formatDateTime(trade.closedAt)}</td>
      </tr>
    `;
  }).join('');
}

function updatePairFilter() {
  const select = document.getElementById('filter-pair');
  const currentValue = select.value;

  // Get unique symbols from history
  const history = tradingEngine.history;
  const symbols = [...new Set(history.map((t) => t.symbol))];

  select.innerHTML = '<option value="all">All Pairs</option>';
  symbols.forEach((symbol) => {
    const pair = TRADING_PAIRS.find((p) => p.symbol === symbol);
    select.innerHTML += `<option value="${symbol}">${pair?.base || symbol}/USDT</option>`;
  });

  select.value = currentValue || 'all';
}

function handleExport() {
  const data = tradingEngine.history;
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `spotlab-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
