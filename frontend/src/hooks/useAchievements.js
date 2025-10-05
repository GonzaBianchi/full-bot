import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function useAchievements(guildId) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guildId) {
      loadAchievements();
    }
  }, [guildId]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/guilds/${guildId}/config/achievements`);
      setAchievements(response.data.achievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
      toast.error('Error al cargar logros');
    } finally {
      setLoading(false);
    }
  };

  const createAchievement = async (data) => {
    try {
      setSaving(true);
      const response = await api.post(`/api/guilds/${guildId}/config/achievements`, data);
      setAchievements([...achievements, response.data.achievement]);
      toast.success('✅ Logro creado correctamente');
      return response.data.achievement;
    } catch (error) {
      console.error('Error creating achievement:', error);
      toast.error(error.response?.data?.error || 'Error al crear logro');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateAchievement = async (id, data) => {
    try {
      setSaving(true);
      const response = await api.put(`/api/guilds/${guildId}/config/achievements/${id}`, data);
      setAchievements(achievements.map(a => a._id === id ? response.data.achievement : a));
      toast.success('✅ Logro actualizado correctamente');
      return response.data.achievement;
    } catch (error) {
      console.error('Error updating achievement:', error);
      toast.error('Error al actualizar logro');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteAchievement = async (id) => {
    try {
      setSaving(true);
      await api.delete(`/api/guilds/${guildId}/config/achievements/${id}`);
      setAchievements(achievements.filter(a => a._id !== id));
      toast.success('🗑️ Logro eliminado correctamente');
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast.error('Error al eliminar logro');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const toggleAchievement = async (id) => {
    try {
      const response = await api.patch(`/api/guilds/${guildId}/config/achievements/${id}/toggle`);
      setAchievements(achievements.map(a => a._id === id ? response.data.achievement : a));
      toast.success(`Logro ${response.data.achievement.enabled ? 'habilitado' : 'deshabilitado'}`);
    } catch (error) {
      console.error('Error toggling achievement:', error);
      toast.error('Error al cambiar estado del logro');
    }
  };

  const createDefaultAchievements = async () => {
    try {
      setSaving(true);
      const response = await api.post(`/api/guilds/${guildId}/config/achievements/default`);
      setAchievements(response.data.achievements);
      toast.success('✅ Logros predeterminados creados');
      return response.data.achievements;
    } catch (error) {
      console.error('Error creating default achievements:', error);
      toast.error(error.response?.data?.error || 'Error al crear logros predeterminados');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const getAchievementStats = async (id) => {
    try {
      const response = await api.get(`/api/guilds/${guildId}/config/achievements/${id}/stats`);
      return response.data.stats;
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      toast.error('Error al obtener estadísticas');
      throw error;
    }
  };

  return {
    achievements,
    loading,
    saving,
    loadAchievements,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    toggleAchievement,
    createDefaultAchievements,
    getAchievementStats
  };
}