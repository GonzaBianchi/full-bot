import Guild from '../models/Guild.js';
import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

/** Resuelve un rol desde la caché del guild, con fetch como respaldo. */
async function resolveRole(guild, roleId) {
  return guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
}

/** Filtra los roles que el bot puede tocar; el resto se anota en `skipped`. */
async function partitionManageable(guild, roleIds, action, skipped) {
  const manageable = [];
  const botHighestRole = guild.members.me?.roles?.highest;

  for (const roleId of roleIds) {
    const roleObj = await resolveRole(guild, roleId);

    if (!roleObj) {
      skipped.push({ roleId, reason: 'Rol no encontrado', action });
      continue;
    }

    // comparePositionTo tiene en cuenta el desempate por id, cosa que la
    // comparación de `position` a secas no hacía.
    if (botHighestRole && botHighestRole.comparePositionTo(roleObj) <= 0) {
      skipped.push({ roleId, reason: `Rol ${roleObj.name} está por encima del bot`, action });
      logger.debug(`Jerarquía insuficiente para ${action === 'add' ? 'asignar' : 'remover'} ${roleObj.name}`);
      continue;
    }

    manageable.push(roleId);
  }

  return manageable;
}

export async function updateMemberRoles(guild, member, newLevel, guildConfig = null) {
  try {
    const cfg = guildConfig || (await Guild.findOne({ guildId: guild.id }).lean()) || {};

    if (!Array.isArray(cfg.levelRoles) || cfg.levelRoles.length === 0) {
      logger.debug(`No hay roles de nivel configurados para guild ${guild.id}`);
      return { assigned: [], removed: [], skipped: [] };
    }

    logger.debug(`Actualizando roles para ${member.user.tag} (nivel ${newLevel})`);

    const allLevelRoleIds = cfg.levelRoles.map(r => r.roleId);
    const eligible = cfg.levelRoles
      .filter(r => r.level <= newLevel)
      .sort((a, b) => b.level - a.level);

    // Por defecto solo el rol del nivel más alto alcanzado; con stackRoles, todos.
    const shouldHave = cfg.stackRoles === true
      ? eligible.map(r => r.roleId)
      : (eligible.length > 0 ? [eligible[0].roleId] : []);

    const skipped = [];

    const toRemove = await partitionManageable(
      guild,
      allLevelRoleIds.filter(id => !shouldHave.includes(id) && member.roles.cache.has(id)),
      'remove',
      skipped
    );

    const toAdd = await partitionManageable(
      guild,
      shouldHave.filter(id => !member.roles.cache.has(id)),
      'add',
      skipped
    );

    const removed = [];
    const assigned = [];

    // Una llamada a Discord por operación, en vez de una por rol.
    if (toRemove.length > 0) {
      try {
        await member.roles.remove(toRemove, `Actualización automática: nivel ${newLevel}`);
        removed.push(...toRemove);
      } catch (e) {
        logger.error('Error removiendo roles de nivel:', e?.message);
        for (const roleId of toRemove) skipped.push({ roleId, reason: `Error: ${e.message}`, action: 'remove' });
      }
    }

    if (toAdd.length > 0) {
      try {
        await member.roles.add(toAdd, `Nivel alcanzado: ${newLevel}`);
        assigned.push(...toAdd);
      } catch (e) {
        logger.error('Error asignando roles de nivel:', e?.message);
        for (const roleId of toAdd) skipped.push({ roleId, reason: `Error: ${e.message}`, action: 'add' });
      }
    }

    if (assigned.length > 0 || removed.length > 0) {
      logger.info(`Roles de nivel actualizados para ${member.user.tag}: +${assigned.length} -${removed.length}`);

      // El bot también deja rastro en el audit log, no solo el dashboard.
      AuditLog.create({
        guildId: guild.id,
        userId: member.id,
        action: 'level_roles_updated',
        data: { level: newLevel, assigned, removed }
      }).catch(err => logger.warn('Error escribiendo audit log de roles:', err.message));
    }

    if (skipped.length > 0) {
      logger.debug(`Roles omitidos para ${member.user.tag}: ${skipped.length}`);
    }

    return { assigned, removed, skipped };
  } catch (e) {
    logger.error('updateMemberRoles error:', e?.message || e);
    logger.error('Stack:', e?.stack);
    return { assigned: [], removed: [], skipped: [] };
  }
}
