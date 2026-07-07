import Wallet from '../models/Wallet.js';
import Position from '../models/Position.js';
import Order from '../models/Order.js';
import Trade from '../models/Trade.js';

const TRADING_FEE_RATE = 0.001; // 0.1%
const BINANCE_REST_BASE = 'https://api.binance.com';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export class TradeEngine {
  static parsePositiveNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error(`Invalid ${label}`);
    }
    return number;
  }

  static parseOptionalPositiveNumber(value, label) {
    if (value == null || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error(`Invalid ${label}`);
    }
    return number;
  }

  static validateSymbol(symbol) {
    if (typeof symbol !== 'string' || !/^[A-Z0-9]{2,20}USDT$/.test(symbol)) {
      throw new Error('Invalid symbol');
    }
  }

  static async getCurrentPrice(symbol) {
    this.validateSymbol(symbol);
    const response = await fetch(`${BINANCE_REST_BASE}/api/v3/ticker/price?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error('Unable to fetch current price');
    }

    const data = await response.json();
    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Invalid market price');
    }

    return price;
  }

  static validateBuyTargets(entryPrice, stopLoss, takeProfit) {
    if (stopLoss != null && stopLoss >= entryPrice) {
      throw new Error('Stop Loss must be below entry price for a buy.');
    }
    if (takeProfit != null && takeProfit <= entryPrice) {
      throw new Error('Take Profit must be above entry price for a buy.');
    }
  }
  
  static async getWallet() {
    return await Wallet.findOne().sort({ createdAt: 1 });
  }

  static async marketBuy(symbol, base, amountUSDT, stopLoss, takeProfit) {
    amountUSDT = this.parsePositiveNumber(amountUSDT, 'amount');
    stopLoss = this.parseOptionalPositiveNumber(stopLoss, 'stop loss');
    takeProfit = this.parseOptionalPositiveNumber(takeProfit, 'take profit');
    this.validateSymbol(symbol);
    base = symbol.replace('USDT', '');

    const currentPrice = await this.getCurrentPrice(symbol);
    this.validateBuyTargets(currentPrice, stopLoss, takeProfit);

    const fee = amountUSDT * TRADING_FEE_RATE;
    const totalCost = amountUSDT + fee;

    const targetWallet = await this.getWallet();
    if (!targetWallet) throw new Error('Wallet not found');

    const wallet = await Wallet.findOneAndUpdate(
      { _id: targetWallet._id, balance: { $gte: totalCost } },
      { $inc: { balance: -totalCost } },
      { new: true }
    );
    if (!wallet) {
      throw new Error(`Insufficient balance. Need $${totalCost.toFixed(2)}, have $${targetWallet.balance.toFixed(2)}`);
    }

    const quantity = amountUSDT / currentPrice;

    // Create Position
    let position;
    try {
      position = await Position.create({
        symbol,
        base,
        side: 'buy',
        entryPrice: currentPrice,
        quantity,
        cost: totalCost,
        fee,
        stopLoss: stopLoss || null,
        takeProfit: takeProfit || null,
      });
    } catch (err) {
      await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: totalCost } });
      throw err;
    }

    return { message: `Bought ${quantity.toFixed(6)} ${base} @ $${currentPrice}`, position };
  }

  static async closePosition(positionId, currentPrice = null, reason = 'manual') {
    let pos = await Position.findById(positionId);
    if (!pos) throw new Error('Position not found');
    let wallet = await this.getWallet();
    if (!wallet) throw new Error('Wallet not found');

    const exitPrice = currentPrice
      ? this.parsePositiveNumber(currentPrice, 'current price')
      : await this.getCurrentPrice(pos.symbol);
    pos = await Position.findByIdAndDelete(positionId);
    if (!pos) throw new Error('Position already closed');

    const grossValue = pos.quantity * exitPrice;
    const fee = grossValue * TRADING_FEE_RATE;
    const netValue = grossValue - fee;

    // Calculate P&L
    const pnl = netValue - pos.cost;
    const pnlPercent = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100;

    // Record Trade
    let trade;
    try {
      trade = await Trade.create({
        positionId: pos._id.toString(),
        symbol: pos.symbol,
        base: pos.base,
        side: pos.side,
        entryPrice: pos.entryPrice,
        exitPrice,
        quantity: pos.quantity,
        cost: pos.cost,
        proceeds: netValue,
        pnl,
        pnlPercent,
        entryFee: pos.fee,
        exitFee: fee,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
        closeReason: reason,
        openedAt: pos.openedAt,
        duration: Date.now() - new Date(pos.openedAt).getTime()
      });
    } catch (err) {
      await Position.create(pos.toObject());
      throw err;
    }

    try {
      wallet = await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: netValue } }, { new: true });
    } catch (err) {
      await Trade.findByIdAndDelete(trade._id);
      await Position.create(pos.toObject());
      throw err;
    }

    return { trade, wallet };
  }

  static async placeLimitOrder(symbol, base, price, amountUSDT, stopLoss, takeProfit) {
    price = this.parsePositiveNumber(price, 'price');
    amountUSDT = this.parsePositiveNumber(amountUSDT, 'amount');
    stopLoss = this.parseOptionalPositiveNumber(stopLoss, 'stop loss');
    takeProfit = this.parseOptionalPositiveNumber(takeProfit, 'take profit');
    this.validateSymbol(symbol);
    base = symbol.replace('USDT', '');
    this.validateBuyTargets(price, stopLoss, takeProfit);

    const fee = amountUSDT * TRADING_FEE_RATE;
    const totalCost = amountUSDT + fee;

    const targetWallet = await this.getWallet();
    if (!targetWallet) throw new Error('Wallet not found');

    const wallet = await Wallet.findOneAndUpdate(
      { _id: targetWallet._id, balance: { $gte: totalCost } },
      { $inc: { balance: -totalCost } },
      { new: true }
    );
    if (!wallet) {
      throw new Error(`Insufficient balance. Need $${totalCost.toFixed(2)}`);
    }

    let order;
    try {
      order = await Order.create({
        symbol,
        base,
        side: 'buy',
        type: 'limit',
        price,
        amountUSDT,
        quantity: amountUSDT / price,
        totalCost,
        fee,
        stopLoss: stopLoss || null,
        takeProfit: takeProfit || null,
      });
    } catch (err) {
      await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: totalCost } });
      throw err;
    }

    return { message: `Limit buy placed @ $${price}`, order };
  }

  static async cancelOrder(orderId) {
    const order = await Order.findByIdAndDelete(orderId);
    if (!order) throw new Error('Order not found');

    // Refund funds
    let wallet = await this.getWallet();
    if (!wallet) throw new Error('Wallet not found');
    wallet = await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: order.totalCost } }, { new: true });

    return { message: 'Order cancelled', wallet };
  }

  static async executeLimitOrder(order, executionPrice) {
    const deletedOrder = await Order.findByIdAndDelete(order._id);
    if (!deletedOrder) throw new Error('Order already filled or cancelled');

    // Create position
    let position;
    try {
      position = await Position.create({
        symbol: deletedOrder.symbol,
        base: deletedOrder.base,
        side: deletedOrder.side,
        entryPrice: executionPrice,
        quantity: deletedOrder.amountUSDT / executionPrice,
        cost: deletedOrder.totalCost,
        fee: deletedOrder.fee,
        stopLoss: deletedOrder.stopLoss,
        takeProfit: deletedOrder.takeProfit,
      });
    } catch (err) {
      const wallet = await this.getWallet();
      if (wallet) {
        await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: deletedOrder.totalCost } });
      }
      throw err;
    }

    return position;
  }
}
