import React, { useState } from 'react';
import { useAutoRoles } from '../../hooks/useAutoRoles';
import { StickyActionBar } from '../ui/StickyActionBar';
import { StyledSelect } from '../ui/StyledSelect';
import { SectionCard } from '../ui/SectionCard';
import { InfoAlert } from '../ui/InfoAlert';
import { Shield, UserPlus, Crown, MessageCircle, Plus, X, Hash } from 'lucide-react';

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

  const [selectedRole, setSelectedRole] = useState('');

  const handleAddRole = () => {
    if (!selectedRole) return;
    if (addRoleToSettings(selectedRole)) {
      setSelectedRole('');
    }
  };

  const handleSave = async () => {
    await saveSettings();
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de descartar los cambios?')) {
      resetSettings();
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <UserPlus className="w-8 h-8 text-blue-400" />
              <span>Auto-Roles</span>
            </h2>
            <p className="text-gray-400 mt-1">
              Configura roles automáticos para nuevos miembros
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  // Preparar opciones para los selects
  const channelOptions = channels.map(ch => ({ id: ch.id, name: `# ${ch.name}` }));
  const availableRoles = roles
    .filter(r => !settings.roles.includes(r.id))
    .map(r => ({ id: r.id, name: r.name }));

  return (
    <div className="space-y-6">
      {/* Sticky Action Bar */}
      <StickyActionBar
        hasChanges={hasChanges}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
        saveText="Guardar Configuración"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <UserPlus className="w-8 h-8 text-blue-400" />
            <span>Auto-Roles</span>
          </h2>
          <p className="text-gray-400 mt-1">
            Configura roles automáticos para nuevos miembros
          </p>
        </div>
      </div>

      {/* Información */}
      <InfoAlert
        title="¿Cómo funcionan los auto-roles?"
        variant="blue"
        items={[
          'Los bots y aplicaciones de Discord son ignorados automáticamente',
          'Los roles se asignan cuando un nuevo usuario se une al servidor',
          'Si un usuario regresa y tenía XP previo, se le restaurarán sus roles de nivel',
          'El bot debe tener permisos suficientes para gestionar los roles seleccionados'
        ]}
      />

      {/* Estado de Auto-Roles */}
      <SectionCard
        icon={Shield}
        iconBgColor="bg-green-500/20"
        iconColor="text-green-400"
        title="Estado de Auto-Roles"
        description="Habilita o deshabilita la asignación automática de roles"
      >
        <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
          <div>
            <p className="text-white font-medium">Habilitar auto-roles</p>
            <p className="text-sm text-gray-400">
              Activar asignación automática de roles a nuevos miembros
            </p>
          </div>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              settings.enabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </SectionCard>

      {/* Restaurar Roles de Nivel */}
      <SectionCard
        icon={Crown}
        iconBgColor="bg-yellow-500/20"
        iconColor="text-yellow-400"
        title="Restaurar Roles de Nivel"
        description="Restaura automáticamente los roles de nivel cuando un usuario regresa"
      >
        <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
          <div>
            <p className="text-white font-medium">Habilitar restauración de roles de nivel</p>
            <p className="text-sm text-gray-400">
              Si un usuario regresa y ya tenía XP previo, se le asignarán automáticamente los roles correspondientes
            </p>
          </div>
          <button
            onClick={() => updateSettings({ restoreLevelRoles: !settings.restoreLevelRoles })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              settings.restoreLevelRoles ? 'bg-yellow-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.restoreLevelRoles ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </SectionCard>

      {/* Roles por Defecto */}
      <SectionCard
        icon={Shield}
        iconBgColor="bg-purple-500/20"
        iconColor="text-purple-400"
        title="Roles por Defecto"
        description="Estos roles se asignarán a todos los nuevos miembros (excepto bots)"
      >
        <div className="space-y-4">
          {/* Agregar Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Agregar rol
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <StyledSelect
                  value={selectedRole}
                  onChange={setSelectedRole}
                  options={availableRoles}
                  placeholder="Selecciona un rol..."
                  icon={Shield}
                />
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
            <p className="text-xs text-gray-400 mt-1">
              Selecciona un rol para agregarlo a la lista de roles automáticos
            </p>
          </div>

          {/* Lista de Roles */}
          {settings.roles.length === 0 ? (
            <div className="text-center py-8 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
              <Shield className="w-12 h-12 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 font-medium">No hay roles configurados</p>
              <p className="text-gray-500 text-sm mt-1">Agrega roles para que se asignen automáticamente</p>
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
                    title="Eliminar rol"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Mensaje de Bienvenida */}
      <SectionCard
        icon={MessageCircle}
        iconBgColor="bg-green-500/20"
        iconColor="text-green-400"
        title="Mensaje de Bienvenida (Opcional)"
        description="Envía un mensaje automático cuando un nuevo usuario se une"
      >
        <div className="space-y-4">
          {/* Canal de Bienvenida */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Canal de bienvenida
            </label>
            <StyledSelect
              value={settings.welcomeChannelId || ''}
              onChange={(val) => updateSettings({ welcomeChannelId: val || null })}
              options={[
                { id: '', name: 'Sin mensaje de bienvenida' },
                ...channelOptions
              ]}
              placeholder="Selecciona un canal"
              icon={Hash}
            />
            <p className="text-xs text-gray-400 mt-1">
              Canal donde se enviará el mensaje de bienvenida automático
            </p>
          </div>

          {/* Mensaje */}
          {settings.welcomeChannelId && (
            <div>
              <label htmlFor="welcome-message" className="block text-sm font-medium text-gray-300 mb-2">
                Mensaje de bienvenida
              </label>
              <textarea
                id="welcome-message"
                value={settings.welcomeMessage}
                onChange={(e) => updateSettings({ welcomeMessage: e.target.value })}
                rows={3}
                maxLength={2000}
                className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="👋 ¡Bienvenido {mention} al servidor!"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">
                  Variables: {'{mention}'}, {'{username}'}, {'{server}'}
                </p>
                <p className="text-xs text-gray-500">
                  {settings.welcomeMessage?.length || 0}/2000
                </p>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}