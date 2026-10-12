import { useEffect } from 'react';
import { useSocketStore } from '../lib/socket.js';

/** Subscribe to a socket event for the lifetime of a component. */
export function useSocketEvent(event, handler) {
  const s = useSocketStore((st) => st.socket);
  useEffect(() => {
    if (!s) return undefined;
    s.on(event, handler);
    return () => s.off(event, handler);
  }, [s, event, handler]);
}

/** Join a room-like watch (slots/order) and leave on unmount. */
export function useSocketWatch(joinEvent, leaveEvent, id) {
  const s = useSocketStore((st) => st.socket);
  useEffect(() => {
    if (!s || !id) return undefined;
    const join = () => s.emit(joinEvent, id);
    join();
    s.on('connect', join); // re-join after reconnects
    return () => {
      s.off('connect', join);
      s.emit(leaveEvent, id);
    };
  }, [s, joinEvent, leaveEvent, id]);
}
