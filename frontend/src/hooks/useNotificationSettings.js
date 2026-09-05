// frontend/src/hooks/useNotificationSettings.js
import { useState } from 'react';
import { guildService, getApiError } from '../services/api';
import { toast } from 'react-hot-toast';
import { useDraft } from './useDraft';
import { useGuildInvalidation } from './queries';

const DEFAULT_MESSAGE = '🎉 {mention} ha subido al nivel {level}!';

export function useNotificationSettings(guildId, config) {
  const saved = {
    enabled: config?.levelUpEnabled ?? true,
    channelId: config?.levelUpChannelId ?? '',
    message: config?.levelUpMessage || DEFAULT_MESSAGE
  };

  const { draft, setDraft, hasChanges, markSaved, discard } = useDraft(saved);
  const [saving, setSaving] = useState(false);
  const { invalidateConfig } = useGuildInvalidation(guildId);

  const save = async () => {
    // El backend exige entre 1 y 500 caracteres: cortarlo acá evita un 400.
    if (draft.message.trim().length === 0) {
      toast.error('El mensaje de nivel no puede quedar vacío');
      return false;
    }

    setSaving(true);
    try {
      await guildService.updateLevelUp(guildId, {
        enabled: draft.enabled,
        channelId: draft.channelId || null,
        message: draft.message
      });

      markSaved();
      await invalidateConfig();
      toast.success('✅ Notificaciones guardadas correctamente');
      return true;
    } catch (error) {
      console.error('Error guardando:', error);
      toast.error(getApiError(error, 'Error al guardar las notificaciones'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    levelUpEnabled: draft.enabled,
    setLevelUpEnabled: (value) => setDraft(prev => ({ ...prev, enabled: value })),
    levelUpChannel: draft.channelId,
    setLevelUpChannel: (value) => setDraft(prev => ({ ...prev, channelId: value })),
    levelUpMsg: draft.message,
    setLevelUpMsg: (value) => setDraft(prev => ({ ...prev, message: value })),

    save,
    discard,

    saving,
    hasChanges
  };
}
