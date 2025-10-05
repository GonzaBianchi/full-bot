// frontend/src/hooks/useUnsavedChanges.js
import { useState, useEffect } from 'react';

export function useUnsavedChanges(currentValue, initialValue) {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Comparación profunda para objetos y arrays
    const areEqual = JSON.stringify(currentValue) === JSON.stringify(initialValue);
    setHasChanges(!areEqual);
  }, [currentValue, initialValue]);

  return hasChanges;
}

// Hook específico para múltiples valores
export function useMultipleUnsavedChanges(values) {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const anyChanged = values.some(({ current, original }) => {
      if (Array.isArray(current)) {
        return JSON.stringify(current.sort()) !== JSON.stringify(original.sort());
      }
      return current !== original;
    });
    
    setHasChanges(anyChanged);
  }, [values]);

  return hasChanges;
}