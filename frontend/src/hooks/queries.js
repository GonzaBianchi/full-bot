// frontend/src/hooks/queries.js
// Punto único de lectura de la API. Antes cada componente hacía su propio
// fetch en un useEffect: abrir un servidor y recorrer las pestañas gastaba
// más de diez peticiones y repetía las mismas al volver a una pestaña, contra
// un límite de 100 req/15 min por IP.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authService,
  guildService,
  leaderboardService,
  roleMenuService
} from '../services/api';

export const queryKeys = {
  me: ['me'],
  botInfo: ['bot-info'],
  availableGuilds: ['guilds', 'available'],
  guildConfig: (guildId) => ['guild', guildId, 'config'],
  guildResources: (guildId) => ['guild', guildId, 'resources'],
  guildPublicInfo: (guildId) => ['guild', guildId, 'public-info'],
  roleMenus: (guildId) => ['guild', guildId, 'role-menus'],
  achievements: (guildId) => ['guild', guildId, 'achievements'],
  leaderboard: (guildId, page, limit) => ['leaderboard', guildId, page, limit],
  leaderboardSearch: (guildId, term) => ['leaderboard', guildId, 'search', term],
  guildStats: (guildId) => ['leaderboard', guildId, 'stats'],
  globalTop: (limit) => ['leaderboard', 'global-top', limit],
  auditLog: (guildId) => ['guild', guildId, 'audit-log']
};

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        const { data } = await authService.getMe();
        return data;
      } catch (error) {
        // 401 es la respuesta normal para un visitante anónimo, no un fallo.
        if (error?.response?.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}

export function useBotInfo() {
  return useQuery({
    queryKey: queryKeys.botInfo,
    queryFn: async () => (await guildService.getBotInfo()).data,
    staleTime: 5 * 60 * 1000
  });
}

export function useAvailableGuilds(enabled = true) {
  return useQuery({
    queryKey: queryKeys.availableGuilds,
    queryFn: async () => (await guildService.getAvailable()).data,
    enabled,
    // El usuario invita el bot en otra pestaña de Discord y vuelve: al recuperar
    // el foco la lista tiene que reflejarlo.
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    select: (data) => ({
      manageable: data?.manageable ?? [],
      invitables: data?.invitables ?? []
    })
  });
}

export function useGuildConfig(guildId) {
  return useQuery({
    queryKey: queryKeys.guildConfig(guildId),
    queryFn: async () => (await guildService.getConfig(guildId)).data.config,
    enabled: Boolean(guildId),
    staleTime: 60 * 1000
  });
}

export function useGuildResources(guildId) {
  return useQuery({
    queryKey: queryKeys.guildResources(guildId),
    queryFn: async () => (await guildService.getResources(guildId)).data,
    enabled: Boolean(guildId),
    // Canales, roles y emojis salen de la caché de Discord.js y casi no cambian
    // durante una sesión de configuración.
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      channels: data?.channels ?? [],
      roles: data?.roles ?? [],
      emojis: data?.emojis ?? []
    })
  });
}

export function useGuildPublicInfo(guildId) {
  return useQuery({
    queryKey: queryKeys.guildPublicInfo(guildId),
    queryFn: async () => (await guildService.getPublicInfo(guildId)).data,
    enabled: Boolean(guildId),
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}

export function useRoleMenus(guildId) {
  return useQuery({
    queryKey: queryKeys.roleMenus(guildId),
    queryFn: async () => (await roleMenuService.list(guildId)).data.menus ?? [],
    enabled: Boolean(guildId)
  });
}

export function useLeaderboard(guildId, page, limit = 10) {
  return useQuery({
    queryKey: queryKeys.leaderboard(guildId, page, limit),
    queryFn: async () => {
      try {
        const { data } = await leaderboardService.getPublic(guildId, page, limit);
        return data;
      } catch (error) {
        // El endpoint público tiene su propio límite (20 req/30 s). Si lo corta,
        // un usuario con sesión todavía puede leer el ranking por la vía autenticada.
        if (error?.response?.status !== 429) throw error;
        const { data } = await leaderboardService.getLeaderboard(guildId, page, limit);
        return data;
      }
    },
    enabled: Boolean(guildId),
    // Al pasar de página, mantener la lista anterior visible evita el salto a
    // pantalla vacía y el spinner de página completa.
    placeholderData: (previous) => previous
  });
}

/** Estadísticas agregadas del servidor: solo para miembros con sesión. */
export function useGuildStats(guildId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.guildStats(guildId),
    queryFn: async () => (await leaderboardService.getStats(guildId)).data,
    enabled: Boolean(guildId) && enabled,
    staleTime: 60 * 1000
  });
}

/** Búsqueda de miembros en el ranking. El término ya viene debounceado. */
export function useLeaderboardSearch(guildId, term, enabled = true) {
  const trimmed = term.trim();

  return useQuery({
    queryKey: queryKeys.leaderboardSearch(guildId, trimmed),
    queryFn: async () => (await leaderboardService.search(guildId, trimmed)).data.results ?? [],
    // El backend exige 2 caracteres como mínimo: con menos ni se pide.
    enabled: Boolean(guildId) && enabled && trimmed.length >= 2,
    staleTime: 30 * 1000
  });
}

export function useGlobalTop(limit = 5, enabled = true) {
  return useQuery({
    queryKey: queryKeys.globalTop(limit),
    queryFn: async () => (await leaderboardService.getGlobalTop(limit)).data.top ?? [],
    enabled,
    staleTime: 5 * 60 * 1000
  });
}

/** Historial de cambios del servidor (últimas 50 entradas, TTL de 30 días). */
export function useAuditLog(guildId) {
  return useQuery({
    queryKey: queryKeys.auditLog(guildId),
    queryFn: async () => (await guildService.getAuditLog(guildId)).data.entries ?? [],
    enabled: Boolean(guildId),
    staleTime: 30 * 1000
  });
}

/**
 * Invalidaciones agrupadas: cada mutación de configuración debe tirar la caché
 * del guild, igual que el backend invalida su `guildConfigCache`.
 */
export function useGuildInvalidation(guildId) {
  const queryClient = useQueryClient();

  return {
    invalidateConfig: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.guildConfig(guildId) }),
    invalidateResources: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.guildResources(guildId) }),
    invalidateRoleMenus: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.roleMenus(guildId) }),
    invalidateGuild: () =>
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
  };
}
