import { io, Socket } from 'socket.io-client';

// Determine backend socket server URL:
// If running on Vite dev server (port 3000), connect directly to Express server on port 3001
// If running in production (port 3001), connect to same origin
const SOCKET_URL =
  typeof window !== 'undefined' && window.location.port === '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3001';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});
