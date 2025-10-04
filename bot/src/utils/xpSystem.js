import User from '../models/User.js';
import mongoose from 'mongoose';

// Modelo para guardar el multiplicador global de XP
const XpConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  multiplier: { type: Number, default: 1 }
});
const XpConfig = mongoose.models.XpConfig || mongoose.model('XpConfig', XpConfigSchema);

/**
 * Calcula la XP necesaria para un nivel específico
 * @param {number} level - El nivel actual
 * @returns {number} XP necesaria para el siguiente nivel
 */
export function calculateLevelXp(level) {
  // Nueva fórmula: XP requerida para subir al nivel n = 5×(n²) + 50×n + 100
  return 5 * Math.pow(level, 2) + 50 * level + 100;
}

// Multiplicador global de XP (por defecto x1, cacheado en memoria)
let xpMultiplier = 1;

export async function setXpMultiplier(mult) {
  if ([1, 2, 4, 6].includes(mult)) {
    xpMultiplier = mult;
    await XpConfig.findOneAndUpdate(
      { key: 'global' },
      { multiplier: mult },
      { upsert: true, new: true }
    );
  }
}

export async function getXpMultiplier() {
  // Si ya está cacheado, devolverlo
  if (xpMultiplier) return xpMultiplier;
  // Si no, leer de la base de datos
  const config = await XpConfig.findOne({ key: 'global' });
  xpMultiplier = config?.multiplier || 1;
  return xpMultiplier;
}

// Al arrancar el bot, sincronizar el valor cacheado
(async () => {
  const config = await XpConfig.findOne({ key: 'global' });
  xpMultiplier = config?.multiplier || 1;
})();

/**
 * Añade XP a un usuario y sube de nivel si corresponde
 * @param {string} userId - ID del usuario
 * @param {string} guildId - ID del servidor
 * @param {number} amount - Cantidad de XP a añadir
 * @returns {Promise<Object>} - Objeto de usuario actualizado
 */
export async function addXp(userId, guildId, amount) {
  // Aplicar multiplicador global
  const mult = await getXpMultiplier();
  const xpToAdd = Math.floor(amount * mult);
  // Buscar y actualizar en una sola operación (más eficiente)
  const user = await User.findOneAndUpdate(
    { userId, guildId },
    { $inc: { xp: xpToAdd } },
    { upsert: true, new: true }
  );

  // Comprobar si el usuario debe subir de nivel
  let leveledUp = false;
  let neededXp = calculateLevelXp(user.level);
  
  // Bucle para permitir subir múltiples niveles si se añade mucha XP de golpe
  while (user.xp >= neededXp) {
    // Subir de nivel y restar la XP usada
    user.level += 1;
    user.xp -= neededXp;
    leveledUp = true;
    // Recalcular XP para el siguiente nivel
    neededXp = calculateLevelXp(user.level);
  }
  
  if (leveledUp) {
    await user.save();
  }

  return user;
}

/**
 * Quita XP a un usuario y baja de nivel si corresponde
 * @param {string} userId - ID del usuario
 * @param {string} guildId - ID del servidor
 * @param {number} amount - Cantidad de XP a quitar
 * @returns {Promise<Object>} - Objeto de usuario actualizado
 */
export async function removeXp(userId, guildId, amount) {
  // Obtener el usuario actual
  let user = await User.findOne({ userId, guildId });
  
  // Si no existe el usuario, crear uno con valores por defecto
  if (!user) {
    user = new User({ userId, guildId, xp: 0, level: 1 });
  }
  
  // Quitar XP
  user.xp -= amount;
  
  // Si la XP es negativa, bajar niveles hasta que sea positiva o nivel 1
  while (user.xp < 0 && user.level > 1) {
    user.level -= 1;
    user.xp += calculateLevelXp(user.level - 1); // Sumar XP del nivel anterior
  }
  
  // Evitar XP negativa en nivel 1
  if (user.level === 1 && user.xp < 0) {
    user.xp = 0;
  }
  
  // Guardar cambios
  await user.save();
  return user;
}

/**
 * Establece un nivel y XP específicos para un usuario (admin)
 * @param {string} userId - ID del usuario
 * @param {string} guildId - ID del servidor
 * @param {number} level - Nivel a establecer
 * @param {number} xp - XP a establecer (opcional)
 * @returns {Promise<Object>} - Objeto de usuario actualizado
 */
export async function setLevelAndXp(userId, guildId, level, xp = 0) {
  // Asegurarse de que el nivel es al menos 1
  const newLevel = Math.max(1, level);
  
  // Asegurarse de que la XP es al menos 0
  const newXp = Math.max(0, xp);
  
  // Establecer nivel y XP
  const user = await User.findOneAndUpdate(
    { userId, guildId },
    { level: newLevel, xp: newXp },
    { upsert: true, new: true }
  );
  
  return user;
}

/**
 * Obtiene la posición del usuario en el ranking del servidor
 * @param {string} userId - ID del usuario
 * @param {string} guildId - ID del servidor
 * @returns {Promise<number>} - Posición en el ranking (1 = primero)
 */
export async function getUserRank(userId, guildId) {
  const userDoc = await User.findOne({ userId, guildId });
  
  // Si el usuario no existe, devolver última posición
  if (!userDoc) {
    return (await User.countDocuments({ guildId })) + 1;
  }
  
  // Primero obtenemos todos los usuarios con más nivel o igual nivel pero más XP
  const usersAbove = await User.countDocuments({
    guildId,
    $or: [
      { level: { $gt: userDoc.level } },
      {
        level: userDoc.level,
        xp: { $gt: userDoc.xp }
      }
    ]
  });

  // La posición es el número de usuarios por encima + 1
  return usersAbove + 1;
}

/**
 * Obtiene los usuarios con mayor nivel/XP en el servidor
 * @param {string} guildId - ID del servidor
 * @param {number} limit - Número máximo de usuarios a obtener
 * @returns {Promise<Array>} - Array con los usuarios ordenados por nivel y XP
 */
export async function getTopUsers(guildId, limit = 10) {
  return User.find({ guildId })
    .sort({ level: -1, xp: -1 })
    .limit(limit)
    .lean();
}