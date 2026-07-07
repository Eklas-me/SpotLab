import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL);

socket.on('connect', () => {
  console.log('[Socket] Connected to backend');
});

socket.on('disconnect', () => {
  console.log('[Socket] Disconnected from backend');
});
