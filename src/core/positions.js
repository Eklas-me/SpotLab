/* ═══════════════════════════════════════════════════════════
   SpotLab — Positions Management (API Driven)
   ═══════════════════════════════════════════════════════════ */

import { API_BASE } from '../utils/constants.js';

class PositionsManager {
  constructor() {
    this._positions = [];
    this._listeners = new Set();
  }

  /**
   * Fetch positions from backend
   */
  async init() {
    await this.fetchPositions();
  }

  async fetchPositions() {
    try {
      const res = await fetch(`${API_BASE}/positions`);
      if (res.ok) {
        // Map _id to id for UI compatibility
        const data = await res.json();
        this._positions = data.map(p => ({...p, id: p._id}));
        this._notify();
      }
    } catch (err) {
      console.error('[Positions] Failed to fetch:', err);
    }
  }

  get all() {
    return [...this._positions];
  }

  get count() {
    return this._positions.length;
  }

  getBySymbol(symbol) {
    return this._positions.filter((p) => p.symbol === symbol);
  }

  calcPnL(position, currentPrice) {
    const pnl = (currentPrice - position.entryPrice) * position.quantity - position.fee;
    const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    return { pnl, pnlPercent };
  }

  calcTotalUnrealizedPnL(currentPrices) {
    let total = 0;
    for (const pos of this._positions) {
      const price = currentPrices[pos.symbol];
      if (price) {
        const { pnl } = this.calcPnL(pos, price);
        total += pnl;
      }
    }
    return total;
  }

  calcTotalCost() {
    return this._positions.reduce((sum, p) => sum + p.cost, 0);
  }

  onChange(callback) {
    this._listeners.add(callback);
  }

  _notify() {
    this._listeners.forEach((cb) => {
      try { cb(this._positions); } catch (e) { console.error(e); }
    });
  }
}

export const positions = new PositionsManager();
