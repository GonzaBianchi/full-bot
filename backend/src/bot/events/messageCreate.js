import Guild from '../../models/Guild.js';
import User from '../../models/User.js';
import { xpPerMessage } from '../utils/levelSystem.js';
import logger from '../../utils/logger.js';

// cooldown simple en memoria por guild+user (ms)
const cooldowns = new Map(); // key: `${guildId}:${userId}` -> timestamp of last xp grant

export default async function onMessageCreate(message) {
  try {
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    // Obtener config de guild
    const guildConfig = await Guild.findOne({ guildId }) || { xpMultiplier: 1, ignoredChannels: [], levelUpEnabled: true };

    if (guildConfig.ignoredChannels && guildConfig.ignoredChannels.includes(message.channel.id)) return;

    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const last = cooldowns.get(key) || 0;

    // XP por minuto: permitir solo 1 otorgamiento por 60s
    if (now - last < 60 * 1000) return; // aún en cooldown

    cooldowns.set(key, now);

    // Calcular XP base usando fórmula MEE6 (xpPerMessage default 15-25)
    const baseXp = xpPerMessage();
    const multiplier = parseFloat(guildConfig.xpMultiplier) || 1;
    const xpToAdd = Math.max(1, Math.floor(baseXp * multiplier));

    const { user, leveledUp, oldLevel, newLevel } = await User.addXp(guildId, userId, xpToAdd);

    logger.info(`XP otorgada: ${xpToAdd} a ${userId} en guild ${guildId} (Lv ${oldLevel} -> ${newLevel})`);

    if (leveledUp && guildConfig.levelUpEnabled) {
      // Preparar mensaje de leveo con placeholders
      const template = guildConfig.levelUpMessage || '🎉 {mention} ha subido al nivel {level}!';
      const mention = `<@${userId}>`;
      const formatted = template
        .replace(/\{mention\}/g, mention)
        .replace(/\{username\}/g, message.author.username)
        .replace(/\{level\}/g, String(newLevel))
        .replace(/\{oldLevel\}/g, String(oldLevel));

      // Determinar canal: preferir levelUpChannelId si existe
      let targetChannel = message.channel;
      if (guildConfig.levelUpChannelId) {
        try {
          const ch = await message.guild.channels.fetch(guildConfig.levelUpChannelId).catch(() => null);
          if (ch && ch.isTextBased && ch.permissionsFor(message.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            targetChannel = ch;
          }
        } catch (e) {
          logger.warn('No se pudo obtener channel configurado de leveo:', e.message);
        }
      }

      try {
        await targetChannel.send({ content: formatted });
      } catch (e) {
        logger.warn('No se pudo enviar mensaje de leveo:', e.message);
      }

      // Asignar roles si hay levelRoles configurados
      if (guildConfig.levelRoles && Array.isArray(guildConfig.levelRoles) && guildConfig.levelRoles.length > 0) {
        const toAssign = guildConfig.levelRoles.filter(r => r.level <= newLevel).map(r => r.roleId);
        if (toAssign.length > 0) {
          try {
            const member = await message.guild.members.fetch(userId).catch(() => null);
            if (member) {
              for (const roleId of toAssign) {
                if (!member.roles.cache.has(roleId) && message.guild.roles.cache.has(roleId)) {
                  await member.roles.add(roleId).catch(err => logger.warn('No se pudo asignar role:', roleId, err.message));
                }
              }
            }
          } catch (e) {
            logger.warn('Error asignando roles de nivel:', e.message);
          }
        }
      }
    }
  } catch (e) {
    logger.error('Error en messageCreate handler:', e);
  }
}