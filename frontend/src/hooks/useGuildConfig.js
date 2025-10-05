// frontend/src/hooks/useGuildConfig.js
import { useState, useEffect } from 'react';
import { guildService } from '../services/api';
import { toast } from 'react-hot-toast';

export function useGuildConfig(guildId) {
  const [config, setConfig] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (guildId) {
      loadConfig();
    }
  }, [guildId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [cfgRes, resResources] = await Promise.all([
        guildService.getConfig(guildId),
        guildService.getResources(guildId)
      ]);
      
      setConfig(cfgRes.data.config);
      setChannels(resResources.data.channels || []);
      setRoles(resResources.data.roles || []);
    } catch (error) {
      console.error('Error cargando config:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  return {
    config,
    channels,
    roles,
    loading,
    reload: loadConfig
  };
}