// frontend/src/hooks/useRoleSettings.js
import { useState } from 'react';
import { guildService, getApiError } from '../services/api';
import { toast } from 'react-hot-toast';
import { useDraft } from './useDraft';
import { useGuildInvalidation } from './queries';

export function useRoleSettings(guildId, config) {
  const saved = {
    levelRoles: (config?.levelRoles ?? []).map(({ level, roleId }) => ({ level, roleId })),
    stackRoles: config?.stackRoles ?? false
  };

  const { draft, setDraft, hasChanges, markSaved, discard } = useDraft(saved);
  const [selectedRoleForLevel, setSelectedRoleForLevel] = useState('');
  const [selectedLevelForRole, setSelectedLevelForRole] = useState('1');
  const [saving, setSaving] = useState(false);
  const { invalidateConfig } = useGuildInvalidation(guildId);

  const isRoleUsed = (roleId) => draft.levelRoles.some(lr => lr.roleId === roleId);
  const isLevelUsed = (level) => draft.levelRoles.some(lr => lr.level === parseInt(level, 10));

  const addLevelRole = () => {
    if (!selectedRoleForLevel || !selectedLevelForRole) return;

    const level = parseInt(selectedLevelForRole, 10);

    if (isLevelUsed(level)) {
      toast.error('Ya existe un rol asignado a este nivel');
      return;
    }

    setDraft(prev => ({
      ...prev,
      levelRoles: [...prev.levelRoles, { level, roleId: selectedRoleForLevel }]
    }));
    setSelectedRoleForLevel('');
    setSelectedLevelForRole('1');
  };

  const removeLevelRole = (level) => {
    setDraft(prev => ({
      ...prev,
      levelRoles: prev.levelRoles.filter(lr => lr.level !== level)
    }));
  };

  // Copia antes de ordenar: `sort()` sobre el estado lo reordenaba in place.
  const getSortedRoles = () => [...draft.levelRoles].sort((a, b) => a.level - b.level);

  const save = async () => {
    setSaving(true);
    try {
      await guildService.updateLevelRoles(guildId, draft.levelRoles, draft.stackRoles);

      markSaved();
      await invalidateConfig();
      toast.success('✅ Roles de nivel guardados correctamente');
      return true;
    } catch (error) {
      console.error('Error guardando roles:', error);
      toast.error(getApiError(error, 'Error al guardar los roles'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    levelRoles: draft.levelRoles,
    stackRoles: draft.stackRoles,
    setStackRoles: (value) => setDraft(prev => ({ ...prev, stackRoles: value })),
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
    discard,

    saving,
    hasChanges
  };
}
