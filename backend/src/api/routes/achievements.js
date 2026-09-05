import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import Achievement from '../../models/Achievement.js';
import UserAchievement from '../../models/UserAchievement.js';
import achievementService from '../../services/achievementService.js';
import { invalidateAchievements } from '../../utils/achievementDefsCache.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// ========== CRUD de Achievements ==========

// Listar todos los logros de un guild
router.get('/:guildId/config/achievements', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    const achievements = await Achievement.find({ guildId }).sort({ type: 1, createdAt: 1 }).limit(200).lean();
    
    res.json({ achievements });
  } catch (error) {
    logger.error('Error al obtener logros:', error);
    res.status(500).json({ error: 'Error al obtener logros' });
  }
});

// Obtener un logro específico
router.get('/:guildId/config/achievements/:id', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const achievement = await Achievement.findOne({ _id: id, guildId }).lean();
    
    if (!achievement) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }
    
    res.json({ achievement });
  } catch (error) {
    logger.error('Error al obtener logro:', error);
    res.status(500).json({ error: 'Error al obtener logro' });
  }
});

// Crear nuevo logro
router.post('/:guildId/config/achievements', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  body('type').isIn(['messages', 'reactions', 'voice_time', 'boost']),
  body('name').isString().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('icon').optional().isString().isLength({ max: 100 }),
  body('tiers').isArray().isLength({ min: 1, max: 10 }),
  body('tiers.*.tier').isInt({ min: 1 }),
  body('tiers.*.title').isString().isLength({ min: 1, max: 100 }),
  body('tiers.*.target').isInt({ min: 1 }),
  body('tiers.*.description').optional().isString().isLength({ max: 200 }),
  body('tiers.*.rewardRoleId').optional().isString(),
  body('tiers.*.emoji').optional().isString(),
  body('boostRoleId').optional().isString(),
  body('enabled').optional().isBoolean(),
  body('notifications.enabled').optional().isBoolean(),
  // ========== FIX: Validación personalizada para channelId ==========
  body('notifications.channelId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'string' && value.trim().length >= 1) return true;
      throw new Error('channelId debe ser un ID válido, string vacío o null');
    }),
  // ==================================================================
  body('notifications.message').optional().isString().isLength({ max: 500 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('❌ Errores de validación en POST /achievements:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type, name, description, icon, tiers, boostRoleId, enabled, notifications } = req.body;

    // Validar tiers
    const sortedTiers = [...tiers].sort((a, b) => a.tier - b.tier);
    for (let i = 0; i < sortedTiers.length; i++) {
      if (sortedTiers[i].tier !== i + 1) {
        return res.status(400).json({ error: 'Los tiers deben ser consecutivos (1, 2, 3...)' });
      }
      if (i > 0 && sortedTiers[i].target <= sortedTiers[i - 1].target) {
        return res.status(400).json({ error: 'Los targets deben ser incrementales' });
      }
    }

    // Si es tipo boost, validar rol
    if (type === 'boost' && !boostRoleId) {
      return res.status(400).json({ error: 'Los logros de tipo boost requieren un boostRoleId' });
    }

    const achievement = await Achievement.create({
      guildId,
      type,
      name,
      description: description || '',
      icon: icon || getDefaultIcon(type),
      tiers: sortedTiers,
      boostRoleId: boostRoleId || null,
      enabled: enabled !== undefined ? enabled : true,
      notifications: {
        enabled: notifications?.enabled !== undefined ? notifications.enabled : true,
        channelId: notifications?.channelId || null,
        message: notifications?.message || '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!'
      }
    });

    // Si es un logro de boost, sincronizar usuarios existentes
    if (type === 'boost' && boostRoleId) {
      const guild = req.guild || await req.discordClient.guilds.fetch(guildId).catch(() => null);
      if (guild) {
        achievementService.syncBoostRole(guild, boostRoleId).catch(err => {
          logger.warn('Error sincronizando boost role:', err);
        });
      }
    }

    logger.info(`✅ Logro creado: ${achievement.name} en guild ${guildId}`);
    invalidateAchievements(guildId);
    res.status(201).json({ achievement });
  } catch (error) {
    logger.error('Error creando logro:', error);
    res.status(500).json({ error: 'Error creando logro' });
  }
});

// Actualizar logro existente
router.put('/:guildId/config/achievements/:id', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  param('id').exists(),
  body('name').optional().isString().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('icon').optional().isString().isLength({ max: 100 }),
  
  // ========== FIX: Validación mejorada para tiers ==========
  body('tiers').optional().isArray({ min: 1, max: 10 }),
  body('tiers.*.tier').optional().isInt({ min: 1 }),
  body('tiers.*.title').optional().isString().isLength({ min: 1, max: 100 }),
  body('tiers.*.target').optional().isInt({ min: 1 }),
  body('tiers.*.description').optional().isString().isLength({ max: 200 }),
  body('tiers.*.emoji').optional().isString(),
  body('tiers.*._id').optional().isString(), // Permitir el _id de MongoDB
  // =========================================================
  
  // ========== FIX: rewardRoleId puede ser null o string ==========
  body('tiers.*.rewardRoleId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'string' && value.trim().length >= 1) return true;
      throw new Error('rewardRoleId debe ser un ID válido o null');
    }),
  // ==============================================================
  
  // ========== FIX: boostRoleId puede ser null o string ==========
  body('boostRoleId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'string' && value.trim().length >= 1) return true;
      throw new Error('boostRoleId debe ser un ID válido o null');
    }),
  // ==============================================================
  
  body('enabled').optional().isBoolean(),
  body('notifications.enabled').optional().isBoolean(),
  
  // ========== FIX: Validación personalizada para channelId ==========
  body('notifications.channelId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'string' && value.trim().length >= 1) return true;
      throw new Error('channelId debe ser un ID válido, string vacío o null');
    }),
  // ==================================================================
  
  body('notifications.message')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'string' && value.trim().length >= 1 && value.length <= 500) return true;
      throw new Error('message debe ser válido (1-500 caracteres) o null');
    }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('❌ Errores de validación en PUT /achievements:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
], async (req, res) => {
  try {
    const { guildId, id } = req.params;
    // Whitelist explícita de campos. Pasar `req.body` entero permitía
    // reasignar guildId a otro servidor y, con claves que empiezan por `$`,
    // ejecutar operadores de update arbitrarios.
    const ALLOWED = ['name', 'description', 'icon', 'tiers', 'boostRoleId', 'enabled'];
    const updates = {};
    for (const field of ALLOWED) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.body.notifications && typeof req.body.notifications === 'object') {
      const { enabled, channelId, message } = req.body.notifications;
      updates.notifications = {};
      if (enabled !== undefined) updates.notifications.enabled = enabled;
      if (channelId !== undefined) updates.notifications.channelId = channelId;
      if (message !== undefined) updates.notifications.message = message;
    }

    // Validar tiers si se están actualizando
    if (updates.tiers) {
      // Limpiar los _id de MongoDB antes de validar
      const cleanedTiers = updates.tiers.map(tier => {
        const { _id, ...tierWithoutId } = tier;
        return tierWithoutId;
      });
      
      const sortedTiers = [...cleanedTiers].sort((a, b) => a.tier - b.tier);
      
      for (let i = 0; i < sortedTiers.length; i++) {
        if (sortedTiers[i].tier !== i + 1) {
          return res.status(400).json({ error: 'Los tiers deben ser consecutivos' });
        }
        if (i > 0 && sortedTiers[i].target <= sortedTiers[i - 1].target) {
          return res.status(400).json({ error: 'Los targets deben ser incrementales' });
        }
      }
      
      updates.tiers = sortedTiers;
    }

    // Convertir string vacío a null para channelId
    if (updates.notifications?.channelId === '') {
      updates.notifications.channelId = null;
    }

    updates.updatedAt = new Date();

    const achievement = await Achievement.findOneAndUpdate(
      { _id: id, guildId },
      { $set: updates },
      { new: true }
    );

    if (!achievement) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }

    logger.info(`✅ Logro actualizado: ${achievement.name} en guild ${guildId}`);
    invalidateAchievements(guildId);
    res.json({ achievement });
  } catch (error) {
    logger.error('Error actualizando logro:', error);
    res.status(500).json({ error: 'Error actualizando logro' });
  }
});

// Eliminar logro
router.delete('/:guildId/config/achievements/:id', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId, id } = req.params;
    
    const achievement = await Achievement.findOneAndDelete({ _id: id, guildId });
    
    if (!achievement) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }

    logger.info(`🗑️ Logro eliminado: ${achievement.name} de guild ${guildId}`);
    invalidateAchievements(guildId);
    res.json({ ok: true, message: 'Logro eliminado correctamente' });
  } catch (error) {
    logger.error('Error eliminando logro:', error);
    res.status(500).json({ error: 'Error eliminando logro' });
  }
});

// Toggle enabled/disabled
router.patch('/:guildId/config/achievements/:id/toggle', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId, id } = req.params;

    // Update con pipeline: invierte `enabled` en una sola operación, en vez de
    // leer, negar y guardar (dos toggles simultáneos se perdían uno).
    const achievement = await Achievement.findOneAndUpdate(
      { _id: id, guildId },
      [{ $set: { enabled: { $not: '$enabled' }, updatedAt: '$$NOW' } }],
      { new: true }
    );

    if (!achievement) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }

    logger.info(`🔄 Logro ${achievement.enabled ? 'habilitado' : 'deshabilitado'}: ${achievement.name}`);
    invalidateAchievements(guildId);
    res.json({ achievement });
  } catch (error) {
    logger.error('Error toggling logro:', error);
    res.status(500).json({ error: 'Error al cambiar estado del logro' });
  }
});

// Obtener estadísticas de un logro
router.get('/:guildId/config/achievements/:id/stats', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId, id } = req.params;

    const achievement = await Achievement.findOne({ _id: id, guildId }).lean();
    if (!achievement) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }

    // El conteo por tier se hace en Mongo. Antes se cargaban en memoria TODOS
    // los UserAchievement del servidor y se recorrían una vez por tier.
    const [result] = await UserAchievement.aggregate([
      { $match: { guildId, 'achievements.achievementId': achievement._id } },
      {
        $project: {
          progress: {
            $first: {
              $filter: {
                input: '$achievements',
                as: 'a',
                cond: { $eq: ['$$a.achievementId', achievement._id] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          unlockedTiers: { $push: '$progress.unlockedTiers' }
        }
      }
    ]);

    const totalUsers = result?.totalUsers || 0;

    // Cuántos usuarios tienen desbloqueado cada tier.
    const unlockedPerTier = new Map();
    for (const tiers of result?.unlockedTiers || []) {
      for (const tier of tiers || []) {
        unlockedPerTier.set(tier, (unlockedPerTier.get(tier) || 0) + 1);
      }
    }

    const stats = {
      totalUsers,
      tierStats: [...achievement.tiers]
        .sort((a, b) => a.tier - b.tier)
        .map(tier => {
          const unlockedCount = unlockedPerTier.get(tier.tier) || 0;
          return {
            tier: tier.tier,
            title: tier.title,
            target: tier.target,
            unlockedCount,
            percentage: totalUsers > 0 ? Math.round((unlockedCount / totalUsers) * 100) : 0
          };
        })
    };

    res.json({ stats });
  } catch (error) {
    logger.error('Error obteniendo stats de logro:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Crear logros predeterminados para un guild
router.post('/:guildId/config/achievements/default', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;

    const existing = await Achievement.countDocuments({ guildId });
    if (existing > 0) {
      return res.status(400).json({ error: 'Ya existen logros configurados para este servidor' });
    }

    const defaultAchievements = [
      {
        guildId,
        type: 'messages',
        name: 'Mensajero',
        description: 'Envía mensajes en el servidor',
        icon: '💬',
        tiers: [
          { tier: 1, title: 'Novato', target: 100, emoji: '🥉', description: 'Primeros pasos' },
          { tier: 2, title: 'Conversador', target: 500, emoji: '🥈', description: 'Te gusta conversar' },
          { tier: 3, title: 'Charlatán', target: 1000, emoji: '🥇', description: 'Nunca te cansas' },
          { tier: 4, title: 'Leyenda', target: 5000, emoji: '💎', description: 'Eres una leyenda' },
          { tier: 5, title: 'Inmortal', target: 10000, emoji: '👑', description: 'No hay quien te pare' }
        ],
        enabled: true,
        notifications: {
          enabled: true,
          channelId: null,
          message: '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!'
        }
      },
      {
        guildId,
        type: 'reactions',
        name: 'Popular',
        description: 'Recibe reacciones en tus mensajes',
        icon: '⭐',
        tiers: [
          { tier: 1, title: 'Reconocido', target: 50, emoji: '⭐', description: 'Tus mensajes gustan' },
          { tier: 2, title: 'Apreciado', target: 250, emoji: '🌟', description: 'Eres muy querido' },
          { tier: 3, title: 'Celebridad', target: 1000, emoji: '✨', description: 'Una estrella brillante' },
          { tier: 4, title: 'Icono', target: 2500, emoji: '💫', description: 'Todo un icono' }
        ],
        enabled: true,
        notifications: {
          enabled: true,
          channelId: null,
          message: '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!'
        }
      },
      {
        guildId,
        type: 'voice_time',
        name: 'Vocal',
        description: 'Pasa tiempo en canales de voz',
        icon: '🎙️',
        tiers: [
          { tier: 1, title: 'Oyente', target: 3600, emoji: '🎧', description: '1 hora en voice' },
          { tier: 2, title: 'Conversador', target: 18000, emoji: '🎤', description: '5 horas en voice' },
          { tier: 3, title: 'Locutor', target: 36000, emoji: '📻', description: '10 horas en voice' },
          { tier: 4, title: 'Animador', target: 108000, emoji: '🎬', description: '30 horas en voice' },
          { tier: 5, title: 'Presentador', target: 360000, emoji: '🎭', description: '100 horas en voice' }
        ],
        enabled: true,
        notifications: {
          enabled: true,
          channelId: null,
          message: '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!'
        }
      },
      {
        guildId,
        type: 'boost',
        name: 'Booster',
        description: 'Da boost al servidor',
        icon: '🚀',
        tiers: [
          { tier: 1, title: 'Impulsor', target: 1, emoji: '⚡', description: 'Has impulsado el servidor' }
        ],
        enabled: true,
        notifications: {
          enabled: true,
          channelId: null,
          message: '🚀 {mention} ha desbloqueado el logro: **{achievement}**!'
        }
      },
      {
        guildId,
        type: 'reactions_given',
        name: 'Entusiasta',
        description: 'Añade reacciones a mensajes de otros',
        icon: '👍',
        tiers: [
          { tier: 1, title: 'Participativo', target: 50, emoji: '🙂', description: 'Reaccionaste a 50 mensajes' },
          { tier: 2, title: 'Apoyador', target: 250, emoji: '😃', description: 'Reaccionaste a 250 mensajes' },
          { tier: 3, title: 'Fanático', target: 1000, emoji: '🔥', description: 'Reaccionaste a 1000 mensajes' },
          { tier: 4, title: 'Incondicional', target: 2500, emoji: '💖', description: 'Reaccionaste a 2500 mensajes' }
        ],
        enabled: true,
        notifications: {
          enabled: true,
          channelId: null,
          message: '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!'
        }
      }
    ];


    const created = await Achievement.insertMany(defaultAchievements);

    logger.info(`✅ Logros predeterminados creados para guild ${guildId}`);
    invalidateAchievements(guildId);
    res.status(201).json({ 
      achievements: created,
      message: 'Logros predeterminados creados correctamente' 
    });
  } catch (error) {
    logger.error('Error creando logros predeterminados:', error);
    res.status(500).json({ error: 'Error creando logros predeterminados' });
  }
});

// Helper: obtener icono por defecto según el tipo
function getDefaultIcon(type) {
  const icons = {
    messages: '💬',
    reactions: '⭐',
    voice_time: '🎙️',
    boost: '🚀'
  };
  return icons[type] || '🏆';
}

export default router;