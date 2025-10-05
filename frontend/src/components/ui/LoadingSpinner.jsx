// frontend/src/components/ui/LoadingSpinner.jsx
export function LoadingSpinner({ text = 'Cargando...' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-gray-400">{text}</p>
      </div>
    </div>
  );
}