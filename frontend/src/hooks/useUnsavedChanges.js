// frontend/src/hooks/useUnsavedChanges.js
import { useMemo } from 'react';

const snapshot = (value) => {
  // `sort()` ordena in place: aplicado directamente sobre el estado de React
  // mutaba el array que el componente estaba renderizando.
  if (Array.isArray(value)) return JSON.stringify([...value].sort());
  return JSON.stringify(value ?? null);
};

export function useUnsavedChanges(currentValue, initialValue) {
  return useMemo(
    () => JSON.stringify(currentValue) !== JSON.stringify(initialValue),
    [currentValue, initialValue]
  );
}

/** Igual que el anterior pero para varios pares valor/original a la vez. */
export function useMultipleUnsavedChanges(values) {
  const key = JSON.stringify(
    values.map(({ current, original }) => [snapshot(current), snapshot(original)])
  );

  return useMemo(() => {
    const pairs = JSON.parse(key);
    return pairs.some(([current, original]) => current !== original);
  }, [key]);
}
