// frontend/src/hooks/useDraft.js
import { useEffect, useMemo, useRef, useState } from 'react';

const snapshot = (value) => JSON.stringify(value ?? null);

/**
 * Estado editable de una sección con su valor guardado como referencia.
 *
 * Vive en el contexto del panel y no en el componente de la pestaña, porque
 * las pestañas se desmontan al cambiar de sección: si el borrador viviera
 * dentro, cambiar de pestaña perdía las ediciones y el indicador de "cambios
 * sin guardar" del sidebar nunca se enteraba de nada.
 */
export function useDraft(savedValue) {
  const savedKey = snapshot(savedValue);
  const [draft, setDraft] = useState(savedValue);
  const [baselineKey, setBaselineKey] = useState(savedKey);
  const lastSavedKey = useRef(savedKey);

  // La config llegó del servidor (o se recargó): re-sincronizar, pero sin pisar
  // ediciones en curso si el valor guardado no cambió.
  useEffect(() => {
    if (lastSavedKey.current === savedKey) return;
    lastSavedKey.current = savedKey;
    setDraft(savedValue);
    setBaselineKey(savedKey);
  }, [savedKey, savedValue]);

  const hasChanges = snapshot(draft) !== baselineKey;

  return useMemo(() => ({
    draft,
    setDraft,
    hasChanges,
    /** Fija el valor actual (o el que devolvió la API) como el guardado. */
    markSaved: (value) => {
      const next = value === undefined ? draft : value;
      setDraft(next);
      setBaselineKey(snapshot(next));
      // Se marca consumido el valor que llega por props, no el nuevo: si no,
      // el efecto de re-sincronización pisaba lo recién guardado con la copia
      // vieja de la caché mientras el refetch estaba en camino.
      lastSavedKey.current = savedKey;
    },
    /** Descarta las ediciones sin recargar la página. */
    discard: () => {
      setDraft(JSON.parse(baselineKey));
    }
  }), [draft, hasChanges, baselineKey, savedKey]);
}
