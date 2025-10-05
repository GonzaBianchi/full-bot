// frontend/src/components/guild-settings/AddLevelRole.jsx
import { Plus } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';

export function AddLevelRole({ 
  roles,
  selectedRole,
  setSelectedRole,
  selectedLevel,
  setSelectedLevel,
  onAdd,
  isRoleUsed,
  isLevelUsed
}) {
  const availableRoles = roles.filter(r => !isRoleUsed(r.id));
  const levelUsed = isLevelUsed(selectedLevel);
  const canAdd = selectedRole && selectedLevel && !levelUsed;

  return (
    <SectionCard
      icon={Plus}
      iconBgColor="bg-green-500/20"
      iconColor="text-green-400"
      title="Agregar Rol de Nivel"
      description="Selecciona un rol y el nivel requerido para obtenerlo"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selector de Nivel */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nivel requerido
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            placeholder="Ej: 5"
          />
          {levelUsed && (
            <p className="text-red-400 text-xs mt-1">Este nivel ya tiene un rol asignado</p>
          )}
        </div>

        {/* Selector de Rol */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rol a asignar
          </label>
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            >
              <option value="" className="bg-gray-800">Seleccionar rol...</option>
              {availableRoles.map(r => (
                <option key={r.id} value={r.id} className="bg-gray-800">
                  {r.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onAdd}
        disabled={!canAdd}
        className="mt-4 w-full px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
      >
        <Plus className="w-5 h-5" />
        <span>Agregar Rol de Nivel</span>
      </button>
    </SectionCard>
  );
}