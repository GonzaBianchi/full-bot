// frontend/src/components/ui/UnsavedChangesAlert.jsx
import { AlertCircle } from 'lucide-react';

export function UnsavedChangesAlert({ show }) {
  if (!show) return null;

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start space-x-3">
      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-yellow-300 font-medium">Tienes cambios sin guardar</p>
        <p className="text-yellow-400/80 text-sm mt-1">No olvides guardar tus cambios antes de salir</p>
      </div>
    </div>
  );
}