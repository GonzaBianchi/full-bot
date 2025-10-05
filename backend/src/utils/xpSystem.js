import User from '../models/User.js';
import { xpForLevel, levelFromXp } from '../bot/utils/levelSystem.js';
import { updateMemberRoles } from './roleManager.js';
import logger from './logger.js';

export async function setLevelAndXp(userId, guildId, level, offsetXp = 0) {
  const totalXp = Math.max(0, xpForLevel(level) + (offsetXp || 0));

  const existing = await User.findOne({ guildId, userId });
  const oldTotal = existing ? (existing.totalXp || 0) : 0;
  const oldLevel = existing ? (existing.level ?? levelFromXp(oldTotal)) : levelFromXp(oldTotal);

  logger.info(`setLevelAndXp: Usuario ${userId} en guild ${guildId}: ${oldLevel} → ${level} (XP: ${oldTotal} → ${totalXp})`);

  if (!existing) {
    const created = new User({ guildId, userId, totalXp, level, messageCount: 0 });
    await created.save();
    return { user: created, oldLevel, newLevel: level, totalXp };
  }

  existing.totalXp = totalXp;
  existing.level = level;
  await existing.save();

  return { user: existing, oldLevel, newLevel: level, totalXp };
}

export async function setTotalXp(userId, guildId, totalXp) {
  const normalized = Math.max(0, totalXp || 0);
  const newLevel = levelFromXp(normalized);

  let doc = await User.findOne({ guildId, userId });
  const oldTotal = doc ? (doc.totalXp || 0) : 0;
  const oldLevel = doc ? (doc.level ?? levelFromXp(oldTotal)) : levelFromXp(oldTotal);

  logger.info(`setTotalXp: Usuario ${userId} en guild ${guildId}: Nivel ${oldLevel} → ${newLevel} (XP: ${oldTotal} → ${normalized})`);

  if (!doc) {
    doc = new User({ guildId, userId, totalXp: normalized, level: newLevel, messageCount: 0 });
  } else {
    doc.totalXp = normalized;
    doc.level = newLevel;
  }
  await doc.save();

  return { user: doc, oldLevel, newLevel, totalXp: normalized };
}

export async function postLevelChangeEffects(guild, member, oldLevel, newLevel, guildConfig = null, channel = null, userObj = null, opts = {}) {
  // guild: Discord.Guild
  // member: GuildMember (may be null)
  // guildConfig: optional pre-fetched Guild model
  // channel: optional channel to use for announcement
  // userObj: optional User object (discord user)
  // opts: { suppressAnnouncement: boolean }
  try {
    const cfg = guildConfig || (await (await import('../models/Guild.js')).default.findOne({ guildId: guild.id }) || {});

    logger.info(`postLevelChangeEffects: ${member?.user?.tag || 'unknown'} cambió de nivel ${oldLevel} → ${newLevel}`);

    let assigned = [], removed = [], skipped = [];
    if (member) {
      const res = await updateMemberRoles(guild, member, newLevel, cfg);
      assigned = res.assigned || [];
      removed = res.removed || [];
      skipped = res.skipped || [];
      
      logger.info(`Roles actualizados: +${assigned.length} -${removed.length} omitidos:${skipped.length}`);
    } else {
      logger.warn('No se pudo actualizar roles: member es null');
    }

    let announcementStatus = 'No se envió anuncio';
    const suppress = opts && opts.suppressAnnouncement;
    
    // Anunciar solo cuando sube de nivel (no cuando baja)
    if (!suppress && newLevel > oldLevel && cfg.levelUpEnabled) {
      const template = cfg.levelUpMessage || '🎉 {mention} ha subido al nivel {level}!';
      const mention = member ? `<@${member.id}>` : (userObj ? `<@${userObj.id}>` : '');
      const formatted = template
        .replace(/\{mention\}/g, mention)
        .replace(/\{username\}/g, userObj?.username || member?.user?.username || '')
        .replace(/\{level\}/g, String(newLevel))
        .replace(/\{oldLevel\}/g, String(oldLevel));

      // Determine target channel
      let targetChannel = channel || null;
      if (!targetChannel && cfg.levelUpChannelId) {
        try {
          const ch = await guild.channels.fetch(cfg.levelUpChannelId).catch(() => null);
          const botMember = guild.members.me;
          if (ch && ch.isTextBased && ch.permissionsFor(botMember).has(['SendMessages', 'ViewChannel'])) {
            targetChannel = ch;
          }
        } catch (e) {
          logger.warn('No se pudo obtener channel configurado de leveo en postLevelChangeEffects:', e?.message || e);
        }
      }

      // fallback: use system channel or first available text channel
      if (!targetChannel) {
        try {
          targetChannel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased && c.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel']));
        } catch (_) {
          targetChannel = null;
        }
      }

      if (targetChannel) {
        try {
          await targetChannel.send({ content: formatted });
          announcementStatus = `Anuncio enviado en ${targetChannel.id}`;
          logger.info(`✅ Anuncio de nivel enviado en canal ${targetChannel.name}`);
        } catch (e) {
          logger.warn('No se pudo enviar mensaje de leveo en postLevelChangeEffects:', e?.message || e);
          announcementStatus = 'Error al enviar anuncio (ver logs)';
        }
      } else {
        logger.warn('No se encontró un canal válido para enviar el anuncio de nivel');
      }
    } else if (newLevel < oldLevel) {
      logger.info(`Usuario bajó de nivel (${oldLevel} → ${newLevel}), no se envía anuncio`);
    }

    return { assigned, removed, skipped, announcementStatus };
  } catch (e) {
    logger.error('postLevelChangeEffects error:', e?.message || e);
    logger.error('Stack:', e?.stack);
    return { assigned: [], removed: [], skipped: [], announcementStatus: 'Error' };
  }
}