/* ═══════════════════════════════════════════════════════════
   SpotLab — Binance WebSocket Manager
   Real-time kline & ticker streaming with auto-reconnect
   ═══════════════════════════════════════════════════════════ */

import { BINANCE_WS_BASE } from '../utils/constants.js';

class BinanceWebSocket {
  constructor() {
    this._ws = null;
    this._listeners = new Map(); // event -> Set<callback>
    this._currentSymbol = null;
    this._currentInterval = null;
    this._reconnectTimeout = null;
    this._reconnectDelay = 2000;
    this._maxReconnectDelay = 30000;
    this._isIntentionalClose = false;
    this._lastPrice = 0;
  }

  /**
   * Get the last known price
   */
  get lastPrice() {
    return this._lastPrice;
  }

  /**
   * Subscribe to an event
   * @param {'kline'|'ticker'|'price'|'connected'|'disconnected'} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) set.delete(callback);
  }

  /**
   * Emit an event to all listeners
   */
  _emit(event, data) {
    const set = this._listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try { cb(data); } catch (e) { console.error('[WS] Listener error:', e); }
      });
    }
  }

  /**
   * Connect to kline + ticker streams for a symbol
   * @param {string} symbol - e.g. 'btcusdt' (lowercase)
   * @param {string} interval - e.g. '1m', '1h'
   */
  connect(symbol, interval) {
    // Close existing connection
    this._isIntentionalClose = true;
    this._close();
    this._isIntentionalClose = false;

    this._currentSymbol = symbol.toLowerCase();
    this._currentInterval = interval;
    this._reconnectDelay = 2000;

    const streams = `${this._currentSymbol}@kline_${interval}/${this._currentSymbol}@miniTicker`;
    const url = `${BINANCE_WS_BASE}/${streams}`;

    console.log(`[WS] Connecting: ${url}`);
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      console.log('[WS] Connected');
      this._reconnectDelay = 2000;
      this._emit('connected', { symbol: this._currentSymbol, interval });
    };

    this._ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._handleMessage(msg);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    this._ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    this._ws.onclose = () => {
      console.log('[WS] Disconnected');
      this._emit('disconnected', {});
      if (!this._isIntentionalClose) {
        this._scheduleReconnect();
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  _handleMessage(msg) {
    // Kline data
    if (msg.e === 'kline') {
      const k = msg.k;
      const klineData = {
        time: Math.floor(k.t / 1000),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        isClosed: k.x,
      };
      this._lastPrice = klineData.close;
      this._emit('kline', klineData);
      this._emit('price', { price: klineData.close, symbol: this._currentSymbol });
    }

    // Mini ticker (for current price)
    if (msg.e === '24hrMiniTicker') {
      const price = parseFloat(msg.c);
      this._lastPrice = price;
      this._emit('ticker', {
        symbol: msg.s,
        price: price,
        open: parseFloat(msg.o),
        high: parseFloat(msg.h),
        low: parseFloat(msg.l),
        volume: parseFloat(msg.v),
      });
      this._emit('price', { price, symbol: this._currentSymbol });
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  _scheduleReconnect() {
    if (this._reconnectTimeout) clearTimeout(this._reconnectTimeout);

    console.log(`[WS] Reconnecting in ${this._reconnectDelay}ms...`);
    this._reconnectTimeout = setTimeout(() => {
      if (this._currentSymbol && this._currentInterval) {
        this.connect(this._currentSymbol, this._currentInterval);
      }
    }, this._reconnectDelay);

    this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, this._maxReconnectDelay);
  }

  /**
   * Close the WebSocket connection
   */
  _close() {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    if (this._ws) {
      this._ws.onclose = null; // Prevent reconnect
      this._ws.close();
      this._ws = null;
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this._isIntentionalClose = true;
    this._close();
    this._currentSymbol = null;
    this._currentInterval = null;
  }
}

// Singleton instance
export const binanceWS = new BinanceWebSocket();
