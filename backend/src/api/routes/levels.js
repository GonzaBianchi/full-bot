import express from 'express';
import logger from '../../../utils/logger.js';
import Guild from '../../../models/Guild.js';
import User from '../../../models/User.js';
import { xpForLevel } from '../../../bot/utils/levelSystem.js';

const router = express.Router();

// Middleware: require sesión
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'No autenticado' });
}

// Middleware: comprobar permisos administrativos en el guild
async function ensureGuildAdmin(req, res, next) {
  const guildId = req.params.guildId || (req.body && req.body.guildId);
  const user = req.user;

  // 1) Intentar comprobar mediante la información de OAuth (req.user.guilds)
  try {
    if (user && Array.isArray(user.guilds)) {
      const g = user.guilds.find(x => String(x.id) === String(guildId));
      if (g) {
        const perms = typeof g.permissions === 'string' ? parseInt(g.permissions, 10) : (g.permissions || 0);
        const ADMIN = 0x8;
        const MANAGE_GUILD = 0x20;
        if ((perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD) {
          return next();
        }
      }
    }
  } catch (e) {
    logger.warn('Error comprobando permisos via session:', e);
  }

  // 2) Fallback: comprobar mediante el cliente de Discord (si está disponible)
  try {
    const client = req.discordClient;
    if (client && client.guilds) {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (guild) {
        const member = await guild.members.fetch(req.user.id).catch(() => null);
        if (member && member.permissions) {
          if (member.permissions.has('Administrator') || member.permissions.has('ManageGuild')) {
            return next();
          }
        }
      }
    }
  } catch (e) {
    logger.warn('Error comprobando permisos via Discord client:', e);
  }

  return res.status(403).json({ error: 'No tienes permisos para administrar este servidor' });
}

// GET /api/levels/:guildId - información básica sobre el módulo de levels para un guild
router.get('/:guildId', async (req, res) => {
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
router.get('/:guildId/user/:userId', async (req, res) => {
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
router.patch('/:guildId', ensureAuth, ensureGuildAdmin, async (req, res) => {
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
    return res.json({ guildId, config: guild });
  } catch (e) {
    logger.error('Error actualizando config de guild:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/levels/:guildId/level-roles - añadir o actualizar una asignación level -> role
router.post('/:guildId/level-roles', ensureAuth, ensureGuildAdmin, async (req, res) => {
  const { guildId } = req.params;
  const { level, roleId } = req.body || {};
  const lvl = Number(level);
  if (!Number.isInteger(lvl) || lvl <= 0) return res.status(400).json({ error: 'level inválido' });
  if (!roleId) return res.status(400).json({ error: 'roleId requerido' });

  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild) {
      const created = await Guild.create({ guildId, levelRoles: [{ level: lvl, roleId: String(roleId) }] });
      logger.info(`Level role added for new guild ${guildId} by ${req.user.id}`);
      return res.json({ guildId, levelRoles: created.levelRoles });
    }

    const idx = (guild.levelRoles || []).findIndex(r => Number(r.level) === lvl);
    if (idx >= 0) {
      guild.levelRoles[idx].roleId = String(roleId);
    } else {
      guild.levelRoles.push({ level: lvl, roleId: String(roleId) });
    }

    await guild.save();
    logger.info(`Level role upsert for guild ${guildId} by ${req.user.id}: level ${lvl} -> ${roleId}`);
    return res.json({ guildId, levelRoles: guild.levelRoles });
  } catch (e) {
    logger.error('Error en POST level-roles:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/levels/:guildId/level-roles/:level - eliminar asignación
router.delete('/:guildId/level-roles/:level', ensureAuth, ensureGuildAdmin, async (req, res) => {
  const { guildId, level } = req.params;
  const lvl = Number(level);
  if (!Number.isInteger(lvl) || lvl <= 0) return res.status(400).json({ error: 'level inválido' });

  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild) return res.status(404).json({ error: 'Guild no encontrada' });

    guild.levelRoles = (guild.levelRoles || []).filter(r => Number(r.level) !== lvl);
    await guild.save();

    logger.info(`Level role removed for guild ${guildId} by ${req.user.id}: level ${lvl}`);
    return res.json({ guildId, levelRoles: guild.levelRoles });
  } catch (e) {
    logger.error('Error eliminando level role:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
