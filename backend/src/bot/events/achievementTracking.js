import achievementService from '../../services/achievementService.js';
import logger from '../../utils/logger.js';

/**
 * Rama de logros del pipeline de messageCreate.
 * Antes esto era un listener propio de messageCreate, así que cada mensaje
 * pasaba dos veces por el mismo filtrado.
 */
export async function handleMessageAchievements(message) {
  try {
    await achievementService.trackMessage(
      message.author.id,
      message.guild.id,
      message.channel.id
    );
  } catch (error) {
    logger.error('Error tracking message for achievements:', error);
  }
}

/**
 * Listeners que no cuelgan de messageCreate: reacciones, voz y boosts.
 */
export function setupAchievementTracking(client) {
  achievementService.setClient(client);

  // Reacciones (recibidas y dadas)
  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      if (!reaction.message.guild || user.bot) return;

      const guildId = reaction.message.guild.id;
      const channelId = reaction.message.channel.id;
      const author = reaction.message.author;

      // Quien RECIBE la reacción
      if (author && !author.bot && author.id !== user.id) {
        await achievementService.trackReaction(author.id, guildId, channelId);
      }

      // Quien DA la reacción
      await achievementService.trackReactionGiven(user.id, guildId, channelId);
    } catch (error) {
      logger.error('Error tracking reaction for achievements:', error);
    }
  });

  // Tiempo en canales de voz
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      const userId = newState.id || oldState.id;
      const guildId = newState.guild?.id || oldState.guild?.id;
      if (!guildId) return;

      const member = newState.member || oldState.member;
      if (member?.user?.bot) return;

      const left = oldState.channelId;
      const joined = newState.channelId;

      if (left && left !== joined) {
        await achievementService.trackVoiceLeave(userId, guildId, left);
      }
      if (joined && joined !== left) {
        await achievementService.trackVoiceJoin(userId, guildId, joined);
      }
    } catch (error) {
      logger.error('Error tracking voice for achievements:', error);
    }
  });

  // Boosts del servidor
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      if (!newMember.guild || newMember.user.bot) return;

      const wasBooster = oldMember.premiumSince !== null;
      const isBooster = newMember.premiumSince !== null;

      if (!wasBooster && isBooster) {
        await achievementService.trackBoost(newMember.id, newMember.guild.id);
        logger.info(`🚀 ${newMember.user.tag} ha boosteado el servidor ${newMember.guild.name}`);
      } else if (wasBooster && !isBooster) {
        await achievementService.trackBoostRemoved(newMember.id, newMember.guild.id);
      }
    } catch (error) {
      logger.error('Error tracking boost for achievements:', error);
    }
  });

  logger.info('✅ Achievement tracking configurado');
}

export default setupAchievementTracking;
