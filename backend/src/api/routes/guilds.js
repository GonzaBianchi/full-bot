import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import GuildModel from '../../models/Guild.js';
import logger from '../../utils/logger.js';
import { body, param, validationResult } from 'express-validator';
import UserModel from '../../models/User.js';
import roleMenusRoutes from './roleMenus.js';
import autoRolesRoutes from './autoRoles.js';
import achievementsRoutes from './achievements.js';
import mediaFilterRoutes from './mediaFilter.js';
import { invalidateGuildConfig } from '../../utils/guildConfigCache.js';

const router = express.Router();

// Montar las rutas de role menus, auto-roles y achievements (importante: antes de las rutas con :guildId)
router.use('/', roleMenusRoutes);
router.use('/', autoRolesRoutes);
router.use('/', achievementsRoutes);
router.use('/', mediaFilterRoutes); 

// Obtener configuración de un guild
router.get('/:guildId/config', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    let cfg = await GuildModel.findOne({ guildId });
    if (!cfg) {
      cfg = await GuildModel.create({ guildId });
    }
    res.json({ config: cfg });
  } catch (e) {
    logger.error('Error al obtener config de guild:', e);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// Actualizar multiplicador de XP (desde panel)
router.post('/:guildId/config/xp-multiplier', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  body('multiplier').isFloat({ gt: 0 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { multiplier } = req.body;
    let cfg = await GuildModel.findOneAndUpdate({ guildId }, { xpMultiplier: multiplier }, { new: true, upsert: true });
    invalidateGuildConfig(guildId);
    res.json({ config: cfg });
  } catch (e) {
    logger.error('Error al actualizar multiplier:', e);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Actualizar canales ignorados
router.post('/:guildId/config/ignored-channels', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  body('channels').isArray(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channels } = req.body;
    let cfg = await GuildModel.findOneAndUpdate({ guildId }, { ignoredChannels: channels }, { new: true, upsert: true });
    invalidateGuildConfig(guildId);
    res.json({ config: cfg });
  } catch (e) {
    logger.error('Error al actualizar ignored channels:', e);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Nueva ruta: actualizar notificaciones de leveo (panel)
router.post('/:guildId/config/levelup', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  body('enabled').optional().isBoolean(),
  body('channelId')
    .optional({ nullable: true })
    .custom((value) => {
      // Aceptar null o undefined (para "mismo canal")
      if (value === null || value === undefined) {
        return true;
      }
      // Si tiene valor, debe ser un string válido
      if (typeof value === 'string' && value.trim().length >= 1) {
        return true;
      }
      throw new Error('channelId debe ser un ID de canal válido o null');
    }),
  body('message').optional().isString().isLength({ min: 1, max: 500 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('❌ Errores de validación en /levelup:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { enabled, channelId, message } = req.body;

    const update = {};
    if (typeof enabled !== 'undefined') update.levelUpEnabled = enabled;
    if (typeof channelId !== 'undefined') update.levelUpChannelId = channelId;
    if (typeof message !== 'undefined') update.levelUpMessage = message;

    const cfg = await GuildModel.findOneAndUpdate({ guildId }, update, { new: true, upsert: true });
    invalidateGuildConfig(guildId);
    logger.info(`✅ Configuración de levelup actualizada para guild ${guildId}`);
    res.json({ config: cfg });
  } catch (e) {
    logger.error('Error al actualizar levelup config:', e);
    res.status(500).json({ error: 'Error al actualizar configuración de leveo' });
  }
});

// Nueva ruta: actualizar level roles (array de objetos {level, roleId}) + stackRoles
router.post('/:guildId/config/level-roles', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  body('roles').isArray(),
  body('roles.*.level').isInt({ min: 1 }),
  body('roles.*.roleId').isString().isLength({ min: 1 }),
  body('stackRoles').optional().isBoolean(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { roles, stackRoles } = req.body;
    const update = { levelRoles: roles };
    if (typeof stackRoles === 'boolean') update.stackRoles = stackRoles;
    const cfg = await GuildModel.findOneAndUpdate({ guildId }, update, { new: true, upsert: true });
    invalidateGuildConfig(guildId);
    res.json({ config: cfg });
  } catch (e) {
    logger.error('Error al actualizar level roles:', e);
    res.status(500).json({ error: 'Error al actualizar roles de nivel' });
  }
});

// Obtener canales, roles y emojis del servidor (útil para popular selects en el panel)
router.get('/:guildId/resources', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    // req.guild es asignado por hasGuildPermission
    const guild = req.guild || (req.discordClient ? await req.discordClient.guilds.fetch(guildId).catch(() => null) : null);
    if (!guild) return res.status(404).json({ error: 'El bot no está en este servidor o no se pudo obtener la información' });

    // Canales: filtrar canales text-based (incluye GUILD_TEXT, GUILD_NEWS, etc.)
    let channels = [];
    try {
      const channelCollection = guild.channels.cache || new Map();
      channels = Array.from(channelCollection.values())
        .filter(ch => ch && typeof ch.type !== 'undefined' && ch.isTextBased && ch.isTextBased())
        .map(ch => ({ id: ch.id, name: ch.name, type: ch.type }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      logger.warn('No se pudieron listar canales desde cache:', e.message);
    }

    // Roles: excluir @everyone
    let roles = [];
    try {
      const rolesCollection = guild.roles.cache || new Map();
      roles = Array.from(rolesCollection.values())
        .filter(r => r && r.id !== guild.id)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      logger.warn('No se pudieron listar roles desde cache:', e.message);
    }

    // Emojis: listar emojis del servidor para picker en el panel
    let emojis = [];
    try {
      const emojiCollection = guild.emojis.cache || new Map();
      emojis = Array.from(emojiCollection.values()).map(e => ({
        id: e.id,
        name: e.name,
        animated: !!e.animated,
        // identifier usable para construir custom emoji: "name:id". Para unicode usar name.
        identifier: e.id ? `${e.name}:${e.id}` : e.name,
        // mention representa cómo se vería en un mensaje (<:name:id> o <a:name:id> para animados)
        mention: e.toString(),
        url: e.imageURL()
      }));
      
      // Agregar algunos emojis unicode comunes
      const commonEmojis = [
        { id: null, name: '✅', animated: false, identifier: '✅', mention: '✅' },
        { id: null, name: '❌', animated: false, identifier: '❌', mention: '❌' },
        { id: null, name: '⭐', animated: false, identifier: '⭐', mention: '⭐' },
        { id: null, name: '🎮', animated: false, identifier: '🎮', mention: '🎮' },
        { id: null, name: '🎨', animated: false, identifier: '🎨', mention: '🎨' },
        { id: null, name: '🎵', animated: false, identifier: '🎵', mention: '🎵' },
        { id: null, name: '📚', animated: false, identifier: '📚', mention: '📚' },
        { id: null, name: '💬', animated: false, identifier: '💬', mention: '💬' },
        { id: null, name: '🔔', animated: false, identifier: '🔔', mention: '🔔' },
        { id: null, name: '🌟', animated: false, identifier: '🌟', mention: '🌟' },
      ];
      
      emojis = [...commonEmojis, ...emojis];
    } catch (e) {
      logger.warn('No se pudieron listar emojis desde cache:', e.message);
    }

    res.json({ channels, roles, emojis });
  } catch (e) {
    logger.error('Error al obtener resources del guild:', e);
    res.status(500).json({ error: 'Error al obtener recursos del servidor' });
  }
});

// Obtener lista de servidores donde el usuario es admin y si el bot está presente
router.get('/available', isAuthenticated, async (req, res) => {
  try {
    const userGuilds = (req.user && req.user.guilds) || [];

    const manageable = []; // bot present && user is admin
    const invitables = []; // bot absent && user is admin

    for (const g of userGuilds) {
      const hasAdmin = (parseInt(g.permissions || '0') & 0x8) === 0x8;
      if (!hasAdmin) continue;

      const botInGuild = req.discordClient && req.discordClient.guilds.cache.has(g.id);

      if (botInGuild) {
        manageable.push({ id: g.id, name: g.name, icon: g.icon });
      } else {
        invitables.push({ id: g.id, name: g.name, icon: g.icon });
      }
    }

    res.json({ manageable, invitables });
  } catch (e) {
    logger.error('Error al obtener available guilds:', e);
    res.status(500).json({ error: 'Error al obtener servidores disponibles' });
  }
});

// Información básica del bot
router.get('/bot/info', async (req, res) => {
  try {
    const bot = req.discordClient && req.discordClient.user;
    if (!bot) return res.status(404).json({ error: 'Bot no conectado' });

    // Count guilds from client's cache
    const guildCount = req.discordClient?.guilds?.cache?.size || 0;

    // Compute a more accurate user count:
    let userCount = 0;
    try {
      const guildIds = req.discordClient?.guilds?.cache ? Array.from(req.discordClient.guilds.cache.keys()) : [];

      if (guildIds.length > 0 && UserModel && UserModel.distinct) {
        try {
          const distinct = await UserModel.distinct('userId', { guildId: { $in: guildIds } });
          if (Array.isArray(distinct) && distinct.length > 0) {
            userCount = distinct.length;
          }
        } catch (dbErr) {
          logger.warn('No se pudo obtener userCount desde la DB, se usará el recuento desde caché:', dbErr.message);
        }
      }

      // Fallback: sum guild.memberCount
      if (!userCount) {
        const guilds = req.discordClient.guilds.cache;
        if (guilds && guilds.size > 0) {
          userCount = Array.from(guilds.values()).reduce((acc, g) => acc + (g.memberCount || 0), 0);
        } else {
          userCount = req.discordClient.users?.cache?.size || 0;
        }
      }
    } catch (e) {
      logger.warn('Error calculando userCount, fallback a users.cache:', e.message);
      userCount = req.discordClient.users?.cache?.size || 0;
    }

    res.json({
      id: bot.id,
      username: bot.username,
      discriminator: bot.discriminator,
      avatarURL: bot.displayAvatarURL({ dynamic: true }),
      guildCount,
      userCount
    });
  } catch (e) {
    logger.error('Error al obtener bot info:', e);
    res.status(500).json({ error: 'Error al obtener información del bot' });
  }
});

// Public endpoint: obtener información básica del servidor (nombre, icono)
router.get('/public/:guildId/info', async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = req.discordClient ? await req.discordClient.guilds.fetch(guildId).catch(() => null) : null;
    if (!guild) return res.status(404).json({ error: 'El bot no está en este servidor o no se pudo obtener la información' });

    return res.json({
      id: guild.id,
      name: guild.name,
      iconURL: guild.icon ? guild.iconURL({ dynamic: true, size: 128 }) : null
    });
  } catch (e) {
    logger.error('Error al obtener public guild info:', e);
    res.status(500).json({ error: 'Error al obtener información del servidor' });
  }
});

// ========== CONFIGURACIÓN GLOBAL DE LOGROS ==========

// Obtener configuración global de logros
router.get('/:guildId/config/achievements-global', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    let cfg = await GuildModel.findOne({ guildId }).lean();
    if (!cfg) {
      cfg = await GuildModel.create({ guildId });
    }

    res.json({ 
      config: cfg.achievementsConfig || {
        notificationChannelId: null,
        defaultMessage: '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!'
      }
    });
  } catch (error) {
    logger.error('Error al obtener configuración global de logros:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// Actualizar configuración global de logros
router.post('/:guildId/config/achievements-global',
  isAuthenticated,
  hasGuildPermission,
  [
    param('guildId').exists(),
    body('notificationChannelId')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === undefined || value === '') return true;
        if (typeof value === 'string' && value.trim().length >= 1) return true;
        throw new Error('notificationChannelId debe ser un ID válido o null');
      }),
    body('defaultMessage').optional().isString().isLength({ min: 1, max: 500 }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { notificationChannelId, defaultMessage } = req.body;

      const update = {};
      if (notificationChannelId !== undefined) {
        update['achievementsConfig.notificationChannelId'] = notificationChannelId || null;
      }
      if (defaultMessage !== undefined) {
        update['achievementsConfig.defaultMessage'] = defaultMessage;
      }

      const cfg = await GuildModel.findOneAndUpdate(
        { guildId },
        { $set: update },
        { new: true, upsert: true }
      );

      logger.info(`✅ Configuración global de logros actualizada para guild ${guildId}`);
      res.json({ config: cfg.achievementsConfig });
    } catch (error) {
      logger.error('Error actualizando configuración global de logros:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }
);

// ========== CONFIGURACIÓN DE IMÁGENES ==========

// Obtener configuración de imágenes
router.get('/:guildId/config/images', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    let cfg = await GuildModel.findOne({ guildId }).lean();
    if (!cfg) {
      cfg = await GuildModel.create({ guildId });
    }

    res.json({ 
      images: cfg.images || {
        rankCard: { url: null, blur: 8, opacity: 0.5 },
        achievementNotification: { url: null, blur: 6, opacity: 0.7 }
      }
    });
  } catch (error) {
    logger.error('Error al obtener configuración de imágenes:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// Actualizar imagen de rank card
router.post('/:guildId/config/images/rank-card', 
  isAuthenticated, 
  hasGuildPermission, 
  [
    param('guildId').exists(),
    body('url').optional().isString().isURL().isLength({ max: 2048 }),
    body('blur').optional().isInt({ min: 0, max: 20 }),
    body('opacity').optional().isFloat({ min: 0, max: 1 }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { url, blur, opacity } = req.body;

      const update = {};
      if (url !== undefined) update['images.rankCard.url'] = url;
      if (blur !== undefined) update['images.rankCard.blur'] = blur;
      if (opacity !== undefined) update['images.rankCard.opacity'] = opacity;

      const cfg = await GuildModel.findOneAndUpdate(
        { guildId },
        { $set: update },
        { new: true, upsert: true }
      );

      logger.info(`✅ Imagen de rank card actualizada para guild ${guildId}`);
      res.json({ images: cfg.images });
    } catch (error) {
      logger.error('Error actualizando imagen de rank card:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }
);

// Actualizar imagen de notificación de logros
router.post('/:guildId/config/images/achievement-notification', 
  isAuthenticated, 
  hasGuildPermission, 
  [
    param('guildId').exists(),
    body('url').optional().isString().isURL().isLength({ max: 2048 }),
    body('blur').optional().isInt({ min: 0, max: 20 }),
    body('opacity').optional().isFloat({ min: 0, max: 1 }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { url, blur, opacity } = req.body;

      const update = {};
      if (url !== undefined) update['images.achievementNotification.url'] = url;
      if (blur !== undefined) update['images.achievementNotification.blur'] = blur;
      if (opacity !== undefined) update['images.achievementNotification.opacity'] = opacity;

      const cfg = await GuildModel.findOneAndUpdate(
        { guildId },
        { $set: update },
        { new: true, upsert: true }
      );

      logger.info(`✅ Imagen de notificación de logros actualizada para guild ${guildId}`);
      res.json({ images: cfg.images });
    } catch (error) {
      logger.error('Error actualizando imagen de notificación:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }
);

// Resetear configuración de imágenes
router.delete('/:guildId/config/images/:type', 
  isAuthenticated, 
  hasGuildPermission,
  async (req, res) => {
    try {
      const { guildId, type } = req.params;

      if (!['rank-card', 'achievement-notification'].includes(type)) {
        return res.status(400).json({ error: 'Tipo de imagen inválido' });
      }

      const field = type === 'rank-card' ? 'rankCard' : 'achievementNotification';
      
      const update = {
        [`images.${field}.url`]: null,
        [`images.${field}.blur`]: type === 'rank-card' ? 8 : 6,
        [`images.${field}.opacity`]: type === 'rank-card' ? 0.5 : 0.7
      };

      const cfg = await GuildModel.findOneAndUpdate(
        { guildId },
        { $set: update },
        { new: true, upsert: true }
      );

      logger.info(`✅ Configuración de imagen ${type} reseteada para guild ${guildId}`);
      res.json({ images: cfg.images });
    } catch (error) {
      logger.error('Error reseteando configuración de imagen:', error);
      res.status(500).json({ error: 'Error al resetear configuración' });
    }
  }
);

export default router;