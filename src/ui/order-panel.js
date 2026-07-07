/* ═══════════════════════════════════════════════════════════
   SpotLab — Order Panel UI
   Buy/Sell form with market/limit orders and SL/TP
   ═══════════════════════════════════════════════════════════ */

import { TRADING_FEE_RATE } from '../utils/constants.js';
import { formatUSD, formatQty } from '../utils/formatters.js';
import { wallet } from '../core/wallet.js';
import { tradingEngine } from '../core/trading.js';
import { binanceWS } from '../api/binance-ws.js';
import { showToast } from './toast.js';
import { getCurrentPair } from './header.js';

let currentSide = 'buy';
let currentOrderType = 'market';
let currentPrice = 0;

/**
 * Initialize the order panel
 */
export function initOrderPanel() {
  setupSideToggle();
  setupOrderTypeTabs();
  setupAmountShortcuts();
  setupFormInputs();
  setupFormSubmit();

  // Listen for price updates
  binanceWS.on('price', ({ price }) => {
    currentPrice = price;
    updateQtyDisplay();
    updateOrderSummary();
  });
}

// ─────── Side Toggle (Buy/Sell) ───────

function setupSideToggle() {
  const buyBtn = document.getElementById('btn-buy');
  const sellBtn = document.getElementById('btn-sell');

  buyBtn.addEventListener('click', () => {
    currentSide = 'buy';
    buyBtn.classList.add('active');
    sellBtn.classList.remove('active');
    updateSubmitButton();
  });

  sellBtn.addEventListener('click', () => {
    currentSide = 'sell';
    sellBtn.classList.add('active');
    buyBtn.classList.remove('active');
    updateSubmitButton();
  });
}

// ─────── Order Type Tabs ───────

function setupOrderTypeTabs() {
  const tabs = document.querySelectorAll('.order-tab');
  const limitPriceGroup = document.getElementById('limit-price-group');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      currentOrderType = tab.dataset.type;
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Show/hide limit price input
      limitPriceGroup.style.display = currentOrderType === 'limit' ? 'flex' : 'none';

      updateQtyDisplay();
      updateOrderSummary();
    });
  });
}

// ─────── Amount Shortcuts ───────

function setupAmountShortcuts() {
  document.querySelectorAll('.shortcut-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pct = parseInt(btn.dataset.pct);
      const maxAmount = wallet.balance / (1 + TRADING_FEE_RATE);
      const amount = (maxAmount * pct) / 100;

      document.getElementById('input-amount').value = amount.toFixed(2);
      updateQtyDisplay();
      updateOrderSummary();
    });
  });
}

// ─────── Form Inputs ───────

function setupFormInputs() {
  const amountInput = document.getElementById('input-amount');
  const limitPriceInput = document.getElementById('input-limit-price');
  const slInput = document.getElementById('input-sl');
  const tpInput = document.getElementById('input-tp');

  [amountInput, limitPriceInput, slInput, tpInput].forEach((input) => {
    input.addEventListener('input', () => {
      updateQtyDisplay();
      updateOrderSummary();
    });
  });
}

// ─────── Form Submit ───────

function setupFormSubmit() {
  const form = document.getElementById('order-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pair = getCurrentPair();
    const amountUSDT = parseFloat(document.getElementById('input-amount').value) || 0;
    const limitPrice = parseFloat(document.getElementById('input-limit-price').value) || 0;
    const sl = parseFloat(document.getElementById('input-sl').value) || null;
    const tp = parseFloat(document.getElementById('input-tp').value) || null;

    if (amountUSDT <= 0) {
      showToast('warning', 'Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    let result;
    const btnSubmit = document.getElementById('btn-submit');
    const originalText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Processing...';

    if (currentSide === 'sell') {
      showToast('info', 'Sell', 'To sell, close an open position from the Positions panel.');
      btnSubmit.disabled = false;
      btnSubmit.textContent = originalText;
      return;
    }

    if (currentOrderType === 'market') {
      result = await tradingEngine.marketBuy(pair.symbol, amountUSDT, sl, tp);
    } else {
      if (limitPrice <= 0) {
        showToast('warning', 'Invalid Price', 'Please enter a limit price.');
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
        return;
      }
      result = await tradingEngine.placeLimitOrder(pair.symbol, limitPrice, amountUSDT, sl, tp);
    }

    btnSubmit.disabled = false;
    btnSubmit.textContent = originalText;

    if (result.success) {
      showToast('success', currentOrderType === 'market' ? 'Order Filled' : 'Order Placed', result.message);
      resetForm();
    } else {
      showToast('error', 'Order Failed', result.message);
    }
  });
}

// ─────── UI Updates ───────

function updateQtyDisplay() {
  const amount = parseFloat(document.getElementById('input-amount').value) || 0;
  let price = currentPrice;

  if (currentOrderType === 'limit') {
    price = parseFloat(document.getElementById('input-limit-price').value) || currentPrice;
  }

  const pair = getCurrentPair();
  const qty = price > 0 ? amount / price : 0;
  document.getElementById('qty-display').textContent = `${formatQty(qty, pair.qtyPrecision)} ${pair.base}`;
}

function updateOrderSummary() {
  const amount = parseFloat(document.getElementById('input-amount').value) || 0;
  const fee = amount * TRADING_FEE_RATE;
  const total = amount + fee;

  document.getElementById('est-fee').textContent = formatUSD(fee);
  document.getElementById('est-total').textContent = formatUSD(total);
}

function updateSubmitButton() {
  const btn = document.getElementById('submit-btn');
  const pair = getCurrentPair();

  if (currentSide === 'buy') {
    btn.textContent = `Buy ${pair.base}`;
    btn.className = 'submit-btn buy-btn';
  } else {
    btn.textContent = `Sell ${pair.base}`;
    btn.className = 'submit-btn sell-btn';
  }
}

function resetForm() {
  document.getElementById('input-amount').value = '';
  document.getElementById('input-limit-price').value = '';
  document.getElementById('input-sl').value = '';
  document.getElementById('input-tp').value = '';
  updateQtyDisplay();
  updateOrderSummary();
}

/**
 * Update the submit button when pair changes
 */
export function updateOrderPanelPair() {
  updateSubmitButton();
  resetForm();
}
