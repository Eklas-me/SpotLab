/* ═══════════════════════════════════════════════════════════
   SpotLab — Main Application Entry Point
   ═══════════════════════════════════════════════════════════ */

import './styles/index.css';

import { wallet } from './core/wallet.js';
import { positions } from './core/positions.js';
import { tradingEngine } from './core/trading.js';
import { chartManager } from './chart/chart-manager.js';

import { initHeader, getCurrentPair, getCurrentTimeframe } from './ui/header.js';
import { initOrderPanel, updateOrderPanelPair } from './ui/order-panel.js';
import { initPositionsPanel } from './ui/positions-panel.js';
import { initOrdersPanel } from './ui/orders-panel.js';
import { initHistoryPanel } from './ui/history-panel.js';
import { initAnalyticsPanel } from './ui/analytics-panel.js';
import { initToast } from './ui/toast.js';

/**
 * Bootstraps the application
 */
async function bootstrap() {
  console.log('🔬 Starting SpotLab...');

  // 1. Initialize UI Elements (that don't depend on state yet)
  initToast();
  setupBottomTabs();

  // 2. Initialize Core State Managers (Async fetch from Backend)
  await wallet.init();
  await positions.init();
  await tradingEngine.init();

  // 3. Initialize UI Components
  initHeader({
    onPairChanged: handlePairChange,
    onTimeframeChanged: handleTimeframeChange,
  });
  initOrderPanel();
  initPositionsPanel();
  initOrdersPanel();
  initHistoryPanel();
  initAnalyticsPanel();

  // 4. Initialize Chart
  const chartContainer = document.getElementById('chart-container');
  chartManager.init(chartContainer);

  // 5. Load Initial Data
  const initialPair = getCurrentPair();
  const initialTimeframe = getCurrentTimeframe();
  await loadDataForPair(initialPair.symbol, initialTimeframe.value);
}

/**
 * Handle pair change from header
 */
async function handlePairChange(pair) {
  const timeframe = getCurrentTimeframe();
  await loadDataForPair(pair.symbol, timeframe.value);
  updateOrderPanelPair();
}

/**
 * Handle timeframe change from header
 */
async function handleTimeframeChange(timeframe) {
  const pair = getCurrentPair();
  await loadDataForPair(pair.symbol, timeframe.value);
}

/**
 * Load chart data and update markers for a pair
 */
async function loadDataForPair(symbol, interval) {
  try {
    // Show loading state (optional: add a spinner overlay here)
    chartManager.clearAllLines();
    await chartManager.loadChart(symbol, interval);

    // Restore entry lines for open positions of this pair
    const openPositions = positions.getBySymbol(symbol);
    openPositions.forEach(pos => {
      chartManager.addEntryLine(pos.id, pos.entryPrice, pos.side);
    });

  } catch (err) {
    console.error('[App] Failed to load data:', err);
  }
}

/**
 * Setup bottom tabs switching
 */
function setupBottomTabs() {
  const tabs = document.querySelectorAll('.bottom-tab');
  const panels = document.querySelectorAll('.bottom-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Add active to clicked
      tab.classList.add('active');
      const panelId = `panel-${tab.dataset.panel}`;
      document.getElementById(panelId).classList.add('active');
    });
  });
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', bootstrap);
