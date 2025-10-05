import Guild from '../models/Guild.js';
import logger from './logger.js';

export async function updateMemberRoles(guild, member, newLevel, guildConfig = null) {
  // guild: Discord.Guild object
  // member: Discord.GuildMember object
  try {
    // Allow caller to pass guildConfig to avoid extra DB call
    const cfg = guildConfig || (await Guild.findOne({ guildId: guild.id }) || {});
    if (!Array.isArray(cfg.levelRoles) || cfg.levelRoles.length === 0) return { assigned: [], removed: [], skipped: [] };

    const toAssign = cfg.levelRoles.filter(r => r.level <= newLevel).map(r => r.roleId);
    const toRemove = cfg.levelRoles.filter(r => r.level > newLevel).map(r => r.roleId);

    const assigned = [];
    const removed = [];
    const skipped = [];

    const botMember = guild.members.me;

    // Assign
    for (const roleId of toAssign) {
      if (!member.roles.cache.has(roleId)) {
        const roleObj = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
        if (!roleObj) { skipped.push({ roleId, reason: 'Rol no encontrado' }); continue; }
        if (!botMember.roles || botMember.roles.highest.position <= roleObj.position) { skipped.push({ roleId, reason: 'Rol por encima del bot' }); continue; }
        try {
          await member.roles.add(roleId);
          assigned.push(roleId);
        } catch (e) {
          logger.warn('Error asignando rol en roleManager:', e?.message || e);
          skipped.push({ roleId, reason: 'Error asignando' });
        }
      }
    }

    // Remove
    for (const roleId of toRemove) {
      if (member.roles.cache.has(roleId)) {
        const roleObj = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
        if (!roleObj) { skipped.push({ roleId, reason: 'Rol no encontrado' }); continue; }
        if (!botMember.roles || botMember.roles.highest.position <= roleObj.position) { skipped.push({ roleId, reason: 'Rol por encima del bot' }); continue; }
        try {
          await member.roles.remove(roleId);
          removed.push(roleId);
        } catch (e) {
          logger.warn('Error removiendo rol en roleManager:', e?.message || e);
          skipped.push({ roleId, reason: 'Error removiendo' });
        }
      }
    }

    return { assigned, removed, skipped };
  } catch (e) {
    logger.warn('updateMemberRoles error:', e?.message || e);
    return { assigned: [], removed: [], skipped: [] };
  }
}
