import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDraft } from '../src/hooks/useDraft';

describe('useDraft', () => {
  it('arranca sin cambios y los detecta al editar', () => {
    const { result } = renderHook(() => useDraft({ enabled: false }));

    expect(result.current.hasChanges).toBe(false);

    act(() => result.current.setDraft({ enabled: true }));

    expect(result.current.hasChanges).toBe(true);
    expect(result.current.draft).toEqual({ enabled: true });
  });

  it('markSaved fija el valor actual como guardado', () => {
    const { result } = renderHook(() => useDraft({ enabled: false }));

    act(() => result.current.setDraft({ enabled: true }));
    act(() => result.current.markSaved());

    expect(result.current.hasChanges).toBe(false);
  });

  it('markSaved acepta lo que devolvió el servidor', () => {
    const { result } = renderHook(() => useDraft({ nivel: 1 }));

    act(() => result.current.setDraft({ nivel: 99 }));
    act(() => result.current.markSaved({ nivel: 10 }));

    expect(result.current.draft).toEqual({ nivel: 10 });
    expect(result.current.hasChanges).toBe(false);
  });

  it('discard vuelve al último valor guardado sin recargar', () => {
    const { result } = renderHook(() => useDraft({ mensaje: 'hola' }));

    act(() => result.current.setDraft({ mensaje: 'editado' }));
    act(() => result.current.discard());

    expect(result.current.draft).toEqual({ mensaje: 'hola' });
    expect(result.current.hasChanges).toBe(false);
  });

  it('no pisa una edición en curso cuando el valor guardado no cambió', () => {
    // El proveedor rearma el objeto en cada render: la identidad cambia aunque
    // el contenido sea el mismo, y eso no debe descartar lo que se está editando.
    const { result, rerender } = renderHook(({ saved }) => useDraft(saved), {
      initialProps: { saved: { xp: 1 } }
    });

    act(() => result.current.setDraft({ xp: 5 }));
    rerender({ saved: { xp: 1 } });

    expect(result.current.draft).toEqual({ xp: 5 });
    expect(result.current.hasChanges).toBe(true);
  });

  it('se resincroniza cuando el servidor devuelve otro valor', () => {
    const { result, rerender } = renderHook(({ saved }) => useDraft(saved), {
      initialProps: { saved: { xp: 1 } }
    });

    act(() => result.current.setDraft({ xp: 5 }));
    rerender({ saved: { xp: 7 } });

    expect(result.current.draft).toEqual({ xp: 7 });
    expect(result.current.hasChanges).toBe(false);
  });
});
