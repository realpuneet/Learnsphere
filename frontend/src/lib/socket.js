import { io } from 'socket.io-client';
import { create } from 'zustand';
import { useAuth } from './authStore.js';

let socket;
/** Reactive handle so hooks re-bind when the socket is (re)created after login/logout. */
export const useSocketStore = create(() => ({ socket: null }));

export function connectSocket() {
  const token = useAuth.getState().accessToken;
  if (!token) return null;
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 8000,
  });
  // refresh the token before every reconnect attempt
  socket.io.on('reconnect_attempt', () => {
    socket.auth = { token: useAuth.getState().accessToken };
  });
  useSocketStore.setState({ socket });
  return socket;
}
export const getSocket = () => socket;
export function disconnectSocket() {
  socket?.disconnect();
  socket = undefined;
  useSocketStore.setState({ socket: null });
}
