import { io, Socket } from 'socket.io-client';

// Determine backend socket server URL:
// If running on Vite dev server (port 3000, 5173, etc.), connect directly to Express server on port 3001
// If running in production (port 3001 or standard 80/443), connect to same origin
const isDev =
  typeof window !== 'undefined' &&
  (window.location.port === '3000' ||
    window.location.port === '5173' ||
    (window.location.hostname === 'localhost' && window.location.port !== '3001') ||
    (window.location.hostname === '127.0.0.1' && window.location.port !== '3001'));

const SOCKET_URL =
  typeof window !== 'undefined'
    ? isDev
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : window.location.origin
    : 'http://localhost:3001';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 4000,
  timeout: 15000,
});
