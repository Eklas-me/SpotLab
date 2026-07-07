/* ═══════════════════════════════════════════════════════════
   SpotLab — Analytics Panel UI
   Win rate, P&L stats, SL/TP accuracy, streaks
   ═══════════════════════════════════════════════════════════ */

import { formatUSD, formatPercent, formatDuration } from '../utils/formatters.js';
import { tradingEngine } from '../core/trading.js';

/**
 * Initialize analytics panel
 */
export function initAnalyticsPanel() {
  // Update when history changes
  tradingEngine.on('history', () => {
    updateAnalytics();
  });

  updateAnalytics();
}

function updateAnalytics() {
  const stats = tradingEngine.getAnalytics();

  // Total Trades
  setText('stat-total-trades', stats.totalTrades);

  // Win Rate
  setText('stat-win-rate', `${stats.winRate.toFixed(1)}%`);
  setColor('stat-win-rate', stats.winRate >= 50 ? 'var(--color-buy)' : stats.winRate > 0 ? 'var(--color-sell)' : 'var(--text-primary)');

  // Total P&L
  const totalPnLSign = stats.totalPnL >= 0 ? '+' : '';
  setText('stat-total-pnl', `${totalPnLSign}${formatUSD(stats.totalPnL)}`);
  setColor('stat-total-pnl', stats.totalPnL >= 0 ? 'var(--color-buy)' : 'var(--color-sell)');

  // Avg P&L
  const avgPnLSign = stats.avgPnL >= 0 ? '+' : '';
  setText('stat-avg-pnl', `${avgPnLSign}${formatUSD(stats.avgPnL)}`);
  setColor('stat-avg-pnl', stats.avgPnL >= 0 ? 'var(--color-buy)' : 'var(--color-sell)');

  // SL Hits
  setText('stat-sl-hits', stats.slHits);
  setColor('stat-sl-hits', 'var(--color-sell)');

  // TP Hits
  setText('stat-tp-hits', stats.tpHits);
  setColor('stat-tp-hits', 'var(--color-buy)');

  // Accuracy (TP / (SL + TP))
  setText('stat-accuracy', `${stats.accuracy.toFixed(1)}%`);
  setColor('stat-accuracy', stats.accuracy >= 50 ? 'var(--color-buy)' : stats.accuracy > 0 ? 'var(--color-sell)' : 'var(--text-primary)');

  // Current Streak
  if (stats.streak > 0) {
    const emoji = stats.streakType === 'win' ? '🟢' : '🔴';
    setText('stat-streak', `${emoji} ${stats.streak} ${stats.streakType}${stats.streak > 1 ? 's' : ''}`);
  } else {
    setText('stat-streak', '0');
  }

  // Best Trade
  setText('stat-best-trade', stats.bestTrade > 0 ? `+${formatUSD(stats.bestTrade)}` : formatUSD(stats.bestTrade));
  setColor('stat-best-trade', 'var(--color-buy)');

  // Worst Trade
  setText('stat-worst-trade', formatUSD(stats.worstTrade));
  setColor('stat-worst-trade', 'var(--color-sell)');

  // Avg R:R
  setText('stat-avg-rr', stats.avgRR > 0 ? `1:${stats.avgRR.toFixed(2)}` : '—');

  // Avg Duration
  setText('stat-avg-duration', stats.totalTrades > 0 ? formatDuration(stats.avgDuration) : '—');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setColor(id, color) {
  const el = document.getElementById(id);
  if (el) el.style.color = color;
}
