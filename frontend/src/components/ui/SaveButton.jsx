// frontend/src/components/ui/SaveButton.jsx
import { Save } from 'lucide-react';

export function SaveButton({ onClick, saving, hasChanges, text = 'Guardar Cambios' }) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onClick}
        disabled={saving || !hasChanges}
        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg"
      >
        <Save className="w-5 h-5" />
        <span>{saving ? 'Guardando...' : text}</span>
      </button>
    </div>
  );
}