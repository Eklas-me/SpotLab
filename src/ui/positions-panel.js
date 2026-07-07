/* ═══════════════════════════════════════════════════════════
   SpotLab — Positions Panel UI
   Open positions list with real-time P&L
   ═══════════════════════════════════════════════════════════ */

import { formatPrice, formatQty, formatUSD, formatPnL } from '../utils/formatters.js';
import { positions } from '../core/positions.js';
import { tradingEngine } from '../core/trading.js';
import { binanceWS } from '../api/binance-ws.js';
import { chartManager } from '../chart/chart-manager.js';
import { showToast } from './toast.js';
import { refreshBalance } from './header.js';
import { TRADING_PAIRS, CLOSE_REASONS } from '../utils/constants.js';

let updateInterval = null;

/**
 * Initialize positions panel
 */
export function initPositionsPanel() {
  // Render when positions change
  positions.onChange(() => {
    renderPositions();
    updatePositionsCount();
  });

  // Listen for trade closures (SL/TP hits)
  tradingEngine.on('tradeClosed', (trade) => {
    if (trade.closeReason === CLOSE_REASONS.STOP_LOSS) {
      showToast('error', 'Stop Loss Hit', `${trade.base} closed @ $${formatPrice(trade.exitPrice, 2)} | P&L: ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`);
    } else if (trade.closeReason === CLOSE_REASONS.TAKE_PROFIT) {
      showToast('success', 'Take Profit Hit', `${trade.base} closed @ $${formatPrice(trade.exitPrice, 2)} | P&L: +$${trade.pnl.toFixed(2)}`);
    }
    refreshBalance();
    chartManager.removeEntryLine(trade.positionId);
  });

  // Listen for limit order fills
  tradingEngine.on('limitFilled', ({ order, position }) => {
    showToast('success', 'Limit Order Filled', `Bought ${position.base} @ $${formatPrice(position.entryPrice, 2)}`);
    chartManager.addEntryLine(position.id, position.entryPrice, position.side);
    refreshBalance();
  });

  // Periodic P&L update
  updateInterval = setInterval(() => {
    updateLivePnL();
  }, 1000);

  renderPositions();
}

function renderPositions() {
  const tbody = document.getElementById('positions-body');
  const allPositions = positions.all;

  if (allPositions.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No open positions</td></tr>';
    return;
  }

  tbody.innerHTML = allPositions.map((pos) => {
    const pair = TRADING_PAIRS.find((p) => p.symbol === pos.symbol);
    const currentPrice = tradingEngine.getPrice(pos.symbol) || pos.entryPrice;
    const { pnl, pnlPercent } = positions.calcPnL(pos, currentPrice);
    const pnlFormatted = formatPnL(pnl);

    return `
      <tr data-position-id="${pos.id}">
        <td style="font-weight: 600; color: var(--text-primary);">${pos.base}/USDT</td>
        <td><span style="color: var(--color-buy); font-weight: 600;">BUY</span></td>
        <td>${formatQty(pos.quantity, pair?.qtyPrecision || 5)}</td>
        <td>${formatPrice(pos.entryPrice, pair?.pricePrecision || 2)}</td>
        <td class="mark-price" data-symbol="${pos.symbol}">${formatPrice(currentPrice, pair?.pricePrecision || 2)}</td>
        <td class="live-pnl ${pnlFormatted.class}" data-position-id="${pos.id}">${pnlFormatted.text} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)</td>
        <td style="color: var(--color-sell);">${pos.stopLoss ? formatPrice(pos.stopLoss, pair?.pricePrecision || 2) : '—'}</td>
        <td style="color: var(--color-buy);">${pos.takeProfit ? formatPrice(pos.takeProfit, pair?.pricePrecision || 2) : '—'}</td>
        <td>
          <button class="table-btn close-btn" data-action="close" data-id="${pos.id}">Close</button>
        </td>
      </tr>
    `;
  }).join('');

  // Close button handlers
  tbody.querySelectorAll('[data-action="close"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = 'Closing...';
      const result = await tradingEngine.closePosition(id, CLOSE_REASONS.MANUAL);
      if (result.success) {
        showToast('info', 'Position Closed', `${result.trade.base} closed @ $${formatPrice(result.trade.exitPrice, 2)} | P&L: ${result.trade.pnl >= 0 ? '+' : ''}$${result.trade.pnl.toFixed(2)}`);
        chartManager.removeEntryLine(id);
        refreshBalance();
      } else {
        btn.disabled = false;
        btn.textContent = 'Close';
        showToast('error', 'Close Failed', result.message);
      }
    });
  });
}

function updateLivePnL() {
  const allPositions = positions.all;
  for (const pos of allPositions) {
    const currentPrice = tradingEngine.getPrice(pos.symbol) || pos.entryPrice;
    const pair = TRADING_PAIRS.find((p) => p.symbol === pos.symbol);
    const { pnl, pnlPercent } = positions.calcPnL(pos, currentPrice);
    const pnlFormatted = formatPnL(pnl);

    // Update mark price
    const markEls = document.querySelectorAll(`.mark-price[data-symbol="${pos.symbol}"]`);
    markEls.forEach((el) => {
      el.textContent = formatPrice(currentPrice, pair?.pricePrecision || 2);
    });

    // Update P&L
    const pnlEl = document.querySelector(`.live-pnl[data-position-id="${pos.id}"]`);
    if (pnlEl) {
      pnlEl.textContent = `${pnlFormatted.text} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`;
      pnlEl.className = `live-pnl ${pnlFormatted.class}`;
    }
  }

  // Also refresh header balance periodically
  refreshBalance();
}

function updatePositionsCount() {
  document.getElementById('positions-count').textContent = positions.count;
}
