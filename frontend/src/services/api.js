// frontend/src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const loginUrl = (redirect = '/dashboard') =>
  `${BASE_URL}/api/auth/login?redirect=${encodeURIComponent(redirect)}`;

/**
 * Traduce un error de axios al mensaje que la API realmente devolvió.
 * El backend responde `{ error }` en los handlers y `{ errors: [...] }` cuando
 * falla express-validator; antes el panel ignoraba ambos y mostraba un texto
 * genérico, así que un 400 por validación era indistinguible de un 500.
 */
export function getApiError(error, fallback = 'Ocurrió un error inesperado') {
  const data = error?.response?.data;

  if (data?.error) return data.error;
  if (data?.details) return data.details;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map(e => (e.path ? `${e.path}: ${e.msg}` : e.msg))
      .filter(Boolean)
      .join(' · ');
  }

  if (error?.code === 'ERR_NETWORK') return 'No se pudo conectar con el servidor';

  return fallback;
}

// Rutas que devuelven 401 como respuesta normal (visitante anónimo): no deben
// disparar el redirect al login.
const ANONYMOUS_OK = [
  '/api/auth/me',
  '/api/guilds/bot/info',
  '/api/guilds/public/',
  '/api/leaderboard/public/'
];

const isAnonymousOk = (url = '') => ANONYMOUS_OK.some(path => url.includes(path));

let redirecting = false;

api.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? '';

    // La sesión venció mientras el usuario navegaba: volver a Discord con la
    // ruta actual para que aterrice donde estaba.
    if (status === 401 && !isAnonymousOk(url) && !redirecting) {
      redirecting = true;
      const current = window.location.pathname + window.location.search;
      window.location.href = loginUrl(current);
      return new Promise(() => {});
    }

    // El backend limita a 100 req/15 min por IP. Sin este aviso el panel solo
    // mostraba "error al guardar" y parecía un fallo del servidor.
    if (status === 429) {
      const retryAfter = Number(error.response.headers?.['retry-after']);
      toast.error(
        retryAfter
          ? `Demasiadas peticiones. Probá de nuevo en ${Math.ceil(retryAfter / 60)} min.`
          : 'Demasiadas peticiones. Esperá un momento antes de reintentar.',
        { id: 'rate-limit' }
      );
    }

    return Promise.reject(error);
  }
);

export const authService = {
  getMe: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  login: loginUrl
};

export const guildService = {
  getBotInfo: () => api.get('/api/guilds/bot/info'),
  getAvailable: () => api.get('/api/guilds/available'),
  getConfig: (guildId) => api.get(`/api/guilds/${guildId}/config`),
  updateMultiplier: (guildId, multiplier) => api.post(`/api/guilds/${guildId}/config/xp-multiplier`, { multiplier }),
  updateIgnoredChannels: (guildId, channels) => api.post(`/api/guilds/${guildId}/config/ignored-channels`, { channels }),
  updateLevelUp: (guildId, payload) => api.post(`/api/guilds/${guildId}/config/levelup`, payload),
  updateLevelRoles: (guildId, roles, stackRoles) => api.post(`/api/guilds/${guildId}/config/level-roles`, { roles, stackRoles }),
  getResources: (guildId) => api.get(`/api/guilds/${guildId}/resources`),
  getPublicInfo: (guildId) => api.get(`/api/guilds/public/${encodeURIComponent(guildId)}/info`),
  sendMessage: (guildId, messageData) => api.post(`/api/guilds/${guildId}/messages/send`, messageData),
  getAuditLog: (guildId) => api.get(`/api/guilds/${guildId}/audit-log`),
};

export const leaderboardService = {
  getPublic: (guildId, page = 1, limit = 10) =>
    api.get(`/api/leaderboard/public/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
  getLeaderboard: (guildId, page = 1, limit = 10) =>
    api.get(`/api/leaderboard/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
  search: (guildId, term) =>
    api.get(`/api/leaderboard/${encodeURIComponent(guildId)}/search?query=${encodeURIComponent(term)}`),
  getStats: (guildId) => api.get(`/api/leaderboard/${encodeURIComponent(guildId)}/stats`),
  getGlobalTop: (limit = 10) => api.get(`/api/leaderboard/global/top?limit=${limit}`),
};

export const roleMenuService = {
  list: (guildId) => api.get(`/api/guilds/${encodeURIComponent(guildId)}/role-menus`),
  create: (guildId, payload) => api.post(`/api/guilds/${encodeURIComponent(guildId)}/role-menus`, payload),
  update: (guildId, id, payload) => api.put(`/api/guilds/${encodeURIComponent(guildId)}/role-menus/${encodeURIComponent(id)}`, payload),
  remove: (guildId, id) => api.delete(`/api/guilds/${encodeURIComponent(guildId)}/role-menus/${encodeURIComponent(id)}`),
  publish: (guildId, id) => api.post(`/api/guilds/${encodeURIComponent(guildId)}/role-menus/${encodeURIComponent(id)}/publish`)
};

export const autoRolesService = {
  getConfig: (guildId) => api.get(`/api/guilds/${guildId}/config/auto-roles`),
  update: (guildId, payload) => api.post(`/api/guilds/${guildId}/config/auto-roles`, payload)
};

export const imageService = {
  getConfig: (guildId) => api.get(`/api/guilds/${guildId}/config/images`),
  updateRankCard: (guildId, payload) => api.post(`/api/guilds/${guildId}/config/images/rank-card`, payload),
  updateAchievementNotification: (guildId, payload) => api.post(`/api/guilds/${guildId}/config/images/achievement-notification`, payload),
  resetImage: (guildId, type) => api.delete(`/api/guilds/${guildId}/config/images/${type}`)
};

export const mediaFilterService = {
  getConfig: (guildId) => api.get(`/api/guilds/${guildId}/config/media-filter`),
  update: (guildId, payload) => api.post(`/api/guilds/${guildId}/config/media-filter`, payload),
  reset: (guildId) => api.delete(`/api/guilds/${guildId}/config/media-filter`)
};

export const birthdayService = {
  getConfig: (guildId) => api.get(`/api/guilds/${guildId}/config/birthdays`),
  update: (guildId, payload) => api.post(`/api/guilds/${guildId}/config/birthdays`, payload),
  reset: (guildId) => api.delete(`/api/guilds/${guildId}/config/birthdays`)
};

export default api;
