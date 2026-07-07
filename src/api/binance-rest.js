/* ═══════════════════════════════════════════════════════════
   SpotLab — Binance REST API Client
   Fetches historical klines and current prices (no API key needed)
   ═══════════════════════════════════════════════════════════ */

import { BINANCE_REST_BASE } from '../utils/constants.js';

/**
 * Fetch historical kline (candlestick) data
 * @param {string} symbol - e.g. 'BTCUSDT'
 * @param {string} interval - e.g. '1m', '1h', '1d'
 * @param {number} limit - number of candles (max 1000)
 * @returns {Array} Array of { time, open, high, low, close, volume }
 */
export async function fetchKlines(symbol, interval, limit = 500) {
  const url = `${BINANCE_REST_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Klines fetch failed: ${response.status}`);
  const data = await response.json();

  return data.map((k) => ({
    time: Math.floor(k[0] / 1000), // Convert ms to seconds for lightweight-charts
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

/**
 * Fetch current ticker price for a symbol
 * @param {string} symbol - e.g. 'BTCUSDT'
 * @returns {{ symbol: string, price: number }}
 */
export async function fetchTickerPrice(symbol) {
  const url = `${BINANCE_REST_BASE}/api/v3/ticker/price?symbol=${symbol}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ticker fetch failed: ${response.status}`);
  const data = await response.json();
  return {
    symbol: data.symbol,
    price: parseFloat(data.price),
  };
}

/**
 * Fetch 24h ticker stats for a symbol
 * @param {string} symbol - e.g. 'BTCUSDT'
 * @returns {{ priceChangePercent: number, lastPrice: number, highPrice: number, lowPrice: number, volume: number }}
 */
export async function fetch24hTicker(symbol) {
  const url = `${BINANCE_REST_BASE}/api/v3/ticker/24hr?symbol=${symbol}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`24h ticker fetch failed: ${response.status}`);
  const data = await response.json();
  return {
    priceChangePercent: parseFloat(data.priceChangePercent),
    lastPrice: parseFloat(data.lastPrice),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
    volume: parseFloat(data.volume),
    quoteVolume: parseFloat(data.quoteVolume),
  };
}

/**
 * Fetch 24h tickers for all symbols at once (for pair selector)
 * @param {string[]} symbols - e.g. ['BTCUSDT', 'ETHUSDT']
 * @returns {Object} Map of symbol -> { lastPrice, priceChangePercent }
 */
export async function fetchAllTickers(symbols) {
  const url = `${BINANCE_REST_BASE}/api/v3/ticker/24hr`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`All tickers fetch failed: ${response.status}`);
  const allData = await response.json();

  const symbolSet = new Set(symbols);
  const result = {};
  for (const d of allData) {
    if (symbolSet.has(d.symbol)) {
      result[d.symbol] = {
        lastPrice: parseFloat(d.lastPrice),
        priceChangePercent: parseFloat(d.priceChangePercent),
      };
    }
  }
  return result;
}
