import React from 'react';
import { useAutoRoles } from '../../hooks/useAutoRoles';
import { UnsavedChangesAlert } from '../ui/UnsavedChangesAlert';
import { SaveButton } from '../ui/SaveButton';
import { Shield, UserPlus, Crown, MessageCircle, Plus, X } from 'lucide-react';

export function AutoRolesSettings({ guildId, config, channels, roles }) {
  const {
    settings,
    loading,
    saving,
    hasChanges,
    updateSettings,
    saveSettings,
    resetSettings,
    addRole: addRoleToSettings,
    removeRole
  } = useAutoRoles(guildId, config);

  const [selectedRole, setSelectedRole] = React.useState('');

  const handleAddRole = () => {
    if (!selectedRole) return;
    if (addRoleToSettings(selectedRole)) {
      setSelectedRole('');
    }
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Rol desconocido';
  };

  const getRoleColor = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.color || '#99aab5';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <UserPlus className="w-8 h-8 text-blue-400" />
          Auto-Roles
        </h1>
        <p className="text-gray-400">
          Configura roles automáticos para nuevos miembros
        </p>
      </div>

      <UnsavedChangesAlert show={hasChanges} />

      {/* Enable/Disable Toggle */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Estado de Auto-Roles
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Habilita o deshabilita la asignación automática de roles
            </p>
          </div>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
              settings.enabled ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Restore Level Roles */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-start gap-4">
          <Crown className="w-6 h-6 text-yellow-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              Restaurar Roles de Nivel
            </h3>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              Si un usuario regresa al servidor y ya tenía XP previo, se le asignarán automáticamente los roles de nivel correspondientes
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.restoreLevelRoles}
                onChange={(e) => updateSettings({ restoreLevelRoles: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800 cursor-pointer"
              />
              <span className="text-white">Habilitar restauración de roles de nivel</span>
            </label>
          </div>
        </div>
      </div>

      {/* Default Roles */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Roles por Defecto
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Estos roles se asignarán a todos los nuevos miembros (excepto bots)
        </p>

        {/* Add Role */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-gray-700/50 border-2 border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">Selecciona un rol...</option>
              {roles
                .filter(r => !settings.roles.includes(r.id))
                .map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <button
            onClick={handleAddRole}
            disabled={!selectedRole}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </div>

        {/* Roles List */}
        {settings.roles.length === 0 ? (
          <div className="text-center py-8 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
            <Shield className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 font-medium">No hay roles configurados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {settings.roles.map(roleId => (
              <div
                key={roleId}
                className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3 border-2 border-gray-600 hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getRoleColor(roleId) }}
                  />
                  <span className="text-white font-medium">
                    {getRoleName(roleId)}
                  </span>
                </div>
                <button
                  onClick={() => removeRole(roleId)}
                  className="text-red-400 hover:text-red-300 transition-colors cursor-pointer p-2 hover:bg-red-500/20 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Welcome Message */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-400" />
          Mensaje de Bienvenida (Opcional)
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Canal de Bienvenida
            </label>
            <div className="relative">
              <select
                value={settings.welcomeChannelId || ''}
                onChange={(e) => updateSettings({ welcomeChannelId: e.target.value || null })}
                className="w-full bg-gray-700/50 border-2 border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">Sin mensaje de bienvenida</option>
                {channels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    # {channel.name}
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

          {settings.welcomeChannelId && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mensaje
              </label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => updateSettings({ welcomeMessage: e.target.value })}
                rows={3}
                className="w-full bg-gray-700/50 border-2 border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none cursor-text"
                placeholder="👋 ¡Bienvenido {mention} al servidor!"
              />
              <p className="text-gray-400 text-xs mt-2">
                Variables disponibles: <code className="bg-gray-700 px-1 rounded">{'{mention}'}</code>,{' '}
                <code className="bg-gray-700 px-1 rounded">{'{username}'}</code>,{' '}
                <code className="bg-gray-700 px-1 rounded">{'{server}'}</code>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
        <h4 className="text-blue-300 font-medium mb-2">ℹ️ Información</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Los bots y aplicaciones de Discord son ignorados automáticamente</li>
          <li>• Si un usuario regresa y tenía XP, se le restaurarán sus roles de nivel</li>
          <li>• Los roles por defecto se asignan a todos los nuevos miembros humanos</li>
          <li>• El bot debe tener permisos para gestionar los roles seleccionados</li>
        </ul>
      </div>

      <SaveButton 
        onClick={saveSettings} 
        saving={saving} 
        hasChanges={hasChanges}
        text="Guardar Configuración"
      />
    </div>
  );
}