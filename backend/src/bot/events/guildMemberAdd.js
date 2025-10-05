// backend/src/bot/events/guildMemberAdd.js
import GuildModel from '../../models/Guild.js';
import UserModel from '../../models/User.js';
import { levelFromXp } from '../utils/levelSystem.js';
import logger from '../../utils/logger.js';

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      // Ignorar bots
      if (member.user.bot) return;

      const guildId = member.guild.id;
      const userId = member.user.id;

      // Obtener configuración del servidor
      const guildConfig = await GuildModel.findOne({ guildId });
      
      if (!guildConfig || !guildConfig.autoRoles?.enabled) {
        return; // Auto-roles deshabilitado
      }

      const { autoRoles } = guildConfig;
      const rolesToAssign = new Set();

      // 1. Verificar si el usuario ya tenía XP previo en este servidor
      const userRecord = await UserModel.findOne({ guildId, userId });
      
      if (userRecord && userRecord.totalXp > 0 && autoRoles.restoreLevelRoles) {
        // Restaurar roles de nivel basados en su XP anterior
        const userLevel = levelFromXp(userRecord.totalXp);
        
        if (guildConfig.levelRoles && guildConfig.levelRoles.length > 0) {
          // Determinar qué roles de nivel debe tener
          if (guildConfig.stackRoles) {
            // Modo apilar: dar todos los roles hasta su nivel
            guildConfig.levelRoles
              .filter(lr => lr.level <= userLevel)
              .forEach(lr => rolesToAssign.add(lr.roleId));
          } else {
            // Modo reemplazar: dar solo el rol más alto que haya alcanzado
            const eligibleRoles = guildConfig.levelRoles
              .filter(lr => lr.level <= userLevel)
              .sort((a, b) => b.level - a.level);
            
            if (eligibleRoles.length > 0) {
              rolesToAssign.add(eligibleRoles[0].roleId);
            }
          }
          
          logger.info(`Usuario ${userId} regresó al servidor ${guildId} con nivel ${userLevel}`);
        }
      }

      // 2. Agregar roles por defecto configurados
      if (autoRoles.roles && autoRoles.roles.length > 0) {
        autoRoles.roles.forEach(roleId => rolesToAssign.add(roleId));
      }

      // 3. Asignar todos los roles válidos
      if (rolesToAssign.size > 0) {
        const validRoles = [];
        
        for (const roleId of rolesToAssign) {
          try {
            const role = await member.guild.roles.fetch(roleId);
            if (role && role.editable) {
              validRoles.push(role);
            } else {
              logger.warn(`Rol ${roleId} no encontrado o no editable en ${guildId}`);
            }
          } catch (e) {
            logger.warn(`Error fetching role ${roleId}:`, e.message);
          }
        }

        if (validRoles.length > 0) {
          try {
            await member.roles.add(validRoles, 'Auto-roles al unirse al servidor');
            logger.info(`Asignados ${validRoles.length} roles a ${userId} en ${guildId}`);
          } catch (e) {
            logger.error(`Error asignando roles a ${userId} en ${guildId}:`, e);
          }
        }
      }

      // 4. Enviar mensaje de bienvenida (opcional)
      if (autoRoles.welcomeChannelId && autoRoles.welcomeMessage) {
        try {
          const welcomeChannel = await member.guild.channels.fetch(autoRoles.welcomeChannelId);
          
          if (welcomeChannel && welcomeChannel.isTextBased()) {
            let message = autoRoles.welcomeMessage
              .replace(/{mention}/g, `<@${userId}>`)
              .replace(/{username}/g, member.user.username)
              .replace(/{server}/g, member.guild.name);

            // Si el usuario tenía XP previo, agregar info al mensaje
            if (userRecord && userRecord.totalXp > 0) {
              const userLevel = levelFromXp(userRecord.totalXp);
              message += `\n✨ ¡Bienvenido de vuelta! Tu progreso ha sido restaurado (Nivel ${userLevel}).`;
            }

            await welcomeChannel.send(message);
          }
        } catch (e) {
          logger.error(`Error enviando mensaje de bienvenida en ${guildId}:`, e);
        }
      }

    } catch (error) {
      logger.error('Error en guildMemberAdd event:', error);
    }
  }
};