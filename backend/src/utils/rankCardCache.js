// Cada entrada es un PNG de 1400x400 (cientos de KB). Sin tope, la memoria
// crecía en proporción a los usuarios activos del bot.
const MAX_ENTRIES = 200;
const TTL_MS = 5 * 60 * 1000;

const cache = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.ts > TTL_MS) cache.delete(key);
  }
}, TTL_MS).unref();

const keyOf = (guildId, userId) => `${guildId}:${userId}`;

export function getRankCard(guildId, userId) {
  const key = keyOf(guildId, userId);
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.ts >= TTL_MS) {
    cache.delete(key);
    return null;
  }

  // Reinsertar para que el Map refleje el orden de uso (desalojo LRU).
  cache.delete(key);
  cache.set(key, entry);
  return entry.buffer;
}

export function setRankCard(guildId, userId, buffer) {
  const key = keyOf(guildId, userId);
  cache.delete(key);

  if (cache.size >= MAX_ENTRIES) {
    cache.delete(cache.keys().next().value); // el menos usado recientemente
  }

  cache.set(key, { buffer, ts: Date.now() });
}

export function invalidateRankCard(guildId, userId) {
  cache.delete(keyOf(guildId, userId));
}

/** Al cambiar la imagen de fondo del servidor, todas sus tarjetas caducan. */
export function invalidateGuildRankCards(guildId) {
  const prefix = `${guildId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
