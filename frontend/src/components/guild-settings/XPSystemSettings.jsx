// frontend/src/components/guild-settings/XPSystemSettings.jsx
import { Zap } from 'lucide-react';
import { useGeneralSettings } from '../../hooks/useGeneralSettings';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { useRoleSettings } from '../../hooks/useRoleSettings';
import { StickyActionBar } from '../ui/StickyActionBar';
import { StyledSelect } from '../ui/StyledSelect';
import { XPMultiplier } from './XPMultiplier';
import { IgnoredChannels } from './IgnoredChannels';
import { LevelUpConfig } from './LevelUpConfig';
import { AddLevelRole } from './AddLevelRole';
import { LevelRolesList } from './LevelRolesList';
import { ImageBannerSettings } from './ImageBannerSettings';
import { InfoAlert } from '../ui/InfoAlert';

export function XPSystemSettings({ guildId, config, channels, roles }) {
  // Hooks para cada subsección
  const generalSettings = useGeneralSettings(guildId, config);
  const notificationSettings = useNotificationSettings(guildId, config);
  const roleSettings = useRoleSettings(guildId, config);

  // Combinar el estado de cambios
  const hasChanges = 
    generalSettings.hasChanges || 
    notificationSettings.hasChanges || 
    roleSettings.hasChanges;

  // Combinar el estado de guardando
  const saving = 
    generalSettings.saving || 
    notificationSettings.saving || 
    roleSettings.saving;

  // Función para guardar todo
  const handleSaveAll = async () => {
    const results = await Promise.all([
      generalSettings.save(),
      notificationSettings.save(),
      roleSettings.save()
    ]);
    
    return results.every(r => r === true);
  };

  // Función para resetear/descartar cambios
  const handleReset = () => {
    if (confirm('¿Estás seguro de descartar todos los cambios?')) {
      window.location.reload();
    }
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
        onReset={handleReset}
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