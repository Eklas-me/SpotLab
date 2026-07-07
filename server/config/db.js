import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Wallet from '../models/Wallet.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

let mongoServer;

export const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    
    if (uri === 'memory') {
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      console.log('📦 Starting In-Memory Database for local development...');
    } else if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }
    
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected');

    // Ensure at least one wallet exists for our single-user setup
    const count = await Wallet.countDocuments();
    if (count === 0) {
      await Wallet.create({ balance: 10000, initialBalance: 10000 });
      console.log('✅ Initial Wallet Created ($10,000)');
    }
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};
