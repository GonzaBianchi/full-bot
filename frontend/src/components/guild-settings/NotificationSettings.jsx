// frontend/src/components/guild-settings/NotificationSettings.jsx
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { UnsavedChangesAlert } from '../ui/UnsavedChangesAlert';
import { SaveButton } from '../ui/SaveButton';
import { LevelUpConfig } from './LevelUpConfig';

export function NotificationSettings({ guildId, config, channels }) {
  const {
    levelUpEnabled,
    setLevelUpEnabled,
    levelUpChannel,
    setLevelUpChannel,
    levelUpMsg,
    setLevelUpMsg,
    save,
    saving,
    hasChanges
  } = useNotificationSettings(guildId, config);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Notificaciones de Nivel</h1>
        <p className="text-gray-400">Configura cómo se anuncian los cambios de nivel</p>
      </div>

      <UnsavedChangesAlert show={hasChanges} />

      <LevelUpConfig
        enabled={levelUpEnabled}
        setEnabled={setLevelUpEnabled}
        channel={levelUpChannel}
        setChannel={setLevelUpChannel}
        message={levelUpMsg}
        setMessage={setLevelUpMsg}
        channels={channels}
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