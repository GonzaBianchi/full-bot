import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

export const guildService = {
  getConfig: (guildId) => api.get(`/guilds/${guildId}/config`),
  updateMultiplier: (guildId, multiplier) => api.post(`/guilds/${guildId}/config/xp-multiplier`, { multiplier }),
  updateIgnoredChannels: (guildId, channels) => api.post(`/guilds/${guildId}/config/ignored-channels`, { channels }),
  updateLevelUp: (guildId, payload) => api.post(`/guilds/${guildId}/config/levelup`, payload),
  updateLevelRoles: (guildId, roles) => api.post(`/guilds/${guildId}/config/level-roles`, { roles }),
  getResources: (guildId) => api.get(`/guilds/${guildId}/resources`),
};

export const leaderboardService = {
  // Public leaderboard (no auth)
  getPublic: (guildId, page = 1, limit = 10) => api.get(`/leaderboard/public/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
  // Authenticated leaderboard (if needed)
  get: (guildId, page = 1, limit = 10) => api.get(`/leaderboard/${encodeURIComponent(guildId)}?page=${page}&limit=${limit}`),
};

export default { guildService, leaderboardService };
