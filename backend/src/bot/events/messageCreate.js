import User from '../../models/User.js';
import { xpPerMessage } from '../utils/levelSystem.js';
import logger from '../../utils/logger.js';
import { updateMemberRoles } from '../../utils/roleManager.js';
import { getGuildConfig } from '../../utils/guildConfigCache.js';
import { invalidateRankCard } from '../../utils/rankCardCache.js';
import { notifyLeaderboardUpdate } from '../../utils/sseClients.js';
import { handleMessageAchievements } from './achievementTracking.js';
import { handleMediaFilter } from './mediaFilterHandler.js';

// Cooldown en memoria por guild+user. Es process-local a propósito: con una
// sola instancia basta, y con sharding habría que moverlo a un store común.
const XP_COOLDOWN_MS = 60 * 1000;
const cooldowns = new Map(); // `${guildId}:${userId}` -> timestamp del último otorgamiento

// Barrido periódico en lugar de un setTimeout por cada otorgamiento de XP, que
// a escala mantenía miles de timers vivos a la vez.
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of cooldowns.entries()) {
    if (now - ts > XP_COOLDOWN_MS) cooldowns.delete(key);
  }
}, XP_COOLDOWN_MS).unref();

function onCooldown(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const last = cooldowns.get(key) || 0;

  if (Date.now() - last < XP_COOLDOWN_MS) return true;

  cooldowns.set(key, Date.now());
  return false;
}

async function announceLevelUp(message, guildConfig, oldLevel, newLevel) {
  const template = guildConfig.levelUpMessage || '🎉 {mention} ha subido al nivel {level}!';
  const formatted = template
    .replace(/\{mention\}/g, `<@${message.author.id}>`)
    .replace(/\{username\}/g, message.author.username)
    .replace(/\{level\}/g, String(newLevel))
    .replace(/\{oldLevel\}/g, String(oldLevel));

  let targetChannel = message.channel;

  if (guildConfig.levelUpChannelId) {
    try {
      const ch = await message.guild.channels.fetch(guildConfig.levelUpChannelId).catch(() => null);
      if (ch && ch.isTextBased() && ch.permissionsFor(message.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
        targetChannel = ch;
      }
    } catch (e) {
      logger.warn('No se pudo obtener el canal configurado de leveo:', e.message);
    }
  }

  try {
    await targetChannel.send({ content: formatted });
  } catch (e) {
    logger.warn('No se pudo enviar mensaje de leveo:', e.message);
  }
}

async function grantXp(message, guildConfig) {
  const guildId = message.guild.id;
  const userId = message.author.id;

  if (guildConfig.ignoredChannels?.includes(message.channel.id)) return;
  if (onCooldown(guildId, userId)) return;

  const baseXp = xpPerMessage();
  const multiplier = parseFloat(guildConfig.xpMultiplier) || 1;
  const xpToAdd = Math.max(1, Math.floor(baseXp * multiplier));

  const { leveledUp, oldLevel, newLevel } = await User.addXp(guildId, userId, xpToAdd);

  invalidateRankCard(guildId, userId);
  notifyLeaderboardUpdate(guildId);
  User.updateDiscordInfo(guildId, userId, message.author).catch(() => {});

  logger.info(`XP otorgada: ${xpToAdd} a ${userId} en guild ${guildId} (Lv ${oldLevel} -> ${newLevel})`);

  if (!leveledUp) return;

  if (guildConfig.levelUpEnabled) {
    await announceLevelUp(message, guildConfig, oldLevel, newLevel);
  }

  try {
    const member = message.member || await message.guild.members.fetch(userId).catch(() => null);
    if (member) {
      await updateMemberRoles(message.guild, member, newLevel, guildConfig);
    }
  } catch (e) {
    logger.warn('Error actualizando roles via roleManager:', e?.message || e);
  }
}

/**
 * Pipeline único de messageCreate. Antes había tres listeners independientes
 * (XP, logros y filtro de multimedia), y cada uno resolvía la configuración del
 * servidor por su cuenta.
 */
export default async function onMessageCreate(message) {
  if (!message.guild || message.author.bot) return;

  let guildConfig;
  try {
    guildConfig = await getGuildConfig(message.guild.id);
  } catch (e) {
    logger.error('No se pudo resolver la configuración del servidor:', e?.message || e);
    return;
  }

  // Las tres ramas son independientes: que una falle no debe cortar las otras.
  const results = await Promise.allSettled([
    grantXp(message, guildConfig),
    handleMessageAchievements(message),
    handleMediaFilter(message, guildConfig)
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error('Error en messageCreate handler:', result.reason);
    }
  }
}
