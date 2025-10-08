// frontend/src/hooks/useAutoRoles.js
import { useState, useEffect } from 'react';
import { autoRolesService } from '../services/api';
import toast from 'react-hot-toast';

export function useAutoRoles(guildId, config) {
  const [settings, setSettings] = useState({
    enabled: false,
    roles: [],
    restoreLevelRoles: true,
    welcomeChannelId: null,
    welcomeMessage: '👋 ¡Bienvenido {mention} al servidor!'
  });
  
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config?.autoRoles) {
      setSettings(config.autoRoles);
      setOriginalSettings(config.autoRoles);
      setLoading(false);
    } else {
      loadSettings();
    }
  }, [guildId, config]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await autoRolesService.getConfig(guildId);
      const data = response.data.autoRoles;
      setSettings(data);
      setOriginalSettings(data);
    } catch (error) {
      console.error('Error loading auto-roles config:', error);
      toast.error('Error al cargar configuración de auto-roles');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await autoRolesService.update(guildId, settings);
      setOriginalSettings(settings);
      toast.success('✅ Configuración guardada correctamente');
      return true;
    } catch (error) {
      console.error('Error saving auto-roles config:', error);
      toast.error('Error al guardar configuración');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      toast.success('Cambios descartados');
    }
  };

  const updateSettings = (updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const addRole = (roleId) => {
    if (settings.roles.includes(roleId)) {
      toast.error('Este rol ya está agregado');
      return false;
    }
    setSettings(prev => ({
      ...prev,
      roles: [...prev.roles, roleId]
    }));
    return true;
  };

  const removeRole = (roleId) => {
    setSettings(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r !== roleId)
    }));
  };

  return {
    settings,
    loading,
    saving,
    hasChanges: hasChanges(),
    updateSettings,
    saveSettings,
    resetSettings,
    addRole,
    removeRole
  };
}