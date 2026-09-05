import express from 'express';
import { isAuthenticated, isGuildMember } from '../middleware/auth.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';
import { query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { getLeaderboard, progressFor } from '../../services/leaderboardService.js';
import { addSseClient, removeSseClient } from '../../utils/sseClients.js';

const router = express.Router();

// Cache en memoria para el endpoint público: key = guildId:page:limit:sortBy.
// `page` va acotado y el Map tiene tope porque la clave la controla el cliente:
// con ?page=999999 arbitrarios crecía sin límite.
const publicCache = new Map();
const CACHE_TTL_MS = 30 * 1000;
const CACHE_MAX_ENTRIES = 500;
const CACHE_MAX_PAGE = 20;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of publicCache.entries()) {
    if (now - entry.ts > CACHE_TTL_MS) publicCache.delete(key);
  }
}, CACHE_TTL_MS).unref();

function cacheGet(key) {
  const entry = publicCache.get(key);
  return entry && Date.now() - entry.ts < CACHE_TTL_MS ? entry.value : null;
}

function cacheSet(key, value, page) {
  if (page > CACHE_MAX_PAGE) return;
  if (publicCache.size >= CACHE_MAX_ENTRIES) {
    // Desalojo simple: el Map preserva el orden de inserción.
    publicCache.delete(publicCache.keys().next().value);
  }
  publicCache.set(key, { ts: Date.now(), value });
}

const validatePagination = [
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
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
  windowMs: 30 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

function toResponse(result) {
  return {
    leaderboard: result.users,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalUsers: result.total,
      totalPages: result.pages
    }
  };
}

// Leaderboard del servidor. Exige pertenencia: antes bastaba con estar logueado
// con cualquier cuenta para leer el de cualquier guild.
router.get('/:guildId', isAuthenticated, isGuildMember, validatePagination, async (req, res) => {
  try {
    const result = await getLeaderboard(req.params.guildId, {
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      client: req.discordClient
    });

    res.json(toResponse(result));
  } catch (error) {
    logger.error('Error al obtener leaderboard:', error);
    res.status(500).json({ error: 'Error al obtener leaderboard' });
  }
});

// ========== SSE: actualizaciones en tiempo real del leaderboard ==========
router.get('/public/:guildId/events', publicLimiter, (req, res) => {
  const { guildId } = req.params;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('data: {"event":"connected"}\n\n');

  if (!addSseClient(guildId, res)) {
    res.end();
    return;
  }

  // Un comentario SSE cada 25 s: mantiene viva la conexión y detecta sockets
  // que ya no están, que antes se acumulaban indefinidamente.
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      removeSseClient(guildId, res);
    }
  }, 25 * 1000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(guildId, res);
  });
});
// =========================================================================

// ========== RUTA PÚBLICA ==========
router.get('/public/:guildId', publicLimiter, validatePagination, async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'totalXp';

    const cacheKey = `${guildId}:${page}:${limit}:${sortBy}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const result = await getLeaderboard(guildId, { page, limit, sortBy, client: req.discordClient });
    const payload = toResponse(result);

    cacheSet(cacheKey, payload, page);
    res.json(payload);
  } catch (error) {
    logger.error('Error al obtener leaderboard público:', error);
    res.status(500).json({ error: 'Error al obtener leaderboard público' });
  }
});
// ===================================================

// Top usuarios entre los servidores del usuario autenticado
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

    // Acotado a los servidores del usuario: sin el $match esto agregaba la
    // colección entera (escaneo completo) y mezclaba datos de guilds ajenos.
    const guildIds = (req.user?.guilds || []).map(g => String(g.id));
    if (guildIds.length === 0) {
      return res.json({ top: [] });
    }

    const topUsers = await User.aggregate([
      { $match: { guildId: { $in: guildIds } } },
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

    res.json({
      top: topUsers.map(u => ({
        userId: u._id,
        totalXp: u.totalXp,
        totalMessages: u.totalMessages,
        servers: u.servers,
        username: u.username || null,
        avatar: u.avatar || null,
      }))
    });
  } catch (error) {
    logger.error('Error al obtener top global:', error);
    res.status(500).json({ error: 'Error al obtener top global' });
  }
});

// Buscar usuarios en el leaderboard
router.get('/:guildId/search', isAuthenticated, isGuildMember, [
  param('guildId').exists(),
  query('query').isString().isLength({ min: 2, max: 100 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const escaped = String(req.query.query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // El rango se calcula dentro del propio pipeline. Antes se hacía un
    // countDocuments por resultado: hasta 20 consultas por búsqueda.
    // Requiere MongoDB 5.0+ ($setWindowFields).
    const results = await User.aggregate([
      { $match: { guildId } },
      {
        $setWindowFields: {
          sortBy: { totalXp: -1 },
          output: { rank: { $documentNumber: {} } }
        }
      },
      { $match: { username: { $regex: escaped, $options: 'i' } } },
      { $sort: { totalXp: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          userId: 1, level: 1, totalXp: 1, messageCount: 1,
          username: 1, discriminator: 1, avatar: 1, rank: 1
        }
      }
    ]);

    res.json({
      results: results.map(u => ({ ...u, progress: progressFor(u.level, u.totalXp) }))
    });
  } catch (error) {
    logger.error('Error en búsqueda de leaderboard:', error);
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

// Obtener estadísticas del servidor
router.get('/:guildId/stats', isAuthenticated, isGuildMember, async (req, res) => {
  try {
    const { guildId } = req.params;

    // Un solo pipeline: los dos findOne extra recorrían la colección otra vez.
    const [result] = await User.aggregate([
      { $match: { guildId } },
      {
        $facet: {
          totals: [{
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              totalXp: { $sum: '$totalXp' },
              totalMessages: { $sum: '$messageCount' },
              avgLevel: { $avg: '$level' },
              maxLevel: { $max: '$level' },
            }
          }],
          topUser: [
            { $sort: { totalXp: -1 } },
            { $limit: 1 },
            { $project: { _id: 0, userId: 1, username: 1, level: 1, totalXp: 1 } }
          ],
          mostActive: [
            { $sort: { messageCount: -1 } },
            { $limit: 1 },
            { $project: { _id: 0, userId: 1, username: 1, messageCount: 1 } }
          ]
        }
      }
    ]);

    const totals = result?.totals?.[0];

    if (!totals) {
      return res.json({
        totalUsers: 0,
        totalXp: 0,
        totalMessages: 0,
        avgLevel: 0,
        maxLevel: 0,
        topUser: null,
        mostActive: null
      });
    }

    res.json({
      ...totals,
      topUser: result.topUser[0] || null,
      mostActive: result.mostActive[0] || null
    });
  } catch (error) {
    logger.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
