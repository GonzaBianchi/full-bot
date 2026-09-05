import User from '../models/User.js';
import { xpForLevel } from '../bot/utils/levelSystem.js';
import logger from '../utils/logger.js';

// La misma consulta estaba escrita tres veces: en el helper del bot, en la ruta
// autenticada y en la pública. Las tres divergían en detalles (lean, N+1 contra
// Discord, cálculo del progreso).

const SORTABLE = new Set(['totalXp', 'level', 'messageCount']);

// Tope de consultas a Discord por página: solo se usan para usuarios que aún no
// tienen nombre guardado, que es una situación transitoria.
const MAX_DISCORD_FETCH = 10;

export function progressFor(level, totalXp) {
  const currentLevelTotal = xpForLevel(level);
  const nextLevelTotal = xpForLevel(level + 1);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelTotal);
  const xpForNext = Math.max(0, nextLevelTotal - currentLevelTotal);

  return {
    xp: xpIntoLevel,
    xpForNextLevel: xpForNext,
    percent: xpForNext > 0 ? Math.floor((xpIntoLevel / xpForNext) * 100) : 100
  };
}

/**
 * Completa nombre y avatar de los usuarios que todavía no los tienen en Mongo.
 * El resto se sirve de la BD, donde `User.updateDiscordInfo` los deja al ganar
 * XP: antes se consultaba Discord una vez por fila del leaderboard.
 */
async function hydrateMissing(users, client) {
  const fetched = new Map();
  if (!client) return fetched;

  const pending = users.filter(u => !u.username).slice(0, MAX_DISCORD_FETCH);

  await Promise.all(pending.map(async u => {
    const discordUser = await client.users.fetch(u.userId).catch(() => null);
    if (!discordUser) return;

    fetched.set(u.userId, discordUser);
    User.updateDiscordInfo(u.guildId, u.userId, discordUser).catch(err =>
      logger.warn('Error cacheando info de Discord:', err.message)
    );
  }));

  return fetched;
}

export async function getLeaderboard(guildId, { page = 1, limit = 10, sortBy = 'totalXp', client = null } = {}) {
  const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 100);
  const safePage = Math.max(1, Number(page) || 1);
  const field = SORTABLE.has(sortBy) ? sortBy : 'totalXp';
  const skip = (safePage - 1) * safeLimit;

  const [users, total] = await Promise.all([
    User.find({ guildId })
      .sort({ [field]: -1 })
      .skip(skip)
      .limit(safeLimit)
      .select('userId guildId level totalXp messageCount username discriminator avatar')
      .lean(),
    User.countDocuments({ guildId })
  ]);

  const fetched = await hydrateMissing(users, client);

  const entries = users.map((u, idx) => {
    const discordUser = fetched.get(u.userId);
    return {
      userId: u.userId,
      level: u.level,
      totalXp: u.totalXp,
      messageCount: u.messageCount,
      rank: skip + idx + 1,
      username: discordUser?.username ?? u.username ?? null,
      discriminator: discordUser?.discriminator ?? u.discriminator ?? null,
      avatar: discordUser ? discordUser.displayAvatarURL({ size: 128 }) : (u.avatar ?? null),
      progress: progressFor(u.level, u.totalXp)
    };
  });

  return {
    users: entries,
    total,
    page: safePage,
    limit: safeLimit,
    pages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

export default { getLeaderboard, progressFor };
