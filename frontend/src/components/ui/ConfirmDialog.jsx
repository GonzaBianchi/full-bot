// frontend/src/components/ui/ConfirmDialog.jsx
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Reemplaza a `window.confirm()`: el diálogo nativo bloquea el hilo, no se
 * puede estilar y en el panel aparecía con el look del navegador en medio de
 * una interfaz oscura.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6"
      >
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg flex-shrink-0 ${danger ? 'bg-red-500/20' : 'bg-indigo-500/20'}`}>
            <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-400' : 'text-indigo-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-gray-400 text-sm mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              danger ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
