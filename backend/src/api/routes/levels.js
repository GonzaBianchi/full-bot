import express from 'express';
import logger from '../../utils/logger.js';
import Guild from '../../models/Guild.js';
import User from '../../models/User.js';
import { xpForLevel } from '../../bot/utils/levelSystem.js';
import { isAuthenticated, isGuildMember, hasGuildPermission } from '../middleware/auth.js';
import { invalidateGuildConfig } from '../../utils/guildConfigCache.js';

const router = express.Router();

// GET /api/levels/:guildId - información básica sobre el módulo de levels para un guild
router.get('/:guildId', isAuthenticated, isGuildMember, async (req, res) => {
  const { guildId } = req.params;
  try {
    const guild = await Guild.findOne({ guildId }).lean();
    const totalUsers = await User.countDocuments({ guildId });

    if (!guild) {
      return res.json({
        guildId,
        enabled: false,
        message: 'Configuración por defecto (guild no encontrada), module deshabilitado por defecto',
        totalUsers
      });
    }

    return res.json({
      guildId,
      enabled: true,
      config: {
        xpMultiplier: guild.xpMultiplier || 1,
        ignoredChannels: guild.ignoredChannels || [],
        levelRoles: guild.levelRoles || [],
        levelUpEnabled: guild.levelUpEnabled,
        levelUpChannelId: guild.levelUpChannelId,
        levelUpMessage: guild.levelUpMessage,
        leaderboardEnabled: guild.leaderboardEnabled
      },
      totalUsers
    });
  } catch (e) {
    logger.error('Error en /api/levels/:guildId', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/levels/:guildId/user/:userId - info de nivel de un usuario
router.get('/:guildId/user/:userId', isAuthenticated, isGuildMember, async (req, res) => {
  const { guildId, userId } = req.params;
  try {
    const user = await User.findOne({ guildId, userId }).lean();
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado en este servidor' });
    }

    const currentLevelTotal = xpForLevel(user.level);
    const nextLevelTotal = xpForLevel(user.level + 1);
    const xpIntoLevel = Math.max(0, user.totalXp - currentLevelTotal);
    const xpForNext = Math.max(0, nextLevelTotal - currentLevelTotal);

    // compute rank
    const higher = await User.countDocuments({ guildId, totalXp: { $gt: user.totalXp } });
    const rank = higher + 1;

    return res.json({
      userId: user.userId,
      level: user.level,
      totalXp: user.totalXp,
      messageCount: user.messageCount,
      progress: {
        xp: xpIntoLevel,
        xpForNextLevel: xpForNext,
        percent: xpForNext > 0 ? Math.floor((xpIntoLevel / xpForNext) * 100) : 100
      },
      rank
    });
  } catch (e) {
    logger.error('Error en /api/levels/:guildId/user/:userId', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/levels/:guildId - actualizar configuración parcial del guild (requires admin)
router.patch('/:guildId', isAuthenticated, hasGuildPermission, async (req, res) => {
  const { guildId } = req.params;
  const body = req.body || {};
  const updates = {};

  if (body.xpMultiplier !== undefined) {
    const v = Number(body.xpMultiplier);
    if (Number.isNaN(v) || v <= 0 || v > 10) return res.status(400).json({ error: 'xpMultiplier inválido (0 < n <= 10)' });
    updates.xpMultiplier = v;
  }

  if (body.ignoredChannels !== undefined) {
    if (!Array.isArray(body.ignoredChannels)) return res.status(400).json({ error: 'ignoredChannels debe ser un array de IDs' });
    updates.ignoredChannels = body.ignoredChannels.map(String);
  }

  if (body.levelUpEnabled !== undefined) updates.levelUpEnabled = Boolean(body.levelUpEnabled);
  if (body.levelUpChannelId !== undefined) updates.levelUpChannelId = body.levelUpChannelId ? String(body.levelUpChannelId) : null;
  if (body.levelUpMessage !== undefined) updates.levelUpMessage = String(body.levelUpMessage).slice(0, 1000);
  if (body.leaderboardEnabled !== undefined) updates.leaderboardEnabled = Boolean(body.leaderboardEnabled);

  try {
    const guild = await Guild.findOneAndUpdate(
      { guildId },
      { $set: updates },
      { upsert: true, new: true }
    ).lean();

    logger.info(`Guild ${guildId} config updated by user ${req.user.id}: ${JSON.stringify(updates)}`);
    invalidateGuildConfig(guildId);
    return res.json({ guildId, config: guild });
  } catch (e) {
    logger.error('Error actualizando config de guild:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/levels/:guildId/level-roles - añadir o actualizar una asignación level -> role
router.post('/:guildId/level-roles', isAuthenticated, hasGuildPermission, async (req, res) => {
  const { guildId } = req.params;
  const { level, roleId } = req.body || {};
  const lvl = Number(level);
  if (!Number.isInteger(lvl) || lvl <= 0) return res.status(400).json({ error: 'level inválido' });
  if (!roleId) return res.status(400).json({ error: 'roleId requerido' });

  try {
    // Si el nivel ya está configurado, actualizamos su rol...
    let guild = await Guild.findOneAndUpdate(
      { guildId, 'levelRoles.level': lvl },
      { $set: { 'levelRoles.$.roleId': String(roleId) } },
      { new: true }
    );

    // ...y si no, lo añadimos. La condición $ne evita duplicar el nivel cuando
    // dos administradores guardan a la vez (el patrón anterior era
    // findOne + save, que perdía uno de los dos cambios).
    if (!guild) {
      guild = await Guild.findOneAndUpdate(
        { guildId, 'levelRoles.level': { $ne: lvl } },
        { $push: { levelRoles: { level: lvl, roleId: String(roleId) } } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }

    invalidateGuildConfig(guildId);
    logger.info(`Level role upsert for guild ${guildId} by ${req.user.id}: level ${lvl} -> ${roleId}`);
    return res.json({ guildId, levelRoles: guild.levelRoles });
  } catch (e) {
    logger.error('Error en POST level-roles:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/levels/:guildId/level-roles/:level - eliminar asignación
router.delete('/:guildId/level-roles/:level', isAuthenticated, hasGuildPermission, async (req, res) => {
  const { guildId, level } = req.params;
  const lvl = Number(level);
  if (!Number.isInteger(lvl) || lvl <= 0) return res.status(400).json({ error: 'level inválido' });

  try {
    const guild = await Guild.findOneAndUpdate(
      { guildId },
      { $pull: { levelRoles: { level: lvl } } },
      { new: true }
    );
    if (!guild) return res.status(404).json({ error: 'Guild no encontrada' });

    invalidateGuildConfig(guildId);
    logger.info(`Level role removed for guild ${guildId} by ${req.user.id}: level ${lvl}`);
    return res.json({ guildId, levelRoles: guild.levelRoles });
  } catch (e) {
    logger.error('Error eliminando level role:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
