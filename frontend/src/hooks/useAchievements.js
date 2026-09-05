// frontend/src/hooks/useAchievements.js
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { getApiError } from '../services/api';
import toast from 'react-hot-toast';
import { queryKeys } from './queries';

export function useAchievements(guildId) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: achievements = [], isPending: loading } = useQuery({
    queryKey: queryKeys.achievements(guildId),
    queryFn: async () =>
      (await api.get(`/api/guilds/${guildId}/config/achievements`)).data.achievements ?? [],
    enabled: Boolean(guildId)
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.achievements(guildId) });

  /** Envuelve una mutación: estado de guardado, aviso de error e invalidación. */
  const mutate = async (action, { errorMessage, successMessage }) => {
    setSaving(true);
    try {
      const result = await action();
      await invalidate();
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(getApiError(error, errorMessage));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const createAchievement = (data) =>
    mutate(
      async () => (await api.post(`/api/guilds/${guildId}/config/achievements`, data)).data.achievement,
      { errorMessage: 'Error al crear logro', successMessage: '✅ Logro creado correctamente' }
    );

  const updateAchievement = (id, data) =>
    mutate(
      async () => (await api.put(`/api/guilds/${guildId}/config/achievements/${id}`, data)).data.achievement,
      { errorMessage: 'Error al actualizar logro', successMessage: '✅ Logro actualizado correctamente' }
    );

  const deleteAchievement = (id) =>
    mutate(
      () => api.delete(`/api/guilds/${guildId}/config/achievements/${id}`),
      { errorMessage: 'Error al eliminar logro', successMessage: '🗑️ Logro eliminado correctamente' }
    );

  const toggleAchievement = async (id) => {
    try {
      const { data } = await api.patch(`/api/guilds/${guildId}/config/achievements/${id}/toggle`);
      await invalidate();
      toast.success(`Logro ${data.achievement.enabled ? 'habilitado' : 'deshabilitado'}`);
    } catch (error) {
      console.error('Error toggling achievement:', error);
      toast.error(getApiError(error, 'Error al cambiar estado del logro'));
    }
  };

  const createDefaultAchievements = () =>
    mutate(
      async () => (await api.post(`/api/guilds/${guildId}/config/achievements/default`)).data.achievements,
      { errorMessage: 'Error al crear logros predeterminados', successMessage: '✅ Logros predeterminados creados' }
    );

  const getAchievementStats = async (id) => {
    try {
      const { data } = await api.get(`/api/guilds/${guildId}/config/achievements/${id}/stats`);
      return data.stats;
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      toast.error(getApiError(error, 'Error al obtener estadísticas'));
      throw error;
    }
  };

  return {
    achievements,
    loading,
    saving,
    loadAchievements: invalidate,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    toggleAchievement,
    createDefaultAchievements,
    getAchievementStats
  };
}
