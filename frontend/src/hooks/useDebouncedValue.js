// frontend/src/hooks/useDebouncedValue.js
import { useEffect, useState } from 'react';

/**
 * Retrasa un valor que cambia con cada tecla. Sin esto, cada pulsación sería
 * una petición contra un backend que limita a 100 req/15 min por IP.
 */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
