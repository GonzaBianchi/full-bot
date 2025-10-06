// frontend/src/hooks/useMediaFilter.js
import { useState, useEffect } from 'react';
import { mediaFilterService } from '../services/api';
import toast from 'react-hot-toast';

export function useMediaFilter(guildId, config) {
  const [enabled, setEnabled] = useState(false);
  const [sourceChannels, setSourceChannels] = useState([]);
  const [targetChannelId, setTargetChannelId] = useState(null);
  const [types, setTypes] = useState({
    images: true,
    videos: true,
    gifs: true
  });
  const [includeEmbeds, setIncludeEmbeds] = useState(false);
  const [customMessage, setCustomMessage] = useState('📎 **{author}** compartió multimedia desde #{channel}');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar configuración inicial
  useEffect(() => {
    if (config?.mediaFilter) {
      const mf = config.mediaFilter;
      setEnabled(mf.enabled || false);
      setSourceChannels(mf.sourceChannels || []);
      setTargetChannelId(mf.targetChannelId || null);
      setTypes(mf.types || { images: true, videos: true, gifs: true });
      setIncludeEmbeds(mf.includeEmbeds || false);
      setCustomMessage(mf.customMessage || '📎 **{author}** compartió multimedia desde #{channel}');
      setHasChanges(false);
    }
  }, [config]);

  // Detectar cambios
  useEffect(() => {
    if (!config?.mediaFilter) return;
    
    const mf = config.mediaFilter;
    const changed = 
      enabled !== (mf.enabled || false) ||
      JSON.stringify(sourceChannels.sort()) !== JSON.stringify((mf.sourceChannels || []).sort()) ||
      targetChannelId !== (mf.targetChannelId || null) ||
      types.images !== (mf.types?.images ?? true) ||
      types.videos !== (mf.types?.videos ?? true) ||
      types.gifs !== (mf.types?.gifs ?? true) ||
      includeEmbeds !== (mf.includeEmbeds || false) ||
      customMessage !== (mf.customMessage || '📎 **{author}** compartió multimedia desde #{channel}');
    
    setHasChanges(changed);
  }, [enabled, sourceChannels, targetChannelId, types, includeEmbeds, customMessage, config]);

  const handleSave = async () => {
    if (!guildId) return;
    
    setSaving(true);
    try {
      await mediaFilterService.update(guildId, {
        enabled,
        sourceChannels,
        targetChannelId,
        types,
        includeEmbeds,
        customMessage
      });
      
      toast.success('Configuración de filtro multimedia guardada');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving media filter:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!guildId) return;
    
    try {
      await mediaFilterService.reset(guildId);
      
      setEnabled(false);
      setSourceChannels([]);
      setTargetChannelId(null);
      setTypes({ images: true, videos: true, gifs: true });
      setIncludeEmbeds(false);
      setCustomMessage('📎 **{author}** compartió multimedia desde #{channel}');
      setHasChanges(false);
      
      toast.success('Configuración reseteada');
    } catch (error) {
      console.error('Error resetting media filter:', error);
      toast.error('Error al resetear configuración');
    }
  };

  return {
    enabled, setEnabled,
    sourceChannels, setSourceChannels,
    targetChannelId, setTargetChannelId,
    types, setTypes,
    includeEmbeds, setIncludeEmbeds,
    customMessage, setCustomMessage,
    hasChanges,
    saving,
    handleSave,
    handleReset
  };
}