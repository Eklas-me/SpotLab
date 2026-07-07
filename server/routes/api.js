import express from 'express';
import { TradeEngine } from '../engine/TradeEngine.js';
import Wallet from '../models/Wallet.js';
import Position from '../models/Position.js';
import Order from '../models/Order.js';
import Trade from '../models/Trade.js';

const router = express.Router();

// GET Wallet
router.get('/wallet', async (req, res) => {
  try {
    const wallet = await TradeEngine.getWallet();
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Open Positions
router.get('/positions', async (req, res) => {
  try {
    const positions = await Position.find().sort({ openedAt: -1 });
    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Pending Orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ placedAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Trade History
router.get('/history', async (req, res) => {
  try {
    const trades = await Trade.find().sort({ closedAt: -1 });
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Market Buy
router.post('/trade/market', async (req, res) => {
  try {
    const { symbol, base, amountUSDT, stopLoss, takeProfit } = req.body;
    const result = await TradeEngine.marketBuy(symbol, base, amountUSDT, stopLoss, takeProfit);
    
    // Notify monitor to track this symbol if not already tracking
    if (req.app.locals.monitor) {
      req.app.locals.monitor.updateActiveSymbols();
    }
    
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST Limit Buy
router.post('/trade/limit', async (req, res) => {
  try {
    const { symbol, base, price, amountUSDT, stopLoss, takeProfit } = req.body;
    const result = await TradeEngine.placeLimitOrder(symbol, base, price, amountUSDT, stopLoss, takeProfit);
    
    if (req.app.locals.monitor) {
      req.app.locals.monitor.updateActiveSymbols();
    }
    
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST Close Position (Manual)
router.post('/trade/close/:id', async (req, res) => {
  try {
    const result = await TradeEngine.closePosition(req.params.id, null, 'manual');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST Cancel Limit Order
router.post('/trade/cancel/:id', async (req, res) => {
  try {
    const result = await TradeEngine.cancelOrder(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST Reset Account
router.post('/reset', async (req, res) => {
  try {
    await Position.deleteMany({});
    await Order.deleteMany({});
    await Trade.deleteMany({});
    
    const wallet = await TradeEngine.getWallet();
    wallet.balance = 10000;
    wallet.initialBalance = 10000;
    await wallet.save();
    
    if (req.app.locals.monitor) {
      req.app.locals.monitor.updateActiveSymbols();
    }
    
    res.json({ message: 'Account reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
