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

export default { guildService };
