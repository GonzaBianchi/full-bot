const clients = new Map(); // guildId -> Set<res>
const lastNotified = new Map(); // guildId -> timestamp
const THROTTLE_MS = 10 * 1000; // at most one push per 10s per guild

export function addSseClient(guildId, res) {
  if (!clients.has(guildId)) clients.set(guildId, new Set());
  clients.get(guildId).add(res);
}

export function removeSseClient(guildId, res) {
  clients.get(guildId)?.delete(res);
  if (clients.get(guildId)?.size === 0) clients.delete(guildId);
}

export function notifyLeaderboardUpdate(guildId) {
  const set = clients.get(guildId);
  if (!set || set.size === 0) return;

  const now = Date.now();
  if (now - (lastNotified.get(guildId) || 0) < THROTTLE_MS) return;
  lastNotified.set(guildId, now);

  const payload = `data: ${JSON.stringify({ ts: now })}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch (_) {}
  }
}
