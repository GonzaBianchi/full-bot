import Achievement from '../models/Achievement.js';
import UserAchievement from '../models/UserAchievement.js';
import GuildModel from '../models/Guild.js';
import { generateAchievementNotification } from '../utils/achievementImageGenerator.js';
import { AttachmentBuilder } from 'discord.js';
import logger from '../utils/logger.js';

class AchievementService {
  constructor() {
    this.discordClient = null;
  }

  setClient(client) {
    this.discordClient = client;
    logger.info('Discord client inyectado en AchievementService');
  }

  async trackMessage(userId, guildId, channelId = null) {
    try {
      const userAch = await this.getUserAchievement(userId, guildId);
      userAch.stats.totalMessages += 1;
      
      await this.checkAndUnlockAchievements(userAch, 'messages', channelId);
      await userAch.save();
    } catch (error) {
      logger.error('Error tracking message achievement:', error);
    }
  }

  async trackReaction(userId, guildId, channelId = null) {
    try {
      const userAch = await this.getUserAchievement(userId, guildId);
      userAch.stats.totalReactions += 1;
      
      await this.checkAndUnlockAchievements(userAch, 'reactions', channelId);
      await userAch.save();
    } catch (error) {
      logger.error('Error tracking reaction achievement:', error);
    }
  }

  async trackReactionGiven(userId, guildId, channelId = null) {
    try {
      const userAch = await this.getUserAchievement(userId, guildId);
      userAch.stats.totalReactionsGiven += 1;
      
      await this.checkAndUnlockAchievements(userAch, 'reactions_given', channelId);
      await userAch.save();
    } catch (error) {
      logger.error('Error tracking reaction given achievement:', error);
    }
  }

  async trackVoiceJoin(userId, guildId, channelId) {
    try {
      const userAch = await this.getUserAchievement(userId, guildId);
      userAch.currentVoiceSession = {
        channelId,
        joinedAt: new Date()
      };
      await userAch.save();
    } catch (error) {
      logger.error('Error tracking voice join:', error);
    }
  }

  async trackVoiceLeave(userId, guildId, channelId = null) {
    try {
      const userAch = await this.getUserAchievement(userId, guildId);
      
      if (userAch.currentVoiceSession?.joinedAt) {
        const duration = Math.floor((Date.now() - userAch.currentVoiceSession.joinedAt.getTime()) / 1000);
        userAch.stats.totalVoiceTime += duration;
        userAch.currentVoiceSession = { channelId: null, joinedAt: null };
        
        await this.checkAndUnlockAchievements(userAch, 'voice_time', channelId);
        await userAch.save();
      }
    } catch (error) {
      logger.error('Error tracking voice leave:', error);
    }
  }

  async trackBoost(userId, guildId, channelId = null) {
    try {
      const userAch = await this.getUserAchievement(userId, guildId);
      userAch.stats.hasBoosted = true;
      
      await this.checkAndUnlockAchievements(userAch, 'boost', channelId);
      await userAch.save();
    } catch (error) {
      logger.error('Error tracking boost achievement:', error);
    }
  }

  async trackBoostRemoved(userId, guildId) {
    try {
      const userAch = await this.getUserAchievement(userId, guildId);
      userAch.stats.hasBoosted = false;
      await userAch.save();
      
      logger.info(`Usuario ${userId} removió su boost en guild ${guildId}`);
    } catch (error) {
      logger.error('Error tracking boost removal:', error);
    }
  }

  async getUserAchievement(userId, guildId) {
    let userAch = await UserAchievement.findOne({ userId, guildId });
    
    if (!userAch) {
      userAch = await UserAchievement.create({ userId, guildId });
      
      const achievements = await Achievement.find({ guildId, enabled: true });
      for (const ach of achievements) {
        userAch.achievements.push({
          achievementId: ach._id,
          currentValue: 0,
          unlockedTiers: []
        });
      }
      await userAch.save();
    }
    
    return userAch;
  }

  async checkAndUnlockAchievements(userAch, type, channelId = null) {
    const achievements = await Achievement.find({ 
      guildId: userAch.guildId, 
      type, 
      enabled: true 
    });

    for (const achievement of achievements) {
      let progress = userAch.achievements.find(
        a => a.achievementId.toString() === achievement._id.toString()
      );

      if (!progress) {
        progress = {
          achievementId: achievement._id,
          currentValue: 0,
          unlockedTiers: []
        };
        userAch.achievements.push(progress);
      }

      switch (type) {
        case 'messages':
          progress.currentValue = userAch.stats.totalMessages;
          break;
        case 'reactions':
          progress.currentValue = userAch.stats.totalReactions;
          break;
        case 'reactions_given':
          progress.currentValue = userAch.stats.totalReactionsGiven;
          break;
        case 'voice_time':
          progress.currentValue = userAch.stats.totalVoiceTime;
          break;
        case 'boost':
          progress.currentValue = userAch.stats.hasBoosted ? 1 : 0;
          break;
      }

      for (const tier of achievement.tiers.sort((a, b) => a.tier - b.tier)) {
        if (
          progress.currentValue >= tier.target && 
          !progress.unlockedTiers.includes(tier.tier)
        ) {
          progress.unlockedTiers.push(tier.tier);
          progress.lastUnlockedAt = new Date();
          
          logger.info(
            `Usuario ${userAch.userId} desbloqueó: ${achievement.name} - ${tier.title} en guild ${userAch.guildId}`
          );
          
          await this.sendAchievementNotification(
            userAch.userId,
            userAch.guildId,
            achievement,
            tier,
            channelId
          );
          
          if (tier.rewardRoleId) {
            await this.assignRewardRole(userAch.userId, userAch.guildId, tier.rewardRoleId);
          }
        }
      }
    }
  }

  async sendAchievementNotification(userId, guildId, achievement, tier, fallbackChannelId = null) {
    try {
      if (!achievement.notifications?.enabled) {
        return;
      }

      if (!this.discordClient) {
        logger.warn('Discord client no disponible para notificación de logro');
        return;
      }

      const guild = await this.discordClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return;

      let notificationChannelId = achievement.notifications.channelId || fallbackChannelId;
      if (!notificationChannelId) return;

      const channel = await guild.channels.fetch(notificationChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) return;

      // Obtener configuración de imagen
      const guildConfig = await GuildModel.findOne({ guildId }).lean();
      const imageConfig = guildConfig?.images?.achievementNotification || {};

      // Generar imagen de notificación
      const imageBuffer = await generateAchievementNotification({
        user: member.user,
        achievement,
        tier,
        imageUrl: imageConfig.url,
        blur: imageConfig.blur || 6,
        opacity: imageConfig.opacity || 0.7
      });

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'achievement.png' });

      // Preparar mensaje de texto
      let message = achievement.notifications.message || '{mention} ha desbloqueado: **{achievement}** - {tier}!';
      
      message = message
        .replace(/{mention}/g, `<@${userId}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{achievement}/g, achievement.name)
        .replace(/{tier}/g, `${tier.emoji || ''} ${tier.title}`)
        .replace(/{tierTitle}/g, tier.title)
        .replace(/{emoji}/g, tier.emoji || '')
        .replace(/{icon}/g, achievement.icon || '');

      await channel.send({
        content: message,
        files: [attachment],
        allowedMentions: { users: [userId] }
      });

      logger.info(`Notificación de logro enviada a ${member.user.tag} en ${channel.name}`);
    } catch (error) {
      logger.error('Error enviando notificación de logro:', error);
    }
  }

  async assignRewardRole(userId, guildId, roleId) {
    try {
      if (!this.discordClient) return;

      const guild = await this.discordClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return;

      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role) {
        logger.warn(`Rol de recompensa ${roleId} no encontrado`);
        return;
      }

      if (!guild.members.me.permissions.has('ManageRoles')) {
        logger.warn('Bot sin permiso ManageRoles');
        return;
      }

      if (guild.members.me.roles.highest.comparePositionTo(role) <= 0) {
        logger.warn(`Bot no puede gestionar rol ${role.name} (jerarquía)`);
        return;
      }

      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId, 'Recompensa de logro');
        logger.info(`Rol ${role.name} asignado a ${member.user.tag}`);
      }
    } catch (error) {
      logger.error('Error asignando rol de recompensa:', error);
    }
  }

  async getUserProgress(userId, guildId) {
    const userAch = await this.getUserAchievement(userId, guildId);
    const achievements = await Achievement.find({ guildId, enabled: true }).lean();

    const progress = [];
    let totalProgress = 0;
    let completedTiers = 0;
    let totalTiers = 0;

    for (const achievement of achievements) {
      const userProgress = userAch.achievements.find(
        a => a.achievementId.toString() === achievement._id.toString()
      );

      let currentValue = 0;
      switch (achievement.type) {
        case 'messages':
          currentValue = userAch.stats.totalMessages;
          break;
        case 'reactions':
          currentValue = userAch.stats.totalReactions;
          break;
        case 'reactions_given':
          currentValue = userAch.stats.totalReactionsGiven;
          break;
        case 'voice_time':
          currentValue = userAch.stats.totalVoiceTime;
          break;
        case 'boost':
          currentValue = userAch.stats.hasBoosted ? 1 : 0;
          break;
      }

      const unlockedTiers = userProgress?.unlockedTiers || [];
      const sortedTiers = achievement.tiers.sort((a, b) => a.tier - b.tier);
      
      let currentTier = null;
      let nextTier = null;
      
      for (let i = 0; i < sortedTiers.length; i++) {
        if (unlockedTiers.includes(sortedTiers[i].tier)) {
          currentTier = sortedTiers[i];
        } else if (!nextTier) {
          nextTier = sortedTiers[i];
        }
      }

      let tierProgress = 0;
      if (nextTier) {
        const prevTarget = currentTier?.target || 0;
        const range = nextTier.target - prevTarget;
        const current = Math.min(currentValue, nextTier.target) - prevTarget;
        tierProgress = Math.floor((current / range) * 100);
      } else if (sortedTiers.length > 0) {
        tierProgress = 100;
      }

      totalTiers += sortedTiers.length;
      completedTiers += unlockedTiers.length;

      progress.push({
        achievement: {
          id: achievement._id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          type: achievement.type
        },
        currentValue,
        unlockedTiers,
        currentTier,
        nextTier,
        progress: tierProgress,
        completed: unlockedTiers.length === sortedTiers.length,
        tierStatus: `${unlockedTiers.length}/${sortedTiers.length}`
      });
    }

    totalProgress = totalTiers > 0 ? Math.floor((completedTiers / totalTiers) * 100) : 0;

    return {
      userId,
      guildId,
      stats: userAch.stats,
      achievements: progress,
      summary: {
        totalProgress,
        completedTiers,
        totalTiers,
        completedAchievements: progress.filter(p => p.completed).length,
        totalAchievements: achievements.length
      }
    };
  }

  async syncBoostRole(guild, boostRoleId) {
    try {
      const role = await guild.roles.fetch(boostRoleId);
      if (!role) return;

      const members = role.members;
      
      for (const [memberId, member] of members) {
        if (member.user.bot) continue;
        
        const userAch = await this.getUserAchievement(memberId, guild.id);
        if (!userAch.stats.hasBoosted) {
          userAch.stats.hasBoosted = true;
          await this.checkAndUnlockAchievements(userAch, 'boost');
          await userAch.save();
          logger.info(`Sincronizado boost para usuario ${memberId} en guild ${guild.id}`);
        }
      }
    } catch (error) {
      logger.error('Error syncing boost role:', error);
    }
  }
}

export default new AchievementService();