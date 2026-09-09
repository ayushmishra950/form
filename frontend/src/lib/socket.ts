import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

/** The socket lives at the server root, while REST lives under /api. */
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

/**
 * One shared connection for the whole app.
 *
 * `withCredentials` makes the browser attach the httpOnly auth cookies to the
 * handshake, so the server authenticates the socket exactly the way it
 * authenticates a REST call — the client never handles a token itself.
 */
export function getSocket(): Socket {
  socket ??= io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
  return socket;
}

/** Drops the connection on sign-out so the next user starts clean. */
export function closeSocket(): void {
  socket?.disconnect();
  socket = null;
}
