/**
 * usePolling.js — polls a callback at `interval` ms while `enabled` is true.
 * Used to watch run status until the run reaches a terminal state.
 */
import { useEffect, useRef } from 'react';

export function usePolling(callback, interval = 4000, enabled = true) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    // Fire once immediately, then on interval
    savedCallback.current();
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}
