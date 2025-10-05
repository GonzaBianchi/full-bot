// frontend/src/components/guild-settings/RoleSettings.jsx
import { Award } from 'lucide-react';
import { useRoleSettings } from '../../hooks/useRoleSettings';
import { UnsavedChangesAlert } from '../ui/UnsavedChangesAlert';
import { SaveButton } from '../ui/SaveButton';
import { InfoAlert } from '../ui/InfoAlert';
import { AddLevelRole } from './AddLevelRole';
import { LevelRolesList } from './LevelRolesList';

export function RoleSettings({ guildId, config, roles }) {
  const {
    levelRoles,
    selectedRoleForLevel,
    setSelectedRoleForLevel,
    selectedLevelForRole,
    setSelectedLevelForRole,
    addLevelRole,
    removeLevelRole,
    getSortedRoles,
    isRoleUsed,
    isLevelUsed,
    save,
    saving,
    hasChanges
  } = useRoleSettings(guildId, config);

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Rol desconocido';
  };

  const infoItems = [
    'Los roles se asignan automáticamente cuando un usuario alcanza el nivel especificado',
    'Los usuarios mantienen todos los roles de niveles inferiores que hayan alcanzado',
    'Asegúrate de que el bot tenga permisos para gestionar roles',
    'El rol del bot debe estar por encima de los roles que desea asignar'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Roles de Nivel</h1>
        <p className="text-gray-400">Asigna roles automáticamente cuando los usuarios alcancen ciertos niveles</p>
      </div>

      <UnsavedChangesAlert show={hasChanges} />

      <AddLevelRole
        roles={roles}
        selectedRole={selectedRoleForLevel}
        setSelectedRole={setSelectedRoleForLevel}
        selectedLevel={selectedLevelForRole}
        setSelectedLevel={setSelectedLevelForRole}
        onAdd={addLevelRole}
        isRoleUsed={isRoleUsed}
        isLevelUsed={isLevelUsed}
      />

      {/* Lista de roles configurados */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <Award className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Roles Configurados</h3>
          </div>
          <span className="text-sm text-gray-400">
            {getSortedRoles().length} {getSortedRoles().length === 1 ? 'rol' : 'roles'}
          </span>
        </div>

        <LevelRolesList
          levelRoles={getSortedRoles()}
          onRemove={removeLevelRole}
          getRoleName={getRoleName}
        />
      </div>

      <InfoAlert
        title="¿Cómo funciona?"
        items={infoItems}
        variant="blue"
      />

      <SaveButton 
        onClick={save} 
        saving={saving} 
        hasChanges={hasChanges}
        text="Guardar Configuración"
      />
    </div>
  );
}