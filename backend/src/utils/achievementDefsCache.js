import Achievement from '../models/Achievement.js';

// Las definiciones de logros de un servidor cambian cuando un administrador
// toca el dashboard, es decir casi nunca; pero se consultaban en CADA mensaje.
const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.ts > TTL_MS) cache.delete(key);
  }
}, TTL_MS).unref();

async function getGuildAchievements(guildId) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.list;

  const list = await Achievement.find({ guildId, enabled: true }).lean();
  cache.set(guildId, { list, ts: Date.now() });
  return list;
}

/**
 * Logros habilitados del servidor, opcionalmente filtrados por tipo.
 * Son pocos por servidor, así que el filtro en memoria es más barato que
 * mantener una entrada de caché por cada combinación guild+tipo.
 */
export async function getEnabledAchievements(guildId, type = null) {
  const list = await getGuildAchievements(guildId);
  return type ? list.filter(a => a.type === type) : list;
}

export function invalidateAchievements(guildId) {
  cache.delete(guildId);
}
