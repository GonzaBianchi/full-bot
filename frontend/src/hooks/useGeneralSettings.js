// frontend/src/hooks/useGeneralSettings.js
import { useState, useEffect } from 'react';
import { guildService } from '../services/api';
import { toast } from 'react-hot-toast';
import { useMultipleUnsavedChanges } from './useUnsavedChanges';

export function useGeneralSettings(guildId, config) {
  // Estados actuales
  const [multiplier, setMultiplier] = useState('1');
  const [ignoredChannels, setIgnoredChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  
  // Estados originales
  const [originalMultiplier, setOriginalMultiplier] = useState('1');
  const [originalIgnoredChannels, setOriginalIgnoredChannels] = useState([]);
  
  const [saving, setSaving] = useState(false);

  // Inicializar valores cuando llega la config
  useEffect(() => {
    if (config) {
      const mult = String(config.xpMultiplier || 1);
      const ignored = config.ignoredChannels || [];
      
      setMultiplier(mult);
      setOriginalMultiplier(mult);
      
      setIgnoredChannels(ignored);
      setOriginalIgnoredChannels([...ignored]);
    }
  }, [config]);

  // Detectar cambios
  const hasChanges = useMultipleUnsavedChanges([
    { current: multiplier, original: originalMultiplier },
    { current: ignoredChannels, original: originalIgnoredChannels }
  ]);

  // Agregar canal ignorado
  const addIgnoredChannel = () => {
    if (selectedChannel && !ignoredChannels.includes(selectedChannel)) {
      setIgnoredChannels([...ignoredChannels, selectedChannel]);
      setSelectedChannel('');
    }
  };

  // Remover canal ignorado
  const removeIgnoredChannel = (channelId) => {
    setIgnoredChannels(ignoredChannels.filter(id => id !== channelId));
  };

  // Guardar cambios
  const save = async () => {
    setSaving(true);
    try {
      await guildService.updateMultiplier(guildId, parseFloat(multiplier));
      await guildService.updateIgnoredChannels(guildId, ignoredChannels);
      
      setOriginalMultiplier(multiplier);
      setOriginalIgnoredChannels([...ignoredChannels]);
      
      toast.success('✅ Configuración general guardada correctamente');
      return true;
    } catch (error) {
      console.error('Error guardando:', error);
      toast.error('❌ Error al guardar la configuración');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    // Estados
    multiplier,
    setMultiplier,
    ignoredChannels,
    selectedChannel,
    setSelectedChannel,
    
    // Acciones
    addIgnoredChannel,
    removeIgnoredChannel,
    save,
    
    // Estado
    saving,
    hasChanges
  };
}