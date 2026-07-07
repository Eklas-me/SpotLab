/* ═══════════════════════════════════════════════════════════
   SpotLab — Constants & Configuration
   ═══════════════════════════════════════════════════════════ */

export const DEFAULT_BALANCE = 10000;
export const TRADING_FEE_RATE = 0.001; // 0.1% fee per trade

export const TRADING_PAIRS = [
  { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', pricePrecision: 2, qtyPrecision: 5 },
  { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', pricePrecision: 2, qtyPrecision: 4 },
  { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', pricePrecision: 2, qtyPrecision: 2 },
  { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', pricePrecision: 2, qtyPrecision: 3 },
  { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT', pricePrecision: 4, qtyPrecision: 1 },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', pricePrecision: 5, qtyPrecision: 0 },
  { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT', pricePrecision: 4, qtyPrecision: 1 },
  { symbol: 'AVAXUSDT', base: 'AVAX', quote: 'USDT', pricePrecision: 2, qtyPrecision: 2 },
  { symbol: 'DOTUSDT', base: 'DOT', quote: 'USDT', pricePrecision: 3, qtyPrecision: 2 },
  { symbol: 'LINKUSDT', base: 'LINK', quote: 'USDT', pricePrecision: 3, qtyPrecision: 2 },
];

export const TIMEFRAMES = [
  { label: '1m', value: '1m', seconds: 60 },
  { label: '5m', value: '5m', seconds: 300 },
  { label: '15m', value: '15m', seconds: 900 },
  { label: '1h', value: '1h', seconds: 3600 },
  { label: '4h', value: '4h', seconds: 14400 },
  { label: '1D', value: '1d', seconds: 86400 },
];

export const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
export const BINANCE_REST_BASE = 'https://api.binance.com';

export const API_BASE = 'http://localhost:5000/api';

export const STORAGE_KEYS = {
  WALLET: 'spotlab_wallet',
  POSITIONS: 'spotlab_positions',
  ORDERS: 'spotlab_orders',
  HISTORY: 'spotlab_history',
  SETTINGS: 'spotlab_settings',
};

export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
};

export const ORDER_SIDES = {
  BUY: 'buy',
  SELL: 'sell',
};

export const CLOSE_REASONS = {
  MANUAL: 'manual',
  STOP_LOSS: 'sl',
  TAKE_PROFIT: 'tp',
};
