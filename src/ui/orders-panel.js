/* ═══════════════════════════════════════════════════════════
   SpotLab — Orders Panel UI
   Open (pending) limit orders with cancel functionality
   ═══════════════════════════════════════════════════════════ */

import { TRADING_PAIRS } from '../utils/constants.js';
import { formatPrice, formatQty, formatUSD, formatDateTime } from '../utils/formatters.js';
import { tradingEngine } from '../core/trading.js';
import { showToast } from './toast.js';

/**
 * Initialize orders panel
 */
export function initOrdersPanel() {
  tradingEngine.on('orders', () => {
    renderOrders();
    updateOrdersCount();
  });

  renderOrders();
}

function renderOrders() {
  const tbody = document.getElementById('orders-body');
  const orders = tradingEngine.orders;

  if (orders.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No open orders</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map((order) => {
    const pair = TRADING_PAIRS.find((p) => p.symbol === order.symbol);
    return `
      <tr>
        <td style="font-weight: 600; color: var(--text-primary);">${order.base}/USDT</td>
        <td><span style="color: var(--color-buy); font-weight: 600;">BUY</span></td>
        <td>Limit</td>
        <td>${formatPrice(order.price, pair?.pricePrecision || 2)}</td>
        <td>${formatUSD(order.amountUSDT)}</td>
        <td>${formatQty(order.quantity, pair?.qtyPrecision || 5)}</td>
        <td style="color: var(--text-muted);">${formatDateTime(order.placedAt)}</td>
        <td>
          <button class="table-btn cancel-btn" data-action="cancel" data-id="${order.id}">Cancel</button>
        </td>
      </tr>
    `;
  }).join('');

  // Cancel button handlers
  tbody.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const result = tradingEngine.cancelOrder(btn.dataset.id);
      if (result.success) {
        showToast('info', 'Order Cancelled', result.message);
      }
    });
  });
}

function updateOrdersCount() {
  document.getElementById('orders-count').textContent = tradingEngine.orders.length;
}
