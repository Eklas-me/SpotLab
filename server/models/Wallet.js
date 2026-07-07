import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  balance: {
    type: Number,
    required: true,
    default: 10000,
  },
  initialBalance: {
    type: Number,
    required: true,
    default: 10000,
  }
}, { timestamps: true });

// We'll use a single document for now, so we can just grab the first one
export default mongoose.model('Wallet', walletSchema);
