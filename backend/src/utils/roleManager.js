import Guild from '../models/Guild.js';
import logger from './logger.js';

export async function updateMemberRoles(guild, member, newLevel, guildConfig = null) {
  // guild: Discord.Guild object
  // member: Discord.GuildMember object
  try {
    // Allow caller to pass guildConfig to avoid extra DB call
    const cfg = guildConfig || (await Guild.findOne({ guildId: guild.id }) || {});
    if (!Array.isArray(cfg.levelRoles) || cfg.levelRoles.length === 0) {
      logger.info(`No hay roles de nivel configurados para guild ${guild.id}`);
      return { assigned: [], removed: [], skipped: [] };
    }

    logger.info(`Actualizando roles para usuario ${member.id} en nivel ${newLevel}`);
    logger.info(`Roles de nivel configurados: ${JSON.stringify(cfg.levelRoles)}`);

    // Separar roles que el usuario DEBE tener vs roles que NO debe tener
    const shouldHave = cfg.levelRoles
      .filter(r => r.level <= newLevel)
      .map(r => r.roleId);
    
    const shouldNotHave = cfg.levelRoles
      .filter(r => r.level > newLevel)
      .map(r => r.roleId);

    logger.info(`Roles que debe tener (nivel ${newLevel}): ${shouldHave.join(', ')}`);
    logger.info(`Roles que NO debe tener (nivel ${newLevel}): ${shouldNotHave.join(', ')}`);

    const assigned = [];
    const removed = [];
    const skipped = [];

    const botMember = guild.members.me;

    // IMPORTANTE: Primero REMOVER roles de niveles superiores
    for (const roleId of shouldNotHave) {
      if (member.roles.cache.has(roleId)) {
        const roleObj = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
        
        if (!roleObj) { 
          skipped.push({ roleId, reason: 'Rol no encontrado en el servidor' }); 
          continue; 
        }

        // Verificar jerarquía de roles
        if (!botMember.roles || botMember.roles.highest.position <= roleObj.position) { 
          skipped.push({ roleId, reason: 'Rol por encima del bot en jerarquía', roleName: roleObj.name }); 
          continue; 
        }

        try {
          await member.roles.remove(roleId, `Rol de nivel superior removido (nivel actual: ${newLevel})`);
          removed.push(roleId);
          logger.info(`✅ Rol removido: ${roleObj.name} (${roleId}) de ${member.user.tag}`);
        } catch (e) {
          logger.warn(`Error removiendo rol ${roleObj.name}:`, e?.message || e);
          skipped.push({ roleId, reason: 'Error al remover', error: e.message });
        }
      }
    }

    // Luego ASIGNAR roles que debe tener
    for (const roleId of shouldHave) {
      if (!member.roles.cache.has(roleId)) {
        const roleObj = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
        
        if (!roleObj) { 
          skipped.push({ roleId, reason: 'Rol no encontrado en el servidor' }); 
          continue; 
        }

        // Verificar jerarquía de roles
        if (!botMember.roles || botMember.roles.highest.position <= roleObj.position) { 
          skipped.push({ roleId, reason: 'Rol por encima del bot en jerarquía', roleName: roleObj.name }); 
          continue; 
        }

        try {
          await member.roles.add(roleId, `Rol de nivel asignado (nivel: ${newLevel})`);
          assigned.push(roleId);
          logger.info(`✅ Rol asignado: ${roleObj.name} (${roleId}) a ${member.user.tag}`);
        } catch (e) {
          logger.warn(`Error asignando rol ${roleObj.name}:`, e?.message || e);
          skipped.push({ roleId, reason: 'Error al asignar', error: e.message });
        }
      } else {
        logger.info(`Usuario ${member.user.tag} ya tiene el rol ${roleId}`);
      }
    }

    logger.info(`Resumen de cambios de roles para ${member.user.tag}:`);
    logger.info(`- Asignados: ${assigned.length}`);
    logger.info(`- Removidos: ${removed.length}`);
    logger.info(`- Omitidos: ${skipped.length}`);

    return { assigned, removed, skipped };
  } catch (e) {
    logger.error('updateMemberRoles error:', e?.message || e);
    logger.error('Stack:', e?.stack);
    return { assigned: [], removed: [], skipped: [] };
  }
}