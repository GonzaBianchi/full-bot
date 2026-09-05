import AuditLog from '../models/AuditLog.js';
import { getGuildConfig } from './guildConfigCache.js';
import { postLevelChangeEffects } from './xpSystem.js';
import logger from './logger.js';

/**
 * Efectos comunes a /setlevel, /sumarxp y /restarxp: resolver config y miembro,
 * aplicar roles y anuncio, dejar rastro en el audit log y traducir los ids de
 * rol a nombres para la respuesta. Los tres comandos repetían este bloque.
 */
export async function applyLevelChange(interaction, targetUser, result, { suppressAnnouncement = false, action, data = {} } = {}) {
  const guild = interaction.guild;

  const [guildConfig, member] = await Promise.all([
    getGuildConfig(guild.id),
    guild.members.fetch(targetUser.id).catch(() => null)
  ]);

  const effects = await postLevelChangeEffects(
    guild,
    member,
    result.oldLevel,
    result.newLevel,
    guildConfig,
    null,
    targetUser,
    { suppressAnnouncement }
  );

  // Las acciones del bot también quedan auditadas, no solo las del dashboard.
  AuditLog.create({
    guildId: guild.id,
    userId: interaction.user.id,
    action,
    data: {
      targetUserId: targetUser.id,
      oldLevel: result.oldLevel,
      newLevel: result.newLevel,
      ...data
    }
  }).catch(err => logger.warn('Error escribiendo audit log:', err.message));

  const roleName = id => guild.roles.cache.get(id)?.name || id;

  return {
    ...effects,
    assignedNames: (effects.assigned || []).map(roleName),
    removedNames: (effects.removed || []).map(roleName),
    skippedNames: [...new Set(
      (effects.skipped || []).map(s => (s.roleId ? roleName(s.roleId) : (s.reason || 'omitido')))
    )]
  };
}
