import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
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
    enum: ['buy', 'sell'],
  },
  type: {
    type: String,
    required: true,
    enum: ['limit'],
  },
  price: {
    type: Number,
    required: true, // Target execution price
  },
  amountUSDT: {
    type: Number,
    required: true, // How much to spend
  },
  quantity: {
    type: Number,
    required: true,
  },
  totalCost: {
    type: Number,
    required: true,
  },
  fee: {
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
  placedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model('Order', orderSchema);
