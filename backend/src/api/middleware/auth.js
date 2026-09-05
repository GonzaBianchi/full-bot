import logger from '../../utils/logger.js';

// Discord entrega `permissions` como string porque el bitfield excede 32 bits.
// parseInt + `&` truncaba a 32 bits: funcionaba por casualidad con los flags
// bajos, pero BigInt es la única lectura correcta.
const ADMINISTRATOR = 1n << 3n;  // 0x8
const MANAGE_GUILD = 1n << 5n;   // 0x20

function permissionsOf(guildEntry) {
  try {
    return BigInt(guildEntry?.permissions ?? 0);
  } catch {
    return 0n;
  }
}

/** Devuelve la entrada del guild dentro de la lista OAuth del usuario, si está. */
export function findUserGuild(req, guildId) {
  const guilds = req.user?.guilds;
  if (!Array.isArray(guilds)) return undefined;
  return guilds.find(g => String(g.id) === String(guildId));
}

/** ¿Esa entrada de guild permite administrar el servidor? */
export function canManageGuild(guildEntry) {
  const perms = permissionsOf(guildEntry);
  return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
}

export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'No autenticado' });
};

/**
 * Comprueba que el bot esté en el servidor y lo deja en `req.guild`.
 * Devuelve null (y ya ha respondido) si no lo está.
 */
function attachBotGuild(req, res, guildId) {
  const botGuild = req.discordClient?.guilds?.cache?.get(guildId);
  if (!botGuild) {
    res.status(404).json({ error: 'El bot no está en este servidor' });
    return null;
  }
  req.guild = botGuild;
  return botGuild;
}

/**
 * Pertenencia: basta con que el usuario esté en el servidor. Es el mínimo para
 * leer datos de un guild concreto (leaderboard, stats, búsqueda).
 */
export const isGuildMember = (req, res, next) => {
  try {
    const guildId = req.params.guildId;

    if (!findUserGuild(req, guildId)) {
      return res.status(403).json({ error: 'No tienes acceso a este servidor' });
    }

    if (!attachBotGuild(req, res, guildId)) return;
    next();
  } catch (error) {
    logger.error('Error en isGuildMember:', error);
    res.status(500).json({ error: 'Error al verificar acceso' });
  }
};

/**
 * Administración: ADMINISTRATOR o MANAGE_GUILD. Es la única comprobación de
 * permisos de la API; `levels.js` tenía antes su propia copia divergente.
 */
export const hasGuildPermission = async (req, res, next) => {
  try {
    const guildId = req.params.guildId || req.body?.guildId;
    const guild = findUserGuild(req, guildId);

    if (!guild) {
      return res.status(403).json({ error: 'No tienes acceso a este servidor' });
    }

    if (!canManageGuild(guild)) {
      return res.status(403).json({ error: 'Necesitas permisos de administrador' });
    }

    if (!attachBotGuild(req, res, guildId)) return;
    next();
  } catch (error) {
    logger.error('Error en hasGuildPermission:', error);
    res.status(500).json({ error: 'Error al verificar permisos' });
  }
};
