const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.ts > TTL_MS) cache.delete(key);
  }
}, TTL_MS);

export function getRankCard(guildId, userId) {
  const entry = cache.get(`${guildId}:${userId}`);
  return entry && Date.now() - entry.ts < TTL_MS ? entry.buffer : null;
}

export function setRankCard(guildId, userId, buffer) {
  cache.set(`${guildId}:${userId}`, { buffer, ts: Date.now() });
}

export function invalidateRankCard(guildId, userId) {
  cache.delete(`${guildId}:${userId}`);
}
