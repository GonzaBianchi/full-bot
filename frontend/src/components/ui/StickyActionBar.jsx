// frontend/src/components/ui/StickyActionBar.jsx
import { AlertCircle, Save, RotateCcw, Undo2 } from 'lucide-react';

export function StickyActionBar({
  hasChanges,
  saving,
  onSave,
  onReset,
  onDiscard,
  showReset = true,
  saveText = 'Guardar Cambios',
  resetText = 'Resetear',
  discardText = 'Descartar'
}) {
  return (
    <div className="sticky top-0 z-50 -mx-4 sm:-mx-6 lg:-mx-8 mb-2 bg-gray-900/70 border-b border-gray-700/30 backdrop-blur-3xl shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {hasChanges ? (
            <div className="flex items-center space-x-2 text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Tenés cambios sin guardar</span>
            </div>
          ) : (
            <span className="text-gray-500 text-sm hidden sm:inline">Todo guardado</span>
          )}

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {/* Volver al último valor guardado, sin tocar el servidor. */}
            {onDiscard && hasChanges && (
              <button
                onClick={onDiscard}
                disabled={saving}
                className="px-3 py-2 bg-gray-700/70 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-lg font-medium transition-all flex items-center space-x-2 text-sm cursor-pointer"
              >
                <Undo2 className="w-4 h-4" />
                <span>{discardText}</span>
              </button>
            )}

            {showReset && onReset && (
              <button
                onClick={onReset}
                disabled={saving}
                className="px-4 py-2 cursor-pointer bg-red-600/80 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center space-x-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{resetText}</span>
              </button>
            )}

            <button
              onClick={onSave}
              disabled={saving || !hasChanges}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center space-x-2 shadow-lg text-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : saveText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
