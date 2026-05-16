import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';
import { query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { xpForLevel } from '../../bot/utils/levelSystem.js';

const router = express.Router();

// Simple cache en memoria para endpoints públicos: key = guildId:page:limit
const publicCache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of publicCache.entries()) {
    if (now - entry.ts > CACHE_TTL_MS) publicCache.delete(key);
  }
}, CACHE_TTL_MS);

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['totalXp', 'level', 'messageCount']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Rate limiter para ruta pública (por IP)
const publicLimiter = rateLimit({
  windowMs: 30 * 1000, // 30s
  max: 20, // max 20 requests por 30s por IP (aumentado para permitir más fetches)
  standardHeaders: true,
  legacyHeaders: false
});

// Rutas autenticadas existentes (se mantienen)
router.get('/:guildId', isAuthenticated, validatePagination, async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'totalXp';

    const skip = (page - 1) * limit;

    const users = await User.find({ guildId })
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ guildId });

    const usersNeedingFetch = users.filter(u => !u.username);
    const discordFetched = new Map();
    if (req.discordClient && usersNeedingFetch.length > 0) {
      await Promise.all(usersNeedingFetch.map(async u => {
        const discordUser = await req.discordClient.users.fetch(u.userId).catch(() => null);
        if (discordUser) {
          discordFetched.set(u.userId, discordUser);
          User.updateDiscordInfo(u.guildId, u.userId, discordUser).catch(err =>
            logger.warn('Error cacheando info de Discord:', err.message)
          );
        }
      }));
    }

    const enrichedUsers = users.map((user, index) => {
      const discordUser = discordFetched.get(user.userId);
      return {
        ...user.toObject(),
        rank: skip + index + 1,
        username: discordUser ? discordUser.username : user.username || null,
        discriminator: discordUser ? discordUser.discriminator : user.discriminator || null,
        avatar: discordUser ? discordUser.displayAvatarURL({ dynamic: true, size: 128 }) : user.avatar || null,
        progress: typeof user.getXpProgress === 'function' ? user.getXpProgress() : undefined,
      };
    });

    res.json({
      leaderboard: enrichedUsers,
      pagination: {
        page,
        limit,
        totalUsers: total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    logger.error('Error al obtener leaderboard:', error);
    res.status(500).json({ error: 'Error al obtener leaderboard' });
  }
});

// ========== RUTA PÚBLICA CON DISCORD FETCH ==========
router.get('/public/:guildId', publicLimiter, validatePagination, async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'totalXp';

    // ========== CACHE: Comprobar si hay datos en cache ==========
    const cacheKey = `${guildId}:${page}:${limit}:${sortBy}`;
    const cached = publicCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
      logger.info(`Cache hit para leaderboard público de ${guildId}`);
      return res.json(cached.value);
    }
    // ============================================================

    const skip = (page - 1) * limit;

    const users = await User.find({ guildId })
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments({ guildId });

    const usersNeedingFetch = users.filter(u => !u.username);
    const discordFetched = new Map();
    if (req.discordClient && usersNeedingFetch.length > 0) {
      await Promise.all(usersNeedingFetch.map(async u => {
        const discordUser = await req.discordClient.users.fetch(u.userId).catch(() => null);
        if (discordUser) {
          discordFetched.set(u.userId, discordUser);
          User.updateDiscordInfo(u.guildId, u.userId, discordUser).catch(err =>
            logger.warn('Error actualizando info de Discord en BD:', err.message)
          );
        }
      }));
    }

    const enriched = users.map((u, idx) => {
      const rank = skip + idx + 1;
      const currentLevelTotal = (typeof u.level === 'number') ? xpForLevel(u.level) : 0;
      const nextLevelTotal = (typeof u.level === 'number') ? xpForLevel(u.level + 1) : 0;
      const xpIntoLevel = Math.max(0, u.totalXp - currentLevelTotal);
      const xpForNext = Math.max(0, nextLevelTotal - currentLevelTotal);

      const discordUser = discordFetched.get(u.userId);
      return {
        userId: u.userId,
        level: u.level,
        totalXp: u.totalXp,
        messageCount: u.messageCount,
        rank,
        username: discordUser ? discordUser.username : u.username || null,
        discriminator: discordUser ? discordUser.discriminator : u.discriminator || null,
        avatar: discordUser ? discordUser.displayAvatarURL({ dynamic: true, size: 128 }) : u.avatar || null,
        progress: {
          xp: xpIntoLevel,
          xpForNextLevel: xpForNext,
          percent: xpForNext > 0 ? Math.floor((xpIntoLevel / xpForNext) * 100) : 100
        }
      };
    });

    const payload = {
      leaderboard: enriched,
      pagination: {
        page,
        limit,
        totalUsers: total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      }
    };

    // Guardar en cache
    publicCache.set(cacheKey, { ts: Date.now(), value: payload });

    res.json(payload);
  } catch (error) {
    logger.error('Error al obtener leaderboard público:', error);
    res.status(500).json({ error: 'Error al obtener leaderboard público' });
  }
});
// ===================================================

// Obtener top usuarios globales (todos los servidores)
router.get('/global/top', isAuthenticated, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const topUsers = await User.aggregate([
      {
        $group: {
          _id: '$userId',
          totalXp: { $sum: '$totalXp' },
          totalMessages: { $sum: '$messageCount' },
          servers: { $sum: 1 },
          username: { $first: '$username' },
          avatar: { $first: '$avatar' },
        }
      },
      { $sort: { totalXp: -1 } },
      { $limit: limit }
    ]);

    const usersNeedingFetch = topUsers.filter(u => !u.username);
    const discordFetched = new Map();
    if (req.discordClient && usersNeedingFetch.length > 0) {
      await Promise.all(usersNeedingFetch.map(async u => {
        const discordUser = await req.discordClient.users.fetch(u._id).catch(() => null);
        if (discordUser) discordFetched.set(u._id, discordUser);
      }));
    }

    const enriched = topUsers.map(u => {
      const discordUser = discordFetched.get(u._id);
      return {
        userId: u._id,
        totalXp: u.totalXp,
        totalMessages: u.totalMessages,
        servers: u.servers,
        username: discordUser ? discordUser.username : u.username || null,
        avatar: discordUser ? discordUser.displayAvatarURL({ dynamic: true, size: 128 }) : u.avatar || null,
      };
    });

    res.json({ top: enriched });
  } catch (error) {
    logger.error('Error al obtener top global:', error);
    res.status(500).json({ error: 'Error al obtener top global' });
  }
});

// Buscar usuarios en el leaderboard
router.get('/:guildId/search', isAuthenticated, [
  param('guildId').exists(),
  query('query').isString().isLength({ min: 2 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { query: q } = req.query;

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      guildId,
      username: { $regex: escaped, $options: 'i' }
    })
      .sort({ totalXp: -1 })
      .limit(20);

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const rank = typeof user.getRank === 'function' ? await user.getRank() : undefined;
        return {
          ...user.toObject(),
          rank,
          progress: typeof user.getXpProgress === 'function' ? user.getXpProgress() : undefined,
        };
      })
    );

    res.json({ results: enrichedUsers });
  } catch (error) {
    logger.error('Error en búsqueda de leaderboard:', error);
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

// Obtener estadísticas del servidor
router.get('/:guildId/stats', isAuthenticated, async (req, res) => {
  try {
    const { guildId } = req.params;

    const stats = await User.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalXp: { $sum: '$totalXp' },
          totalMessages: { $sum: '$messageCount' },
          avgLevel: { $avg: '$level' },
          maxLevel: { $max: '$level' },
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        totalUsers: 0,
        totalXp: 0,
        totalMessages: 0,
        avgLevel: 0,
        maxLevel: 0,
      });
    }

    const topUser = await User.findOne({ guildId })
      .sort({ totalXp: -1 })
      .limit(1);

    const mostActive = await User.findOne({ guildId })
      .sort({ messageCount: -1 })
      .limit(1);

    res.json({
      ...stats[0],
      topUser: topUser ? {
        userId: topUser.userId,
        username: topUser.username,
        level: topUser.level,
        totalXp: topUser.totalXp,
      } : null,
      mostActive: mostActive ? {
        userId: mostActive.userId,
        username: mostActive.username,
        messageCount: mostActive.messageCount,
      } : null,
    });
  } catch (error) {
    logger.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;