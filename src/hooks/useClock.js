import { useEffect, useState } from 'react';

/**
 * Returns the current Date, refreshed on a timer and whenever the tab regains focus.
 * This is what starts a fresh checklist when the local date changes.
 */
export function useClock(intervalMs = 15000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timerId = setInterval(refresh, intervalMs);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [intervalMs]);

  return now;
}
