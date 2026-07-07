import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  positionId: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  base: {
    type: String,
    required: true,
  },
  side: {
    type: String,
    required: true,
  },
  entryPrice: {
    type: Number,
    required: true,
  },
  exitPrice: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
  proceeds: {
    type: Number,
    required: true,
  },
  pnl: {
    type: Number,
    required: true,
  },
  pnlPercent: {
    type: Number,
    required: true,
  },
  entryFee: {
    type: Number,
    required: true,
  },
  exitFee: {
    type: Number,
    required: true,
  },
  stopLoss: {
    type: Number,
    default: null,
  },
  takeProfit: {
    type: Number,
    default: null,
  },
  closeReason: {
    type: String,
    required: true,
    enum: ['manual', 'sl', 'tp'],
  },
  openedAt: {
    type: Date,
    required: true,
  },
  closedAt: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number, // milliseconds
    required: true,
  }
});

export default mongoose.model('Trade', tradeSchema);
