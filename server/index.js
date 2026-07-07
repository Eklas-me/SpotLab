import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { BinanceMonitor } from './engine/BinanceMonitor.js';
import apiRoutes from './routes/api.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST']
};
const io = new Server(server, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// Initialize Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    
    // 2. Start Binance Background Monitor
    const monitor = new BinanceMonitor(io);
    await monitor.start();
    app.locals.monitor = monitor; // Make monitor available to routes

    // 3. Start Express
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
