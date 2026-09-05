import Guild from '../models/Guild.js';

const cache = new Map();
const TTL_MS = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.ts > TTL_MS) cache.delete(key);
  }
}, TTL_MS).unref();

// Se devuelve una copia: un objeto compartido entre todos los servidores sin
// documento propio se corrompería globalmente en cuanto alguien lo mutara.
const defaults = () => ({ xpMultiplier: 1, ignoredChannels: [], levelUpEnabled: true });

export async function getGuildConfig(guildId) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.config;

  const config = await Guild.findOne({ guildId }).lean() || defaults();
  cache.set(guildId, { config, ts: Date.now() });
  return config;
}

export function invalidateGuildConfig(guildId) {
  cache.delete(guildId);
}
