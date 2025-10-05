import achievementService from '../../services/achievementService.js';
import logger from '../../utils/logger.js';

/**
 * Configura los event listeners para trackear logros
 */
export function setupAchievementTracking(client) {
  // 1. Trackear mensajes (ya tienes messageCreate, agregar tracking ahí)
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    try {
      await achievementService.trackMessage(message.author.id, message.guild.id);
    } catch (error) {
      logger.error('Error tracking message for achievements:', error);
    }
  });

  // 2. Trackear reacciones recibidas
  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
      
      if (!reaction.message.guild || user.bot) return;
      
      // Trackear para el autor del mensaje (quien recibe la reacción)
      if (!reaction.message.author.bot) {
        await achievementService.trackReaction(
          reaction.message.author.id, 
          reaction.message.guild.id
        );
      }
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
      
      // Usuario se unió a un canal
      if (!oldState.channelId && newState.channelId) {
        await achievementService.trackVoiceJoin(userId, guildId, newState.channelId);
      }
      
      // Usuario salió de un canal
      if (oldState.channelId && !newState.channelId) {
        await achievementService.trackVoiceLeave(userId, guildId);
      }
      
      // Usuario cambió de canal (contar como salida y entrada)
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await achievementService.trackVoiceLeave(userId, guildId);
        await achievementService.trackVoiceJoin(userId, guildId, newState.channelId);
      }
    } catch (error) {
      logger.error('Error tracking voice for achievements:', error);
    }
  });

  // 4. Trackear boosts del servidor
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      if (!newMember.guild) return;
      
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