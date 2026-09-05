import RoleMenu from '../models/RoleMenu.js';
import logger from './logger.js';

// Los handlers de reacción se disparan con CUALQUIER reacción del servidor, y
// antes cada una hacía un RoleMenu.findOne. Este índice en memoria descarta las
// que no corresponden a un menú sin tocar Mongo.
const publishedMessageIds = new Set();
let loaded = false;

export async function loadRoleMenuIndex() {
  try {
    const menus = await RoleMenu.find({ messageId: { $ne: null } }).select('messageId').lean();

    publishedMessageIds.clear();
    for (const menu of menus) {
      if (menu.messageId) publishedMessageIds.add(menu.messageId);
    }

    loaded = true;
    logger.info(`Índice de menús de roles cargado: ${publishedMessageIds.size} mensajes`);
  } catch (e) {
    // Si no se pudo cargar dejamos `loaded` en false y el handler consulta la
    // BD como antes: preferimos ser lentos a dejar de asignar roles.
    logger.error('No se pudo cargar el índice de menús de roles:', e?.message || e);
  }
}

export function isRoleMenuMessage(messageId) {
  if (!loaded) return true; // sin índice no podemos descartar nada
  return publishedMessageIds.has(messageId);
}

export function trackRoleMenuMessage(messageId) {
  if (messageId) publishedMessageIds.add(messageId);
}

export function untrackRoleMenuMessage(messageId) {
  if (messageId) publishedMessageIds.delete(messageId);
}
