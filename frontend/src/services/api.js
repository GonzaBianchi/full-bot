// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://therifthavenfullbot.onrender.com',
  withCredentials: true,
});

export const authService = {
  getMe: () => api.get('/api/auth/me'),
  login: (redirect) => {
    const baseURL = import.meta.env.VITE_API_URL || 'https://therifthavenfullbot.onrender.com';
    return `${baseURL}/api/auth/login?redirect=${encodeURIComponent(redirect)}`;
  }
};

export const guildService = {
  getBotInfo: () => api.get('/api/guilds/bot/info'),
  getAvailable: () => api.get('/api/guilds/available'),
  getConfig: (guildId) => api.get(`/api/guilds/${guildId}/config`),
  updateMultiplier: (guildId, multiplier) => api.post(`/api/guilds/${guildId}/config/xp-multiplier`, { multiplier }),
  updateIgnoredChannels: (guildId, channels) => api.post(`/api/guilds/${guildId}/config/ignored-channels`, { channels }),
  updateLevelUp: (guildId, payload) => api.post(`/api/guilds/${guildId}/config/levelup`, payload),
  updateLevelRoles: (guildId, roles) => api.post(`/api/guilds/${guildId}/config/level-roles`, { roles }),
  getResources: (guildId) => api.get(`/api/guilds/${guildId}/resources`),
  getPublicInfo: (guildId) => api.get(`/api/guilds/public/${encodeURIComponent(guildId)}/info`),
  sendMessage: (guildId, messageData) => api.post(`/api/guilds/${guildId}/messages/send`, messageData),
};

export const leaderboardService = {
  getPublic: (guildId, page = 1, limit = 10) => 
    api.get(`/api/leaderboard/public/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
  getLeaderboard: (guildId, page = 1, limit = 10) => 
    api.get(`/api/leaderboard/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
  get: (guildId, page = 1, limit = 10) => 
    api.get(`/api/leaderboard/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
};

export const roleMenuService = {
  list: (guildId) => api.get(`/api/guilds/${encodeURIComponent(guildId)}/role-menus`),
  create: (guildId, payload) => api.post(`/api/guilds/${encodeURIComponent(guildId)}/role-menus`, payload),
  update: (guildId, id, payload) => api.put(`/api/guilds/${encodeURIComponent(guildId)}/role-menus/${encodeURIComponent(id)}`, payload),
  remove: (guildId, id) => api.delete(`/api/guilds/${encodeURIComponent(guildId)}/role-menus/${encodeURIComponent(id)}`),
  publish: (guildId, id) => api.post(`/api/guilds/${encodeURIComponent(guildId)}/role-menus/${encodeURIComponent(id)}/publish`)
};

// ========== NUEVO: Servicio de Auto-Roles ==========
export const autoRolesService = {
  getConfig: (guildId) => api.get(`/api/guilds/${guildId}/config/auto-roles`),
  update: (guildId, payload) => api.post(`/api/guilds/${guildId}/config/auto-roles`, payload)
};
// ===================================================

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