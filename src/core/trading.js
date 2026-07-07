/* ═══════════════════════════════════════════════════════════
   SpotLab — Trading Engine (API Driven)
   ═══════════════════════════════════════════════════════════ */

import { API_BASE, CLOSE_REASONS } from '../utils/constants.js';
import { wallet } from './wallet.js';
import { positions } from './positions.js';
import { binanceWS } from '../api/binance-ws.js';
import { socket } from '../api/socket-client.js';

class TradingEngine {
  constructor() {
    this._orders = [];
    this._history = [];
    this._listeners = new Map();
    this._priceCache = {}; 
  }

  /**
   * Fetch initial data from backend
   */
  async init() {
    await this.fetchOrders();
    await this.fetchHistory();

    // Cache prices from UI websocket
    binanceWS.on('price', ({ price, symbol }) => {
      this._priceCache[symbol.toUpperCase()] = price;
    });

    // Listen to backend socket events for background execution
    socket.on('TRADE_CLOSED', async (trade) => {
      console.log('[Socket] Trade Closed via SL/TP:', trade);
      await this.refreshAllData();
      this._emit('tradeClosed', trade);
    });

    socket.on('ORDER_FILLED', async ({ order, position }) => {
      console.log('[Socket] Limit Order Filled:', order);
      await this.refreshAllData();
      this._emit('limitFilled', { order, position });
    });
  }

  async refreshAllData() {
    await wallet.fetchWallet();
    await positions.fetchPositions();
    await this.fetchOrders();
    await this.fetchHistory();
  }

  async fetchOrders() {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      if (res.ok) {
        const data = await res.json();
        this._orders = data.map(o => ({...o, id: o._id}));
        this._emit('orders', this._orders);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async fetchHistory() {
    try {
      const res = await fetch(`${API_BASE}/history`);
      if (res.ok) {
        const data = await res.json();
        this._history = data.map(h => ({...h, id: h._id}));
        this._emit('history', this._history);
      }
    } catch (err) {
      console.error(err);
    }
  }

  getPrice(symbol) {
    return this._priceCache[symbol] || 0;
  }

  get prices() {
    return { ...this._priceCache };
  }

  get orders() {
    return [...this._orders];
  }

  get history() {
    return [...this._history];
  }

  // ─────── EVENT SYSTEM ───────

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
  }

  _emit(event, data) {
    const set = this._listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }

  // ─────── API ACTIONS ───────

  async marketBuy(symbol, amountUSDT, stopLoss = null, takeProfit = null) {
    const currentPrice = this._priceCache[symbol];
    if (!currentPrice) return { success: false, message: 'Price not available' };

    try {
      const res = await fetch(`${API_BASE}/trade/market`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol, 
          base: symbol.replace('USDT', ''), 
          amountUSDT, 
          currentPrice, 
          stopLoss, 
          takeProfit 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await this.refreshAllData();
      return { success: true, message: data.message, position: data.position };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async closePosition(positionId, reason = CLOSE_REASONS.MANUAL) {
    const pos = positions.all.find(p => p.id === positionId);
    if (!pos) return { success: false, message: 'Position not found' };
    
    const currentPrice = this._priceCache[pos.symbol] || pos.entryPrice;

    try {
      const res = await fetch(`${API_BASE}/trade/close/${positionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPrice })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await this.refreshAllData();
      this._emit('tradeClosed', data.trade);
      return { success: true, trade: data.trade };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async placeLimitOrder(symbol, price, amountUSDT, stopLoss = null, takeProfit = null) {
    try {
      const res = await fetch(`${API_BASE}/trade/limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol, 
          base: symbol.replace('USDT', ''), 
          price, 
          amountUSDT, 
          stopLoss, 
          takeProfit 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await this.refreshAllData();
      return { success: true, message: data.message, order: data.order };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async cancelOrder(orderId) {
    try {
      const res = await fetch(`${API_BASE}/trade/cancel/${orderId}`, {
        method: 'POST'
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await this.refreshAllData();
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async resetAll() {
    try {
      await fetch(`${API_BASE}/reset`, { method: 'POST' });
      await this.refreshAllData();
    } catch (err) {
      console.error(err);
    }
  }

  // ─────── ANALYTICS ───────

  getAnalytics() {
    const trades = this._history;
    if (trades.length === 0) {
      return {
        totalTrades: 0, winRate: 0, totalPnL: 0, avgPnL: 0,
        slHits: 0, tpHits: 0, accuracy: 0, bestTrade: 0, worstTrade: 0,
        streak: 0, streakType: '', avgRR: 0, avgDuration: 0,
      };
    }

    const wins = trades.filter((t) => t.pnl > 0);
    const slHits = trades.filter((t) => t.closeReason === CLOSE_REASONS.STOP_LOSS).length;
    const tpHits = trades.filter((t) => t.closeReason === CLOSE_REASONS.TAKE_PROFIT).length;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

    let streak = 0;
    let streakType = '';
    if (trades.length > 0) {
      streakType = trades[0].pnl > 0 ? 'win' : 'loss';
      for (const t of trades) {
        if ((t.pnl > 0 && streakType === 'win') || (t.pnl <= 0 && streakType === 'loss')) {
          streak++;
        } else {
          break;
        }
      }
    }

    let totalRR = 0;
    let rrCount = 0;
    for (const t of trades) {
      if (t.stopLoss && t.takeProfit) {
        const risk = Math.abs(t.entryPrice - t.stopLoss);
        const reward = Math.abs(t.takeProfit - t.entryPrice);
        if (risk > 0) {
          totalRR += reward / risk;
          rrCount++;
        }
      }
    }

    const avgDuration = trades.reduce((sum, t) => sum + t.duration, 0) / trades.length;

    return {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnL,
      avgPnL: totalPnL / trades.length,
      slHits,
      tpHits,
      accuracy: (slHits + tpHits) > 0 ? (tpHits / (slHits + tpHits)) * 100 : 0,
      bestTrade: trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0,
      worstTrade: trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0,
      streak,
      streakType,
      avgRR: rrCount > 0 ? totalRR / rrCount : 0,
      avgDuration,
    };
  }

  getFilteredHistory(filters = {}) {
    let result = [...this._history];
    if (filters.pair && filters.pair !== 'all') {
      result = result.filter((t) => t.symbol === filters.pair);
    }
    if (filters.result === 'profit') {
      result = result.filter((t) => t.pnl > 0);
    } else if (filters.result === 'loss') {
      result = result.filter((t) => t.pnl <= 0);
    }
    if (filters.closeReason && filters.closeReason !== 'all') {
      result = result.filter((t) => t.closeReason === filters.closeReason);
    }
    return result;
  }
}

export const tradingEngine = new TradingEngine();
