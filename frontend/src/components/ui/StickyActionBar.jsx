// frontend/src/components/ui/StickyActionBar.jsx
import { AlertCircle, Save, RotateCcw } from 'lucide-react';

export function StickyActionBar({ 
  hasChanges, 
  saving, 
  onSave, 
  onReset,
  showReset = true,
  saveText = "Guardar Cambios",
  resetText = "Resetear"
}) {
  return (
    <>
      {/* Alerta de cambios sin guardar - Sticky */}
      {hasChanges && (
        <div className="sticky top-0 z-40 bg-yellow-500/10 border-b border-yellow-500/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 font-medium text-sm">Tienes cambios sin guardar</p>
                <p className="text-yellow-400/80 text-xs">No olvides guardar antes de salir</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción - Sticky */}
      <div className="sticky top-0 z-50 bg-gray-900/95 border-b border-gray-700/50 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <div className="flex items-center space-x-2 text-yellow-400 text-sm">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="font-medium">Cambios pendientes</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {showReset && (
                <button
                  onClick={onReset}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600/80 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center space-x-2 text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{resetText}</span>
                </button>
              )}

              <button
                onClick={onSave}
                disabled={saving || !hasChanges}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center space-x-2 shadow-lg text-sm"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : saveText}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}