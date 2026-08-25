import { useCallback, useEffect, useRef, useState } from 'react';

const DISMISS_AFTER_MS = 4000;

let nextToastId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));

    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, tone = 'success') => {
      const id = (nextToastId += 1);
      setToasts((previous) => [...previous, { id, message, tone }]);
      timers.current.set(id, setTimeout(() => dismissToast(id), DISMISS_AFTER_MS));
    },
    [dismissToast],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return { toasts, showToast, dismissToast };
}
