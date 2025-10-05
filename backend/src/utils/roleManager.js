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

    logger.info(`🔄 Actualizando roles para ${member.user.tag} (Nivel ${newLevel})`);
    logger.info(`📋 Roles configurados: ${cfg.levelRoles.map(r => `Lv${r.level}=${r.roleId}`).join(', ')}`);

    // Modo default: solo el rol del nivel más alto alcanzado
    const stackRoles = cfg.stackRoles === true; // default false

    let shouldHave = [];
    let allLevelRoleIds = cfg.levelRoles.map(r => r.roleId);

    if (stackRoles) {
      // Modo apilar: mantener TODOS los roles de niveles <= nivel actual
      shouldHave = cfg.levelRoles
        .filter(r => r.level <= newLevel)
        .map(r => r.roleId);
      
      logger.info(`📚 Modo APILAR: Usuario debe tener ${shouldHave.length} roles`);
    } else {
      // Modo SOLO EL MÁS ALTO (comportamiento deseado)
      const eligibleRoles = cfg.levelRoles
        .filter(r => r.level <= newLevel)
        .sort((a, b) => b.level - a.level); // ordenar de mayor a menor
      
      if (eligibleRoles.length > 0) {
        shouldHave = [eligibleRoles[0].roleId]; // solo el más alto
        logger.info(`🎯 Modo SOLO MÁS ALTO: Usuario debe tener rol de nivel ${eligibleRoles[0].level}`);
      } else {
        logger.info(`⚠️ Usuario nivel ${newLevel} no alcanza ningún rol configurado`);
      }
    }

    // Todos los roles de nivel que el usuario NO debe tener
    const shouldNotHave = allLevelRoleIds.filter(roleId => !shouldHave.includes(roleId));

    logger.info(`✅ Roles a tener: ${shouldHave.join(', ') || 'ninguno'}`);
    logger.info(`❌ Roles a quitar: ${shouldNotHave.join(', ') || 'ninguno'}`);

    // Obtener todos los roles de nivel que el usuario tiene actualmente
    const currentLevelRoles = allLevelRoleIds.filter(roleId => member.roles.cache.has(roleId));
    logger.info(`📌 Roles actuales: ${currentLevelRoles.join(', ') || 'ninguno'}`);

    const assigned = [];
    const removed = [];
    const skipped = [];

    const botMember = guild.members.me;
    const botHighestRole = botMember.roles?.highest;

    // PASO 1: REMOVER todos los roles que NO debe tener
    for (const roleId of shouldNotHave) {
      // Solo intentar remover si el usuario lo tiene
      if (!member.roles.cache.has(roleId)) continue;

      const roleObj = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
      
      if (!roleObj) { 
        skipped.push({ roleId, reason: 'Rol no encontrado', action: 'remove' }); 
        continue; 
      }

      // Verificar jerarquía
      if (botHighestRole && botHighestRole.position <= roleObj.position) { 
        skipped.push({ roleId, reason: `Rol ${roleObj.name} está por encima del bot`, action: 'remove' }); 
        logger.warn(`⚠️ No puedo remover ${roleObj.name} - jerarquía insuficiente`);
        continue; 
      }

      try {
        await member.roles.remove(roleId, `Actualización automática: nivel ${newLevel}`);
        removed.push(roleId);
        logger.info(`🗑️ Rol removido: ${roleObj.name}`);
      } catch (e) {
        logger.error(`❌ Error removiendo rol ${roleObj.name}:`, e?.message);
        skipped.push({ roleId, reason: `Error: ${e.message}`, action: 'remove' });
      }
    }

    // PASO 2: ASIGNAR los roles que debe tener
    for (const roleId of shouldHave) {
      // Solo intentar asignar si el usuario NO lo tiene
      if (member.roles.cache.has(roleId)) {
        logger.info(`✓ Usuario ya tiene el rol ${roleId}`);
        continue;
      }

      const roleObj = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
      
      if (!roleObj) { 
        skipped.push({ roleId, reason: 'Rol no encontrado', action: 'add' }); 
        logger.warn(`⚠️ Rol ${roleId} no existe en el servidor`);
        continue; 
      }

      // Verificar jerarquía
      if (botHighestRole && botHighestRole.position <= roleObj.position) { 
        skipped.push({ roleId, reason: `Rol ${roleObj.name} está por encima del bot`, action: 'add' }); 
        logger.warn(`⚠️ No puedo asignar ${roleObj.name} - jerarquía insuficiente`);
        continue; 
      }

      try {
        await member.roles.add(roleId, `Nivel alcanzado: ${newLevel}`);
        assigned.push(roleId);
        logger.info(`✅ Rol asignado: ${roleObj.name}`);
      } catch (e) {
        logger.error(`❌ Error asignando rol ${roleObj.name}:`, e?.message);
        skipped.push({ roleId, reason: `Error: ${e.message}`, action: 'add' });
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