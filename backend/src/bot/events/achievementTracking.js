import achievementService from '../../services/achievementService.js';
import logger from '../../utils/logger.js';

/**
 * Configura los event listeners para trackear logros
 */
export function setupAchievementTracking(client) {
  // Inyectar el cliente de Discord en el service para notificaciones
  achievementService.setClient(client);

  // 1. Trackear mensajes
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    try {
      await achievementService.trackMessage(
        message.author.id, 
        message.guild.id,
        message.channel.id
      );
    } catch (error) {
      logger.error('Error tracking message for achievements:', error);
    }
  });

  // 2. Trackear reacciones (tanto recibidas como dadas)
  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
      
      if (!reaction.message.guild || user.bot) return;
      
      // Trackear para el autor del mensaje (quien RECIBE la reacción)
      if (reaction.message.author && !reaction.message.author.bot && reaction.message.author.id !== user.id) {
        await achievementService.trackReaction(
          reaction.message.author.id, 
          reaction.message.guild.id,
          reaction.message.channel.id
        );
      }

      // ⭐ NUEVO: Trackear para el usuario que DIO la reacción
      await achievementService.trackReactionGiven(
        user.id,
        reaction.message.guild.id,
        reaction.message.channel.id
      );
    } catch (error) {
      logger.error('Error tracking reaction for achievements:', error);
    }
  });

  // 3. Trackear tiempo en voice
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      const userId = newState.id || oldState.id;
      const guildId = newState.guild?.id || oldState.guild?.id;
      
      if (!guildId) return;
      
      const member = newState.member || oldState.member;
      if (member?.user?.bot) return; // Ignorar bots
      
      // Usuario se unió a un canal
      if (!oldState.channelId && newState.channelId) {
        await achievementService.trackVoiceJoin(userId, guildId, newState.channelId);
      }
      
      // Usuario salió de un canal
      if (oldState.channelId && !newState.channelId) {
        await achievementService.trackVoiceLeave(userId, guildId, oldState.channelId);
      }
      
      // Usuario cambió de canal
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await achievementService.trackVoiceLeave(userId, guildId, oldState.channelId);
        await achievementService.trackVoiceJoin(userId, guildId, newState.channelId);
      }
    } catch (error) {
      logger.error('Error tracking voice for achievements:', error);
    }
  });

  // 4. Trackear boosts del servidor
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      if (!newMember.guild || newMember.user.bot) return;
      
      // Verificar si el miembro empezó a boostear
      const wasBooster = oldMember.premiumSince !== null;
      const isBooster = newMember.premiumSince !== null;
      
      if (!wasBooster && isBooster) {
        await achievementService.trackBoost(newMember.id, newMember.guild.id);
        logger.info(`🚀 Usuario ${newMember.user.tag} ha boosteado el servidor ${newMember.guild.name}`);
      }
    } catch (error) {
      logger.error('Error tracking boost for achievements:', error);
    }
  });

  logger.info('✅ Achievement tracking configurado');
}

export default setupAchievementTracking;