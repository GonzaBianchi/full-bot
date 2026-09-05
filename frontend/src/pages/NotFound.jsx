// frontend/src/pages/NotFound.jsx
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

function NotFound() {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="text-center">
        <div className="bg-indigo-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Compass className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-gray-400 mb-6">Esta página no existe.</p>
        <Link
          to="/"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
