// frontend/src/components/guild-settings/XPSystemSettings.jsx
import { Zap } from 'lucide-react';
import { useGuildSettings } from '../../hooks/useGuildSettings';
import { StickyActionBar } from '../ui/StickyActionBar';
import { XPMultiplier } from './XPMultiplier';
import { IgnoredChannels } from './IgnoredChannels';
import { LevelUpConfig } from './LevelUpConfig';
import { AddLevelRole } from './AddLevelRole';
import { LevelRolesList } from './LevelRolesList';
import { ImageBannerSettings } from './ImageBannerSettings';
import { InfoAlert } from '../ui/InfoAlert';

export function XPSystemSettings() {
  // Las tres secciones comparten la instancia del contexto: antes este
  // componente creaba una copia propia de los hooks, así que el sidebar
  // vigilaba un estado que nadie estaba editando.
  const {
    guildId,
    channels,
    roles,
    general: generalSettings,
    notifications: notificationSettings,
    levelRoles: roleSettings
  } = useGuildSettings();

  const hasChanges =
    generalSettings.hasChanges ||
    notificationSettings.hasChanges ||
    roleSettings.hasChanges;

  const saving =
    generalSettings.saving ||
    notificationSettings.saving ||
    roleSettings.saving;

  const handleSaveAll = async () => {
    // Solo se guarda lo que cambió: cada POST deja una entrada en el audit log.
    const pending = [];
    if (generalSettings.hasChanges) pending.push(generalSettings.save());
    if (notificationSettings.hasChanges) pending.push(notificationSettings.save());
    if (roleSettings.hasChanges) pending.push(roleSettings.save());

    const results = await Promise.all(pending);
    return results.every(result => result === true);
  };

  // Descartar ya no recarga la página: vuelve al último valor guardado.
  const handleReset = () => {
    generalSettings.discard();
    notificationSettings.discard();
    roleSettings.discard();
  };

  const getChannelName = (channelId) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? channel.name : channelId;
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Rol desconocido';
  };

  return (
    <div className="space-y-6">
      {/* Sticky Action Bar */}
      <StickyActionBar
        hasChanges={hasChanges}
        saving={saving}
        onSave={handleSaveAll}
        onDiscard={handleReset}
        showReset={false}
        saveText="Guardar Toda la Configuración"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Zap className="w-8 h-8 text-yellow-400" />
            <span>Sistema XP</span>
          </h2>
          <p className="text-gray-400 mt-1">
            Configura el sistema de experiencia y progresión de tu servidor
          </p>
        </div>
      </div>

      {/* Información general */}
      <InfoAlert
        title="Sistema de experiencia"
        variant="blue"
        items={[
          'Los usuarios ganan XP por enviar mensajes (con cooldown de 60 segundos)',
          'El multiplicador afecta la velocidad de progresión de todos los usuarios',
          'Los canales ignorados no otorgan XP',
          'Los roles de nivel se asignan automáticamente al alcanzar el nivel requerido'
        ]}
      />

      {/* Multiplicador de XP */}
      <XPMultiplier 
        multiplier={generalSettings.multiplier} 
        setMultiplier={generalSettings.setMultiplier} 
      />

      {/* Canales Ignorados */}
      <IgnoredChannels
        channels={channels}
        ignoredChannels={generalSettings.ignoredChannels}
        selectedChannel={generalSettings.selectedChannel}
        setSelectedChannel={generalSettings.setSelectedChannel}
        onAdd={generalSettings.addIgnoredChannel}
        onRemove={generalSettings.removeIgnoredChannel}
        getChannelName={getChannelName}
      />

      {/* Separador */}
      <div className="border-t border-gray-700 my-8"></div>

      {/* Notificaciones de Level Up */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">📢 Notificaciones de Nivel</h2>
        <LevelUpConfig
          enabled={notificationSettings.levelUpEnabled}
          setEnabled={notificationSettings.setLevelUpEnabled}
          channel={notificationSettings.levelUpChannel}
          setChannel={notificationSettings.setLevelUpChannel}
          message={notificationSettings.levelUpMsg}
          setMessage={notificationSettings.setLevelUpMsg}
          channels={channels}
        />
      </div>

      {/* Separador */}
      <div className="border-t border-gray-700 my-8"></div>

      {/* Roles de Nivel */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">🎖️ Roles de Nivel</h2>
        
        <AddLevelRole
          roles={roles}
          selectedRole={roleSettings.selectedRoleForLevel}
          setSelectedRole={roleSettings.setSelectedRoleForLevel}
          selectedLevel={roleSettings.selectedLevelForRole}
          setSelectedLevel={roleSettings.setSelectedLevelForRole}
          onAdd={roleSettings.addLevelRole}
          isRoleUsed={roleSettings.isRoleUsed}
          isLevelUsed={roleSettings.isLevelUsed}
        />

        <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Roles Configurados</h3>
            <span className="text-sm text-gray-400">
              {roleSettings.getSortedRoles().length} {roleSettings.getSortedRoles().length === 1 ? 'rol' : 'roles'}
            </span>
          </div>

          <LevelRolesList
            levelRoles={roleSettings.getSortedRoles()}
            onRemove={roleSettings.removeLevelRole}
            getRoleName={getRoleName}
          />

          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-white font-medium text-sm">Apilar roles</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Activado: el usuario conserva todos los roles de niveles anteriores.<br/>
                Desactivado: solo mantiene el rol del nivel más alto alcanzado.
              </p>
            </div>
            <button
              onClick={() => roleSettings.setStackRoles(!roleSettings.stackRoles)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                roleSettings.stackRoles ? 'bg-indigo-500' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                roleSettings.stackRoles ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <InfoAlert
          title="¿Cómo funcionan los roles de nivel?"
          items={[
            'Los roles se asignan automáticamente cuando un usuario alcanza el nivel especificado',
            'Los usuarios mantienen todos los roles de niveles inferiores que hayan alcanzado',
            'Asegúrate de que el bot tenga permisos para gestionar roles',
            'El rol del bot debe estar por encima de los roles que desea asignar'
          ]}
          variant="blue"
        />
      </div>

      {/* Separador */}
      <div className="border-t border-gray-700 my-8"></div>

      {/* Imagen de Rank Card */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">🎨 Banner de Rank Card</h2>
        <ImageBannerSettings guildId={guildId} type="rank-card" />
      </div>
    </div>
  );
}