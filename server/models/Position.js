import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true, // e.g., 'BTCUSDT'
  },
  base: {
    type: String,
    required: true, // e.g., 'BTC'
  },
  side: {
    type: String,
    required: true,
    enum: ['buy', 'sell'],
  },
  entryPrice: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  cost: {
    type: Number,
    required: true, // Total cost in USDT including fee
  },
  fee: {
    type: Number,
    required: true, // Fee paid
  },
  stopLoss: {
    type: Number,
    default: null,
  },
  takeProfit: {
    type: Number,
    default: null,
  },
  openedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model('Position', positionSchema);
