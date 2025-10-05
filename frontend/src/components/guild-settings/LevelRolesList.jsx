// frontend/src/components/guild-settings/LevelRolesList.jsx
import { Award, Shield, Trash2 } from 'lucide-react';

export function LevelRolesList({ levelRoles, onRemove, getRoleName }) {
  if (levelRoles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
        <Shield className="w-16 h-16 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 font-medium mb-1">No hay roles configurados</p>
        <p className="text-gray-500 text-sm">
          Agrega un rol para que se asigne automáticamente cuando los usuarios alcancen cierto nivel
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {levelRoles.map(lr => (
        <div
          key={lr.level}
          className="flex items-center justify-between bg-gray-700/50 px-4 py-4 rounded-lg border-2 border-gray-600 hover:border-indigo-500/50 transition-all group"
        >
          <div className="flex items-center space-x-4">
            {/* Nivel Badge */}
            <div className="bg-indigo-500/20 px-4 py-2 rounded-lg border border-indigo-500/50">
              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium">Nivel</p>
                <p className="text-2xl font-bold text-indigo-400">{lr.level}</p>
              </div>
            </div>

            {/* Arrow */}
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>

            {/* Rol Badge */}
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-white font-medium">{getRoleName(lr.roleId)}</p>
                <p className="text-gray-400 text-xs">Se asigna al alcanzar nivel {lr.level}</p>
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => onRemove(lr.level)}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </div>
      ))}
    </div>
  );
}