// frontend/src/components/layout/ErrorBoundary.jsx
import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Sin esto, cualquier excepción durante el render dejaba la pantalla en blanco
 * y el error solo en la consola.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error no controlado en el panel:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-red-500/30 p-6 text-center">
          <div className="bg-red-500/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Algo se rompió</h1>
          <p className="text-gray-400 text-sm mb-6">
            Ocurrió un error inesperado al mostrar esta sección. Podés recargar
            la página; si vuelve a pasar, revisá la consola del navegador.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Recargar</span>
          </button>
        </div>
      </div>
    );
  }
}
