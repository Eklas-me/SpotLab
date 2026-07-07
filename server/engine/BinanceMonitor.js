import WebSocket from 'ws';
import Position from '../models/Position.js';
import Order from '../models/Order.js';
import { TradeEngine } from './TradeEngine.js';

export class BinanceMonitor {
  constructor(io) {
    this.io = io;
    this.ws = null;
    this.activeSymbols = new Set();
    this.priceCache = {};
    this.reconnectDelay = 2000;
  }

  async start() {
    await this.updateActiveSymbols();
    this.connect();
    
    // Periodically re-check active symbols from DB in case we missed something
    setInterval(() => this.updateActiveSymbols(), 60000);
  }

  async updateActiveSymbols() {
    const positions = await Position.find().select('symbol');
    const orders = await Order.find().select('symbol');
    
    const newSymbols = new Set([
      ...positions.map(p => p.symbol.toLowerCase()),
      ...orders.map(o => o.symbol.toLowerCase())
    ]);

    let changed = false;
    if (this.activeSymbols.size !== newSymbols.size) {
      changed = true;
    } else {
      for (let s of newSymbols) {
        if (!this.activeSymbols.has(s)) changed = true;
      }
    }

    if (changed) {
      console.log('[Monitor] Active symbols updated:', Array.from(newSymbols));
      this.activeSymbols = newSymbols;
      if (this.ws) {
        // Reconnect to subscribe to new streams
        this.ws.close();
      }
    }
  }

  connect() {
    if (this.activeSymbols.size === 0) return; // Nothing to monitor

    const streams = Array.from(this.activeSymbols).map(s => `${s}@miniTicker`).join('/');
    const url = `wss://stream.binance.com:9443/ws/${streams}`;
    
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[Monitor] Connected to Binance WS');
      this.reconnectDelay = 2000;
    });

    this.ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.e === '24hrMiniTicker') {
          const symbol = msg.s; // e.g., 'BTCUSDT'
          const price = parseFloat(msg.c);
          this.priceCache[symbol] = price;
          
          await this.checkSLTP(symbol, price);
          await this.checkLimitOrders(symbol, price);
        }
      } catch (err) {
        console.error('[Monitor] Message error:', err);
      }
    });

    this.ws.on('close', () => {
      console.log(`[Monitor] Disconnected. Reconnecting in ${this.reconnectDelay}ms...`);
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
    });

    this.ws.on('error', (err) => {
      console.error('[Monitor] WS Error:', err);
    });
  }

  async checkSLTP(symbol, price) {
    const positions = await Position.find({ symbol });
    
    for (let pos of positions) {
      if (pos.side === 'buy') {
        if (pos.stopLoss && price <= pos.stopLoss) {
          console.log(`[Monitor] SL Hit for ${pos.base} @ ${price}`);
          try {
            const { trade } = await TradeEngine.closePosition(pos._id, price, 'sl');
            this.io.emit('TRADE_CLOSED', trade);
          } catch (e) {
             console.error('[Monitor] SL Close Error:', e);
          }
        } else if (pos.takeProfit && price >= pos.takeProfit) {
          console.log(`[Monitor] TP Hit for ${pos.base} @ ${price}`);
          try {
            const { trade } = await TradeEngine.closePosition(pos._id, price, 'tp');
            this.io.emit('TRADE_CLOSED', trade);
          } catch (e) {
             console.error('[Monitor] TP Close Error:', e);
          }
        }
      }
    }
  }

  async checkLimitOrders(symbol, price) {
    const orders = await Order.find({ symbol, type: 'limit' });
    
    for (let order of orders) {
      if (order.side === 'buy' && price <= order.price) {
        console.log(`[Monitor] Limit Order Filled for ${order.base} @ ${price}`);
        try {
          const position = await TradeEngine.executeLimitOrder(order, price);
          this.io.emit('ORDER_FILLED', { order, position });
          // Ensure we monitor this new position's symbol
          this.updateActiveSymbols();
        } catch (e) {
          console.error('[Monitor] Limit Order Fill Error:', e);
        }
      }
    }
  }
}
