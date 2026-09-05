// frontend/src/hooks/useGeneralSettings.js
import { useState } from 'react';
import { guildService, getApiError } from '../services/api';
import { toast } from 'react-hot-toast';
import { useDraft } from './useDraft';
import { useGuildInvalidation } from './queries';

export function useGeneralSettings(guildId, config) {
  const saved = {
    multiplier: String(config?.xpMultiplier ?? 1),
    ignoredChannels: config?.ignoredChannels ?? []
  };

  const { draft, setDraft, hasChanges, markSaved, discard } = useDraft(saved);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [saving, setSaving] = useState(false);
  const { invalidateConfig } = useGuildInvalidation(guildId);

  const setMultiplier = (value) => setDraft(prev => ({ ...prev, multiplier: value }));

  const addIgnoredChannel = () => {
    if (!selectedChannel || draft.ignoredChannels.includes(selectedChannel)) return;
    setDraft(prev => ({ ...prev, ignoredChannels: [...prev.ignoredChannels, selectedChannel] }));
    setSelectedChannel('');
  };

  const removeIgnoredChannel = (channelId) => {
    setDraft(prev => ({
      ...prev,
      ignoredChannels: prev.ignoredChannels.filter(id => id !== channelId)
    }));
  };

  const save = async () => {
    const multiplier = parseFloat(draft.multiplier);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      toast.error('El multiplicador debe ser un número mayor que 0');
      return false;
    }

    setSaving(true);
    try {
      // Cada POST escribe una entrada en el audit log del servidor: mandar solo
      // lo que cambió evita llenarlo de cambios que no ocurrieron.
      const requests = [];
      if (draft.multiplier !== saved.multiplier) {
        requests.push(guildService.updateMultiplier(guildId, multiplier));
      }
      if (JSON.stringify(draft.ignoredChannels) !== JSON.stringify(saved.ignoredChannels)) {
        requests.push(guildService.updateIgnoredChannels(guildId, draft.ignoredChannels));
      }

      if (requests.length > 0) {
        await Promise.all(requests);
        await invalidateConfig();
      }

      markSaved();
      toast.success('✅ Configuración general guardada correctamente');
      return true;
    } catch (error) {
      console.error('Error guardando:', error);
      toast.error(getApiError(error, 'Error al guardar la configuración'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    multiplier: draft.multiplier,
    setMultiplier,
    ignoredChannels: draft.ignoredChannels,
    selectedChannel,
    setSelectedChannel,

    addIgnoredChannel,
    removeIgnoredChannel,
    save,
    discard,

    saving,
    hasChanges
  };
}
