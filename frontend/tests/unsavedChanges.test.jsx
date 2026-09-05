import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMultipleUnsavedChanges, useUnsavedChanges } from '../src/hooks/useUnsavedChanges';

describe('useUnsavedChanges', () => {
  it('compara en profundidad', () => {
    const { result } = renderHook(() => useUnsavedChanges([{ a: 1 }], [{ a: 1 }]));
    expect(result.current).toBe(false);
  });

  it('detecta una diferencia real', () => {
    const { result } = renderHook(() => useUnsavedChanges([{ a: 1 }], [{ a: 2 }]));
    expect(result.current).toBe(true);
  });
});

describe('useMultipleUnsavedChanges', () => {
  it('ignora el orden en los arrays', () => {
    const { result } = renderHook(() =>
      useMultipleUnsavedChanges([{ current: ['b', 'a'], original: ['a', 'b'] }])
    );
    expect(result.current).toBe(false);
  });

  it('no reordena el array que recibe', () => {
    // Antes usaba sort() sobre el propio estado de React y lo mutaba.
    const current = ['c', 'a', 'b'];
    const original = ['a', 'b', 'c'];

    renderHook(() => useMultipleUnsavedChanges([{ current, original }]));

    expect(current).toEqual(['c', 'a', 'b']);
    expect(original).toEqual(['a', 'b', 'c']);
  });

  it('detecta un cambio de contenido', () => {
    const { result } = renderHook(() =>
      useMultipleUnsavedChanges([{ current: ['a'], original: ['a', 'b'] }])
    );
    expect(result.current).toBe(true);
  });
});
