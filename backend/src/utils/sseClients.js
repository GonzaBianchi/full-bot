const clients = new Map(); // guildId -> Set<res>
const lastNotified = new Map(); // guildId -> timestamp
const THROTTLE_MS = 10 * 1000; // como mucho un push cada 10s por guild
const MAX_CLIENTS_PER_GUILD = 100;

/**
 * Registra una conexión SSE. Devuelve false si el servidor ya tiene demasiadas
 * abiertas para ese guild: sin tope, los sockets colgados se acumulaban.
 */
export function addSseClient(guildId, res) {
  if (!clients.has(guildId)) clients.set(guildId, new Set());

  const set = clients.get(guildId);
  if (set.size >= MAX_CLIENTS_PER_GUILD) {
    if (set.size === 0) clients.delete(guildId);
    return false;
  }

  set.add(res);
  return true;
}

export function removeSseClient(guildId, res) {
  const set = clients.get(guildId);
  if (!set) return;

  set.delete(res);
  if (set.size === 0) {
    clients.delete(guildId);
    lastNotified.delete(guildId); // el throttle deja de tener sentido sin oyentes
  }
}

export function notifyLeaderboardUpdate(guildId) {
  const set = clients.get(guildId);
  if (!set || set.size === 0) return;

  const now = Date.now();
  if (now - (lastNotified.get(guildId) || 0) < THROTTLE_MS) return;
  lastNotified.set(guildId, now);

  const payload = `data: ${JSON.stringify({ ts: now })}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      // La conexión ya no sirve; su propio 'close' la retirará del Set.
    }
  }
}
