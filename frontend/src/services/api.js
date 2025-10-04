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
};

export const leaderboardService = {
  getPublic: (guildId, page = 1, limit = 10) => api.get(`/api/leaderboard/public/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
  get: (guildId, page = 1, limit = 10) => api.get(`/api/leaderboard/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
};

export default api;