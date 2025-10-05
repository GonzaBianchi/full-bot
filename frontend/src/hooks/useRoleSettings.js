// frontend/src/hooks/useRoleSettings.js
import { useState, useEffect } from 'react';
import { guildService } from '../services/api';
import { toast } from 'react-hot-toast';
import { useUnsavedChanges } from './useUnsavedChanges';

export function useRoleSettings(guildId, config) {
  // Estados actuales
  const [levelRoles, setLevelRoles] = useState([]);
  const [selectedRoleForLevel, setSelectedRoleForLevel] = useState('');
  const [selectedLevelForRole, setSelectedLevelForRole] = useState('1');
  
  // Estados originales
  const [originalLevelRoles, setOriginalLevelRoles] = useState([]);
  
  const [saving, setSaving] = useState(false);

  // Inicializar valores
  useEffect(() => {
    if (config) {
      const roles = config.levelRoles || [];
      setLevelRoles(roles);
      setOriginalLevelRoles([...roles]);
    }
  }, [config]);

  // Detectar cambios
  const hasChanges = useUnsavedChanges(levelRoles, originalLevelRoles);

  // Verificar si un rol ya está siendo usado
  const isRoleUsed = (roleId) => {
    return levelRoles.some(lr => lr.roleId === roleId);
  };

  // Verificar si un nivel ya tiene un rol asignado
  const isLevelUsed = (level) => {
    return levelRoles.some(lr => lr.level === parseInt(level));
  };

  // Agregar nuevo rol de nivel
  const addLevelRole = () => {
    if (!selectedRoleForLevel || !selectedLevelForRole) return;
    
    const level = parseInt(selectedLevelForRole);
    
    if (isLevelUsed(level)) {
      toast.error('Ya existe un rol asignado a este nivel');
      return;
    }
    
    setLevelRoles([...levelRoles, { level, roleId: selectedRoleForLevel }]);
    setSelectedRoleForLevel('');
    setSelectedLevelForRole('1');
  };

  // Remover rol de nivel
  const removeLevelRole = (level) => {
    setLevelRoles(levelRoles.filter(lr => lr.level !== level));
  };

  // Obtener roles ordenados por nivel
  const getSortedRoles = () => {
    return [...levelRoles].sort((a, b) => a.level - b.level);
  };

  // Guardar cambios
  const save = async () => {
    setSaving(true);
    try {
      await guildService.updateLevelRoles(guildId, levelRoles);
      
      setOriginalLevelRoles([...levelRoles]);
      
      toast.success('✅ Roles de nivel guardados correctamente');
      return true;
    } catch (error) {
      console.error('Error guardando roles:', error);
      toast.error('❌ Error al guardar los roles');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    // Estados
    levelRoles,
    selectedRoleForLevel,
    setSelectedRoleForLevel,
    selectedLevelForRole,
    setSelectedLevelForRole,
    
    // Acciones
    addLevelRole,
    removeLevelRole,
    getSortedRoles,
    isRoleUsed,
    isLevelUsed,
    save,
    
    // Estado
    saving,
    hasChanges
  };
}