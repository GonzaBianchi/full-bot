// frontend/src/hooks/useAutoRoles.js
import { useState } from 'react';
import { autoRolesService, getApiError } from '../services/api';
import toast from 'react-hot-toast';
import { useDraft } from './useDraft';
import { useGuildInvalidation } from './queries';

const DEFAULTS = {
  enabled: false,
  roles: [],
  restoreLevelRoles: true,
  welcomeChannelId: null,
  welcomeMessage: '👋 ¡Bienvenido {mention} al servidor!'
};

/**
 * `GET /config` ya devuelve el documento completo del guild, así que el bloque
 * `autoRoles` viene incluido: pedirlo otra vez a `/config/auto-roles` era una
 * petición redundante en cada montaje.
 */
export function useAutoRoles(guildId, config) {
  const { draft: settings, setDraft, hasChanges, markSaved, discard } = useDraft(
    config?.autoRoles ?? DEFAULTS
  );
  const [saving, setSaving] = useState(false);
  const { invalidateConfig } = useGuildInvalidation(guildId);

  const updateSettings = (updates) => setDraft(prev => ({ ...prev, ...updates }));

  const addRole = (roleId) => {
    if (settings.roles.includes(roleId)) {
      toast.error('Este rol ya está agregado');
      return false;
    }
    setDraft(prev => ({ ...prev, roles: [...prev.roles, roleId] }));
    return true;
  };

  const removeRole = (roleId) => {
    setDraft(prev => ({ ...prev, roles: prev.roles.filter(r => r !== roleId) }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await autoRolesService.update(guildId, settings);
      markSaved();
      await invalidateConfig();
      toast.success('✅ Configuración guardada correctamente');
      return true;
    } catch (error) {
      console.error('Error saving auto-roles config:', error);
      toast.error(getApiError(error, 'Error al guardar configuración'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    discard();
    toast.success('Cambios descartados');
  };

  return {
    settings,
    loading: false,
    saving,
    hasChanges,
    updateSettings,
    saveSettings,
    resetSettings,
    addRole,
    removeRole
  };
}
