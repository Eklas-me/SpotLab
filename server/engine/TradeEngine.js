import Wallet from '../models/Wallet.js';
import Position from '../models/Position.js';
import Order from '../models/Order.js';
import Trade from '../models/Trade.js';

const TRADING_FEE_RATE = 0.001; // 0.1%

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export class TradeEngine {
  
  static async getWallet() {
    return await Wallet.findOne();
  }

  static async marketBuy(symbol, base, amountUSDT, currentPrice, stopLoss, takeProfit) {
    if (amountUSDT <= 0) throw new Error('Invalid amount');
    if (!currentPrice || currentPrice <= 0) throw new Error('Price not available');

    const fee = amountUSDT * TRADING_FEE_RATE;
    const totalCost = amountUSDT + fee;

    const wallet = await Wallet.findOne();
    if (totalCost > wallet.balance) {
      throw new Error(`Insufficient balance. Need $${totalCost.toFixed(2)}, have $${wallet.balance.toFixed(2)}`);
    }

    if (stopLoss && stopLoss >= currentPrice) {
      throw new Error('Stop Loss must be below current price for a buy.');
    }
    if (takeProfit && takeProfit <= currentPrice) {
      throw new Error('Take Profit must be above current price for a buy.');
    }

    const quantity = amountUSDT / currentPrice;

    // Deduct balance
    wallet.balance -= totalCost;
    await wallet.save();

    // Create Position
    const position = await Position.create({
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

    return { message: `Bought ${quantity.toFixed(6)} ${base} @ $${currentPrice}`, position };
  }

  static async closePosition(positionId, currentPrice, reason = 'manual') {
    const pos = await Position.findById(positionId);
    if (!pos) throw new Error('Position not found');

    const grossValue = pos.quantity * currentPrice;
    const fee = grossValue * TRADING_FEE_RATE;
    const netValue = grossValue - fee;

    // Add proceeds to wallet
    const wallet = await Wallet.findOne();
    wallet.balance += netValue;
    await wallet.save();

    // Calculate P&L
    const pnl = netValue - pos.cost;
    const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

    // Record Trade
    const trade = await Trade.create({
      positionId: pos._id.toString(),
      symbol: pos.symbol,
      base: pos.base,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice: currentPrice,
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

    // Delete Position
    await Position.findByIdAndDelete(positionId);

    return { trade, wallet };
  }

  static async placeLimitOrder(symbol, base, price, amountUSDT, stopLoss, takeProfit) {
    if (price <= 0 || amountUSDT <= 0) throw new Error('Invalid price or amount');

    const fee = amountUSDT * TRADING_FEE_RATE;
    const totalCost = amountUSDT + fee;

    const wallet = await Wallet.findOne();
    if (totalCost > wallet.balance) {
      throw new Error(`Insufficient balance. Need $${totalCost.toFixed(2)}`);
    }

    // Reserve funds
    wallet.balance -= totalCost;
    await wallet.save();

    const order = await Order.create({
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

    return { message: `Limit buy placed @ $${price}`, order };
  }

  static async cancelOrder(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    // Refund funds
    const wallet = await Wallet.findOne();
    wallet.balance += order.totalCost;
    await wallet.save();

    await Order.findByIdAndDelete(orderId);

    return { message: 'Order cancelled', wallet };
  }

  static async executeLimitOrder(order, executionPrice) {
    // Delete order
    await Order.findByIdAndDelete(order._id);

    // Create position
    const position = await Position.create({
      symbol: order.symbol,
      base: order.base,
      side: order.side,
      entryPrice: executionPrice,
      quantity: order.amountUSDT / executionPrice,
      cost: order.totalCost,
      fee: order.fee,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
    });

    return position;
  }
}
