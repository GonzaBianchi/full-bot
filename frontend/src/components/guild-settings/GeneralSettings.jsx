// frontend/src/components/guild-settings/GeneralSettings.jsx
import { useGeneralSettings } from '../../hooks/useGeneralSettings';
import { UnsavedChangesAlert } from '../ui/UnsavedChangesAlert';
import { SaveButton } from '../ui/SaveButton';
import { XPMultiplier } from './XPMultiplier';
import { IgnoredChannels } from './IgnoredChannels';

export function GeneralSettings({ guildId, config, channels }) {
  const {
    multiplier,
    setMultiplier,
    ignoredChannels,
    selectedChannel,
    setSelectedChannel,
    addIgnoredChannel,
    removeIgnoredChannel,
    save,
    saving,
    hasChanges
  } = useGeneralSettings(guildId, config);

  const getChannelName = (channelId) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? channel.name : channelId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuración General</h1>
        <p className="text-gray-400">Ajusta el multiplicador de XP y canales ignorados</p>
      </div>

      <UnsavedChangesAlert show={hasChanges} />

      <XPMultiplier 
        multiplier={multiplier} 
        setMultiplier={setMultiplier} 
      />

      <IgnoredChannels
        channels={channels}
        ignoredChannels={ignoredChannels}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        onAdd={addIgnoredChannel}
        onRemove={removeIgnoredChannel}
        getChannelName={getChannelName}
      />

      <SaveButton 
        onClick={save} 
        saving={saving} 
        hasChanges={hasChanges}
      />
    </div>
  );
}