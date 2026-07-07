/* ═══════════════════════════════════════════════════════════
   SpotLab — Virtual Wallet Management (API Driven)
   ═══════════════════════════════════════════════════════════ */

import { API_BASE, DEFAULT_BALANCE } from '../utils/constants.js';

class Wallet {
  constructor() {
    this._balance = DEFAULT_BALANCE;
    this._initialBalance = DEFAULT_BALANCE;
    this._listeners = new Set();
  }

  /**
   * Fetch wallet data from backend
   */
  async init() {
    await this.fetchWallet();
  }

  async fetchWallet() {
    try {
      const res = await fetch(`${API_BASE}/wallet`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          this._balance = data.balance;
          this._initialBalance = data.initialBalance;
          this._notify();
        }
      }
    } catch (err) {
      console.error('[Wallet] Failed to fetch:', err);
    }
  }

  get balance() {
    return this._balance;
  }

  get initialBalance() {
    return this._initialBalance;
  }

  onChange(callback) {
    this._listeners.add(callback);
  }

  _notify() {
    this._listeners.forEach((cb) => {
      try { cb(this._balance); } catch (e) { console.error(e); }
    });
  }
}

export const wallet = new Wallet();
