/* ═══════════════════════════════════════════════════════════
   SpotLab — Header UI
   Balance display, pair selector, timeframe switching
   ═══════════════════════════════════════════════════════════ */

import { TRADING_PAIRS, TIMEFRAMES } from '../utils/constants.js';
import { formatUSD, formatPercent, formatPrice } from '../utils/formatters.js';
import { wallet } from '../core/wallet.js';
import { positions } from '../core/positions.js';
import { tradingEngine } from '../core/trading.js';
import { chartManager } from '../chart/chart-manager.js';
import { binanceWS } from '../api/binance-ws.js';
import { fetchAllTickers } from '../api/binance-rest.js';

let currentPair = TRADING_PAIRS[0];
let currentTimeframe = TIMEFRAMES[0];
let tickerCache = {};

// Callbacks for pair/timeframe changes
let onPairChange = null;
let onTimeframeChange = null;

/**
 * Initialize header UI
 */
export function initHeader({ onPairChanged, onTimeframeChanged }) {
  onPairChange = onPairChanged;
  onTimeframeChange = onTimeframeChanged;

  setupPairSelector();
  setupTimeframeSelector();
  setupResetButton();

  // Update balance displays when wallet changes
  wallet.onChange(() => updateBalanceDisplay());
  positions.onChange(() => updateBalanceDisplay());

  // Update header price on WebSocket ticks
  binanceWS.on('ticker', (data) => {
    updatePairPrice(data.price);
    tickerCache[data.symbol] = data;
  });

  binanceWS.on('price', ({ price }) => {
    updatePairPrice(price);
  });

  // Initial balance display
  updateBalanceDisplay();

  // Fetch all tickers for dropdown
  loadAllTickers();
}

/**
 * Get current pair
 */
export function getCurrentPair() {
  return currentPair;
}

/**
 * Get current timeframe
 */
export function getCurrentTimeframe() {
  return currentTimeframe;
}

// ─────── Pair Selector ───────

function setupPairSelector() {
  const btn = document.getElementById('pair-btn');
  const dropdown = document.getElementById('pair-dropdown');
  const selectorEl = document.getElementById('pair-selector');

  // Build dropdown
  renderPairDropdown();

  // Toggle dropdown
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectorEl.classList.toggle('open');
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    selectorEl.classList.remove('open');
  });

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function renderPairDropdown() {
  const dropdown = document.getElementById('pair-dropdown');
  dropdown.innerHTML = TRADING_PAIRS.map((pair) => `
    <div class="pair-dropdown-item ${pair.symbol === currentPair.symbol ? 'active' : ''}" data-symbol="${pair.symbol}">
      <span class="pair-symbol">${pair.base}/${pair.quote}</span>
      <span class="pair-last-price" id="dropdown-price-${pair.symbol}">--</span>
    </div>
  `).join('');

  // Click handler for each item
  dropdown.querySelectorAll('.pair-dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const symbol = item.dataset.symbol;
      const pair = TRADING_PAIRS.find((p) => p.symbol === symbol);
      if (pair && pair.symbol !== currentPair.symbol) {
        selectPair(pair);
      }
      document.getElementById('pair-selector').classList.remove('open');
    });
  });
}

function selectPair(pair) {
  currentPair = pair;

  // Update pair name in header
  document.getElementById('pair-name').textContent = `${pair.base}/${pair.quote}`;
  document.getElementById('pair-live-price').textContent = '--';
  document.getElementById('pair-change').textContent = '--%';
  document.getElementById('pair-change').className = 'pair-change';

  // Update dropdown active state
  document.querySelectorAll('.pair-dropdown-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.symbol === pair.symbol);
  });

  if (onPairChange) onPairChange(pair);
}

function updatePairPrice(price) {
  const priceEl = document.getElementById('pair-live-price');
  const prevPrice = parseFloat(priceEl.textContent.replace(/[,$]/g, '')) || 0;

  priceEl.textContent = formatPrice(price, currentPair.pricePrecision);

  // Flash animation
  if (price > prevPrice) {
    priceEl.classList.remove('price-down');
    priceEl.classList.add('price-up');
  } else if (price < prevPrice) {
    priceEl.classList.remove('price-up');
    priceEl.classList.add('price-down');
  }
  setTimeout(() => {
    priceEl.classList.remove('price-up', 'price-down');
  }, 400);
}

async function loadAllTickers() {
  try {
    const symbols = TRADING_PAIRS.map((p) => p.symbol);
    const tickers = await fetchAllTickers(symbols);
    tickerCache = tickers;

    // Update dropdown prices
    for (const [symbol, data] of Object.entries(tickers)) {
      const el = document.getElementById(`dropdown-price-${symbol}`);
      if (el) {
        const pair = TRADING_PAIRS.find((p) => p.symbol === symbol);
        el.textContent = formatPrice(data.lastPrice, pair?.pricePrecision || 2);
      }
    }

    // Update current pair change %
    const current = tickers[currentPair.symbol];
    if (current) {
      updatePairChange(current.priceChangePercent);
      updatePairPrice(current.lastPrice);
    }
  } catch (err) {
    console.warn('[Header] Failed to load tickers:', err);
  }
}

function updatePairChange(percent) {
  const el = document.getElementById('pair-change');
  el.textContent = formatPercent(percent);
  el.className = `pair-change ${percent >= 0 ? 'positive' : 'negative'}`;
}

// ─────── Timeframe Selector ───────

function setupTimeframeSelector() {
  const selector = document.getElementById('timeframe-selector');
  selector.querySelectorAll('.tf-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tf = TIMEFRAMES.find((t) => t.value === btn.dataset.tf);
      if (tf && tf.value !== currentTimeframe.value) {
        currentTimeframe = tf;

        // Update active state
        selector.querySelectorAll('.tf-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        if (onTimeframeChange) onTimeframeChange(tf);
      }
    });
  });
}

// ─────── Balance Display ───────

function updateBalanceDisplay() {
  const balance = wallet.balance;
  const prices = tradingEngine.prices;
  const unrealizedPnL = positions.calcTotalUnrealizedPnL(prices);
  const positionsCost = positions.calcTotalCost();
  const portfolioValue = balance + positionsCost + unrealizedPnL;
  const totalPnL = portfolioValue - wallet.initialBalance;
  const pnlPercent = (totalPnL / wallet.initialBalance) * 100;

  document.getElementById('balance-value').textContent = formatUSD(balance);
  document.getElementById('portfolio-value').textContent = formatUSD(portfolioValue);
  document.getElementById('available-balance').textContent = formatUSD(balance);

  const pnlEl = document.getElementById('pnl-value');
  const sign = totalPnL >= 0 ? '+' : '';
  pnlEl.textContent = `${sign}${formatUSD(totalPnL)} (${formatPercent(pnlPercent)})`;
  pnlEl.className = `balance-value ${totalPnL > 0 ? 'pnl-positive' : totalPnL < 0 ? 'pnl-negative' : 'pnl-neutral'}`;
}

// ─────── Reset Button ───────

function setupResetButton() {
  const btn = document.getElementById('reset-btn');
  const modal = document.getElementById('reset-modal');
  const cancelBtn = document.getElementById('reset-cancel');
  const confirmBtn = document.getElementById('reset-confirm');

  btn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  confirmBtn.addEventListener('click', () => {
    // Reset everything
    wallet.reset();
    positions.clearAll();
    tradingEngine.resetAll();
    chartManager.clearAllLines();
    modal.style.display = 'none';
    updateBalanceDisplay();
  });
}

/**
 * Force update the balance display (called from outside)
 */
export function refreshBalance() {
  updateBalanceDisplay();
}
