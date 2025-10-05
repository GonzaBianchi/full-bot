import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import Achievement from '../../models/Achievement.js';
import achievementService from '../../services/achievementService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Listar todos los logros de un guild
router.get('/:guildId/config/achievements', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    const achievements = await Achievement.find({ guildId }).sort({ type: 1, createdAt: 1 });
    
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
    const achievement = await Achievement.findOne({ _id: id, guildId });
    
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
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type, name, description, icon, tiers, boostRoleId, enabled } = req.body;

    // Validar que los tiers estén ordenados correctamente
    const sortedTiers = [...tiers].sort((a, b) => a.tier - b.tier);
    for (let i = 0; i < sortedTiers.length; i++) {
      if (sortedTiers[i].tier !== i + 1) {
        return res.status(400).json({ error: 'Los tiers deben ser consecutivos (1, 2, 3...)' });
      }
      if (i > 0 && sortedTiers[i].target <= sortedTiers[i - 1].target) {
        return res.status(400).json({ error: 'Los targets deben ser incrementales' });
      }
    }

    // Si es tipo boost, validar que haya un rol configurado
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
      enabled: enabled !== undefined ? enabled : true
    });

    // Si es un logro de boost, sincronizar usuarios existentes con el rol
    if (type === 'boost' && boostRoleId) {
      const guild = req.guild || await req.discordClient.guilds.fetch(guildId).catch(() => null);
      if (guild) {
        achievementService.syncBoostRole(guild, boostRoleId).catch(err => {
          logger.warn('Error sincronizando boost role:', err);
        });
      }
    }

    logger.info(`✅ Logro creado: ${achievement.name} en guild ${guildId}`);
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
  body('tiers').optional().isArray().isLength({ min: 1, max: 10 }),
  body('tiers.*.tier').optional().isInt({ min: 1 }),
  body('tiers.*.title').optional().isString().isLength({ min: 1, max: 100 }),
  body('tiers.*.target').optional().isInt({ min: 1 }),
  body('tiers.*.description').optional().isString().isLength({ max: 200 }),
  body('tiers.*.rewardRoleId').optional().isString(),
  body('tiers.*.emoji').optional().isString(),
  body('boostRoleId').optional().isString(),
  body('enabled').optional().isBoolean(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
], async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const updates = req.body;

    // Validar tiers si se están actualizando
    if (updates.tiers) {
      const sortedTiers = [...updates.tiers].sort((a, b) => a.tier - b.tier);
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

    updates.updatedAt = new Date();

    const achievement = await Achievement.findOneAndUpdate(
      { _id: id, guildId },
      updates,
      { new: true }
    );

    if (!achievement) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }

    logger.info(`✅ Logro actualizado: ${achievement.name} en guild ${guildId}`);
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
    
    const achievement = await Achievement.findOne({ _id: id, guildId });
    
    if (!achievement) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }

    achievement.enabled = !achievement.enabled;
    achievement.updatedAt = new Date();
    await achievement.save();

    logger.info(`🔄 Logro ${achievement.enabled ? 'habilitado' : 'deshabilitado'}: ${achievement.name}`);
    res.json({ achievement });
  } catch (error) {
    logger.error('Error toggling logro:', error);
    res.status(500).json({ error: 'Error al cambiar estado del logro' });
  }
});

// Obtener estadísticas de un logro (cuántos usuarios lo han completado, etc.)
router.get('/:guildId/config/achievements/:id/stats', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId, id } = req.params;
    
    const achievement = await Achievement.findOne({ _id: id, guildId });
    if (!achievement) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }

    const UserAchievement = (await import('../../models/UserAchievement.js')).default;
    
    // Obtener todos los usuarios que tienen progreso en este logro
    const users = await UserAchievement.find({
      guildId,
      'achievements.achievementId': achievement._id
    });

    const stats = {
      totalUsers: users.length,
      tierStats: []
    };

    // Estadísticas por tier
    for (const tier of achievement.tiers.sort((a, b) => a.tier - b.tier)) {
      const unlockedCount = users.filter(user => {
        const progress = user.achievements.find(
          a => a.achievementId.toString() === achievement._id.toString()
        );
        return progress && progress.unlockedTiers.includes(tier.tier);
      }).length;

      stats.tierStats.push({
        tier: tier.tier,
        title: tier.title,
        target: tier.target,
        unlockedCount,
        percentage: users.length > 0 ? Math.round((unlockedCount / users.length) * 100) : 0
      });
    }

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

    // Verificar que no existan logros ya
    const existing = await Achievement.countDocuments({ guildId });
    if (existing > 0) {
      return res.status(400).json({ error: 'Ya existen logros configurados para este servidor' });
    }

    const defaultAchievements = [
      {
        guildId,
        type: 'messages',
        name: '💬 Mensajero',
        description: 'Envía mensajes en el servidor',
        icon: '💬',
        tiers: [
          { tier: 1, title: 'Novato', target: 100, emoji: '🥉', description: 'Primeros pasos' },
          { tier: 2, title: 'Conversador', target: 500, emoji: '🥈', description: 'Te gusta conversar' },
          { tier: 3, title: 'Charlatán', target: 1000, emoji: '🥇', description: 'Nunca te cansas' },
          { tier: 4, title: 'Leyenda', target: 5000, emoji: '💎', description: 'Eres una leyenda' },
          { tier: 5, title: 'Inmortal', target: 10000, emoji: '👑', description: 'No hay quien te pare' }
        ],
        enabled: true
      },
      {
        guildId,
        type: 'reactions',
        name: '⭐ Popular',
        description: 'Recibe reacciones en tus mensajes',
        icon: '⭐',
        tiers: [
          { tier: 1, title: 'Reconocido', target: 50, emoji: '⭐', description: 'Tus mensajes gustan' },
          { tier: 2, title: 'Apreciado', target: 250, emoji: '🌟', description: 'Eres muy querido' },
          { tier: 3, title: 'Celebridad', target: 1000, emoji: '✨', description: 'Una estrella brillante' },
          { tier: 4, title: 'Icono', target: 2500, emoji: '💫', description: 'Todo un icono' }
        ],
        enabled: true
      },
      {
        guildId,
        type: 'voice_time',
        name: '🎙️ Vocal',
        description: 'Pasa tiempo en canales de voz',
        icon: '🎙️',
        tiers: [
          { tier: 1, title: 'Oyente', target: 3600, emoji: '🎧', description: '1 hora en voice' }, // 1 hour
          { tier: 2, title: 'Conversador', target: 18000, emoji: '🎤', description: '5 horas en voice' }, // 5 hours
          { tier: 3, title: 'Locutor', target: 36000, emoji: '📻', description: '10 horas en voice' }, // 10 hours
          { tier: 4, title: 'Animador', target: 108000, emoji: '🎬', description: '30 horas en voice' }, // 30 hours
          { tier: 5, title: 'Presentador', target: 360000, emoji: '🎭', description: '100 horas en voice' } // 100 hours
        ],
        enabled: true
      }
    ];

    const created = await Achievement.insertMany(defaultAchievements);

    logger.info(`✅ Logros predeterminados creados para guild ${guildId}`);
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