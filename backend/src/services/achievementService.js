import UserAchievement from '../models/UserAchievement.js';
import { getEnabledAchievements } from '../utils/achievementDefsCache.js';
import { getGuildConfig } from '../utils/guildConfigCache.js';
import { generateAchievementNotification } from '../bot/utils/achievementImageGenerator.js';
import { AttachmentBuilder } from 'discord.js';
import logger from '../utils/logger.js';

class AchievementService {
  constructor() {
    this.discordClient = null;
    // ========== NUEVO: Cache para prevenir notificaciones duplicadas ==========
    this.notificationCache = new Map(); // key: `${userId}-${guildId}-${achievementId}-${tier}`
    this.NOTIFICATION_COOLDOWN = 10000; // 10 segundos de cooldown
    // ===========================================================================
  }

  setClient(client) {
    this.discordClient = client;
    logger.info('Discord client inyectado en AchievementService');
  }

  // ========== NUEVO: Método para limpiar cache periódicamente ==========
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.notificationCache.entries()) {
        if (now - timestamp > this.NOTIFICATION_COOLDOWN) {
          this.notificationCache.delete(key);
        }
      }
    }, 30000); // Limpiar cada 30 segundos
  }
  // ======================================================================

  // Cada track* aplica un $inc atómico y evalúa los tiers sobre el valor que
  // devuelve Mongo. El patrón anterior (findOne → mutar → save) perdía
  // incrementos cuando dos eventos del mismo usuario se solapaban.
  async bumpStat(userId, guildId, statField, delta) {
    return UserAchievement.findOneAndUpdate(
      { userId, guildId },
      { $inc: { [`stats.${statField}`]: delta }, $set: { updatedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  async trackMessage(userId, guildId, channelId = null) {
    try {
      const userAch = await this.bumpStat(userId, guildId, 'totalMessages', 1);
      await this.checkAndUnlockAchievements(userAch, 'messages', channelId);
    } catch (error) {
      logger.error('Error tracking message achievement:', error);
    }
  }

  async trackReaction(userId, guildId, channelId = null) {
    try {
      const userAch = await this.bumpStat(userId, guildId, 'totalReactions', 1);
      await this.checkAndUnlockAchievements(userAch, 'reactions', channelId);
    } catch (error) {
      logger.error('Error tracking reaction achievement:', error);
    }
  }

  async trackReactionGiven(userId, guildId, channelId = null) {
    try {
      const userAch = await this.bumpStat(userId, guildId, 'totalReactionsGiven', 1);
      await this.checkAndUnlockAchievements(userAch, 'reactions_given', channelId);
    } catch (error) {
      logger.error('Error tracking reaction given achievement:', error);
    }
  }

  async trackVoiceJoin(userId, guildId, channelId) {
    try {
      await UserAchievement.updateOne(
        { userId, guildId },
        { $set: { currentVoiceSession: { channelId, joinedAt: new Date() }, updatedAt: new Date() } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      logger.error('Error tracking voice join:', error);
    }
  }

  async trackVoiceLeave(userId, guildId, channelId = null) {
    try {
      // Cerrar la sesión y leer su pre-image en una sola operación: si llegan
      // dos salidas seguidas, solo la primera encuentra `joinedAt` y el tiempo
      // no se contabiliza dos veces.
      const previous = await UserAchievement.findOneAndUpdate(
        { userId, guildId, 'currentVoiceSession.joinedAt': { $ne: null } },
        { $set: { currentVoiceSession: { channelId: null, joinedAt: null } } }
      );
      if (!previous) return;

      const duration = Math.floor((Date.now() - previous.currentVoiceSession.joinedAt.getTime()) / 1000);
      if (duration <= 0) return;

      const userAch = await this.bumpStat(userId, guildId, 'totalVoiceTime', duration);
      await this.checkAndUnlockAchievements(userAch, 'voice_time', channelId);
    } catch (error) {
      logger.error('Error tracking voice leave:', error);
    }
  }

  async trackBoost(userId, guildId, channelId = null) {
    try {
      const userAch = await UserAchievement.findOneAndUpdate(
        { userId, guildId },
        { $set: { 'stats.hasBoosted': true, updatedAt: new Date() } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      await this.checkAndUnlockAchievements(userAch, 'boost', channelId);
    } catch (error) {
      logger.error('Error tracking boost achievement:', error);
    }
  }

  async trackBoostRemoved(userId, guildId) {
    try {
      await UserAchievement.updateOne(
        { userId, guildId },
        { $set: { 'stats.hasBoosted': false, updatedAt: new Date() } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      logger.info(`Usuario ${userId} removió su boost en guild ${guildId}`);
    } catch (error) {
      logger.error('Error tracking boost removal:', error);
    }
  }

  async getUserAchievement(userId, guildId) {
    // Las entradas de `achievements` se crean bajo demanda en
    // checkAndUnlockAchievements, así que no hace falta pre-sembrarlas aquí.
    return UserAchievement.findOneAndUpdate(
      { userId, guildId },
      { $setOnInsert: { achievements: [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  statValueFor(userAch, type) {
    switch (type) {
      case 'messages':        return userAch.stats.totalMessages;
      case 'reactions':       return userAch.stats.totalReactions;
      case 'reactions_given': return userAch.stats.totalReactionsGiven;
      case 'voice_time':      return userAch.stats.totalVoiceTime;
      case 'boost':           return userAch.stats.hasBoosted ? 1 : 0;
      default:                return 0;
    }
  }

  async checkAndUnlockAchievements(userAch, type, channelId = null) {
    const { userId, guildId } = userAch;

    try {
      const achievements = await getEnabledAchievements(guildId, type);
      if (achievements.length === 0) return;

      const currentValue = this.statValueFor(userAch, type);
      const unlocked = [];

      for (const achievement of achievements) {
        // Crear la entrada de progreso si falta. El $ne la hace idempotente
        // frente a dos comprobaciones concurrentes.
        await UserAchievement.updateOne(
          { userId, guildId, 'achievements.achievementId': { $ne: achievement._id } },
          { $push: { achievements: { achievementId: achievement._id, currentValue: 0, unlockedTiers: [] } } }
        );

        await UserAchievement.updateOne(
          { userId, guildId, 'achievements.achievementId': achievement._id },
          { $set: { 'achievements.$.currentValue': currentValue } }
        );

        const tiers = [...achievement.tiers].sort((a, b) => a.tier - b.tier);

        for (const tier of tiers) {
          if (currentValue < tier.target) continue;

          // La condición sobre unlockedTiers hace la concesión idempotente:
          // solo la primera escritura modifica el documento, y solo esa
          // notifica. El desbloqueo se persiste ANTES de anunciarlo.
          const res = await UserAchievement.updateOne(
            {
              userId,
              guildId,
              achievements: {
                $elemMatch: { achievementId: achievement._id, unlockedTiers: { $ne: tier.tier } }
              }
            },
            {
              $addToSet: { 'achievements.$.unlockedTiers': tier.tier },
              $set: { 'achievements.$.lastUnlockedAt': new Date() }
            }
          );

          if (res.modifiedCount === 1) {
            logger.info(`Usuario ${userId} desbloqueó: ${achievement.name} - ${tier.title} (tier ${tier.tier}) en guild ${guildId}`);
            unlocked.push({ achievement, tier });
          }
        }
      }

      // Un fallo al notificar no revierte el desbloqueo ya persistido, pero
      // tampoco debe impedir el resto de los anuncios ni la recompensa.
      for (const { achievement, tier } of unlocked) {
        try {
          await this.sendAchievementNotification(userId, guildId, achievement, tier, channelId);
        } catch (e) {
          logger.error(`No se pudo notificar ${achievement.name} (tier ${tier.tier}) a ${userId}:`, e?.message || e);
        }

        if (tier.rewardRoleId) {
          try {
            await this.assignRewardRole(userId, guildId, tier.rewardRoleId);
          } catch (e) {
            logger.error(`No se pudo asignar el rol de recompensa ${tier.rewardRoleId} a ${userId}:`, e?.message || e);
          }
        }
      }
    } catch (error) {
      logger.error('Error en checkAndUnlockAchievements:', error);
    }
  }

  async sendAchievementNotification(userId, guildId, achievement, tier, fallbackChannelId = null) {
    try {
      if (!achievement.notifications?.enabled) {
        return;
      }

      // ========== Verificación de cache al inicio ==========
      const cacheKey = `${userId}-${guildId}-${achievement._id}-${tier.tier}`;
      const lastNotification = this.notificationCache.get(cacheKey);
      
      if (lastNotification) {
        const timeSinceLastNotification = Date.now() - lastNotification;
        if (timeSinceLastNotification < this.NOTIFICATION_COOLDOWN) {
          logger.info(`⏭️  Notificación duplicada prevenida: ${achievement.name} tier ${tier.tier} para ${userId}`);
          return;
        }
      }
      
      // Actualizar timestamp (ya debería estar pero por si acaso)
      this.notificationCache.set(cacheKey, Date.now());
      // =====================================================

      if (!this.discordClient) {
        logger.warn('Discord client no disponible para notificación de logro');
        return;
      }

      const guild = await this.discordClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        logger.warn(`Guild ${guildId} no encontrado`);
        return;
      }

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        logger.warn(`Member ${userId} no encontrado en guild ${guildId}`);
        return;
      }

      const guildConfig = await getGuildConfig(guildId);
      
      const notificationChannelId = guildConfig?.achievementsConfig?.notificationChannelId 
        || achievement.notifications.channelId 
        || fallbackChannelId;
      
      if (!notificationChannelId) {
        logger.info('No hay canal de notificación configurado');
        return;
      }

      const channel = await guild.channels.fetch(notificationChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        logger.warn(`Canal ${notificationChannelId} no válido para notificaciones`);
        return;
      }

      const imageConfig = guildConfig?.images?.achievementNotification || {};

      const imageBuffer = await generateAchievementNotification({
        user: member.user,
        achievement,
        tier,
        imageUrl: imageConfig.url,
        blur: imageConfig.blur || 6,
        opacity: imageConfig.opacity || 0.7
      });

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'achievement.png' });

      let message = achievement.notifications.message 
        || guildConfig?.achievementsConfig?.defaultMessage 
        || '{mention} ha desbloqueado: **{achievement}** - {tier}!';
      
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

      logger.info(`📢 Notificación enviada: ${achievement.name} tier ${tier.tier} a ${member.user.tag}`);
      
    } catch (error) {
      logger.error('Error enviando notificación de logro:', error);
      // Limpiar cache en caso de error para permitir reintento
      const cacheKey = `${userId}-${guildId}-${achievement._id}-${tier.tier}`;
      this.notificationCache.delete(cacheKey);
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
    const achievements = await getEnabledAchievements(guildId);

    const progress = [];
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
      // Copia: el array viene de la caché compartida de definiciones.
      const sortedTiers = [...achievement.tiers].sort((a, b) => a.tier - b.tier);
      
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
        tierProgress = range > 0 ? Math.min(100, Math.max(0, Math.floor((current / range) * 100))) : 0;
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

    const totalProgress = totalTiers > 0 ? Math.floor((completedTiers / totalTiers) * 100) : 0;

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

const achievementService = new AchievementService();

// ========== NUEVO: Iniciar limpieza de cache ==========
achievementService.startCacheCleanup();
// ======================================================

export default achievementService;