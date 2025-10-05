// frontend/src/hooks/useNotificationSettings.js
import { useState, useEffect } from 'react';
import { guildService } from '../services/api';
import { toast } from 'react-hot-toast';
import { useMultipleUnsavedChanges } from './useUnsavedChanges';

export function useNotificationSettings(guildId, config) {
  // Estados actuales
  const [levelUpEnabled, setLevelUpEnabled] = useState(true);
  const [levelUpChannel, setLevelUpChannel] = useState('');
  const [levelUpMsg, setLevelUpMsg] = useState('');
  
  // Estados originales
  const [originalLevelUpEnabled, setOriginalLevelUpEnabled] = useState(true);
  const [originalLevelUpChannel, setOriginalLevelUpChannel] = useState('');
  const [originalLevelUpMsg, setOriginalLevelUpMsg] = useState('');
  
  const [saving, setSaving] = useState(false);

  // Inicializar valores
  useEffect(() => {
    if (config) {
      const enabled = config.levelUpEnabled ?? true;
      const channel = config.levelUpChannelId || '';
      const msg = config.levelUpMessage || '🎉 {mention} ha subido al nivel {level}!';
      
      setLevelUpEnabled(enabled);
      setOriginalLevelUpEnabled(enabled);
      
      setLevelUpChannel(channel);
      setOriginalLevelUpChannel(channel);
      
      setLevelUpMsg(msg);
      setOriginalLevelUpMsg(msg);
    }
  }, [config]);

  // Detectar cambios
  const hasChanges = useMultipleUnsavedChanges([
    { current: levelUpEnabled, original: originalLevelUpEnabled },
    { current: levelUpChannel, original: originalLevelUpChannel },
    { current: levelUpMsg, original: originalLevelUpMsg }
  ]);

  // Guardar cambios
  const save = async () => {
    setSaving(true);
    try {
      await guildService.updateLevelUp(guildId, {
        enabled: levelUpEnabled,
        channelId: levelUpChannel || null,
        message: levelUpMsg
      });
      
      setOriginalLevelUpEnabled(levelUpEnabled);
      setOriginalLevelUpChannel(levelUpChannel);
      setOriginalLevelUpMsg(levelUpMsg);
      
      toast.success('✅ Notificaciones guardadas correctamente');
      return true;
    } catch (error) {
      console.error('Error guardando:', error);
      toast.error('❌ Error al guardar las notificaciones');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    // Estados
    levelUpEnabled,
    setLevelUpEnabled,
    levelUpChannel,
    setLevelUpChannel,
    levelUpMsg,
    setLevelUpMsg,
    
    // Acciones
    save,
    
    // Estado
    saving,
    hasChanges
  };
}