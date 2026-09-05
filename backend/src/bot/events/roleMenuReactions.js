import { PermissionFlagsBits } from 'discord.js';
import RoleMenu from '../../models/RoleMenu.js';
import logger from '../../utils/logger.js';
import { isRoleMenuMessage } from '../../utils/roleMenuIndex.js';

// messageReactionAdd y messageReactionRemove compartían ~180 líneas idénticas:
// resolución de partials, búsqueda del menú, emparejado del emoji y todos los
// chequeos de permisos y jerarquía. Aquí eso vive una sola vez.

function matchOption(menu, emoji) {
  const emojiKey = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;

  return menu.options.find(o => {
    if (o.emojiIdentifier === emojiKey) return true;
    if (emoji.id && o.emojiId === emoji.id) return true;
    if (!emoji.id && o.emojiIdentifier === emoji.name) return true;

    const parts = o.emojiIdentifier.split(':');
    return parts.length === 2 && parts[1] === emoji.id;
  });
}

async function resolvePartials(reaction) {
  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    return true;
  } catch (e) {
    logger.warn('No se pudo resolver la reacción parcial:', e?.message || e);
    return false;
  }
}

/**
 * Devuelve todo lo necesario para actuar sobre la reacción, o null si no
 * corresponde a un menú de roles o falta algún permiso.
 */
async function resolveContext(client, reaction, user) {
  if (user.bot) return null;
  if (!await resolvePartials(reaction)) return null;

  // Descarte barato: la inmensa mayoría de las reacciones del servidor no son
  // de un menú, y antes cada una costaba una consulta a Mongo.
  const messageId = reaction.message.id;
  if (!isRoleMenuMessage(messageId)) return null;

  const menu = await RoleMenu.findOne({ messageId }).lean();
  if (!menu) return null;

  const option = matchOption(menu, reaction.emoji);
  if (!option) return null;

  const guild = reaction.message.guild || await client.guilds.fetch(menu.guildId).catch(() => null);
  if (!guild) {
    logger.warn(`Guild ${menu.guildId} no encontrado para role menu`);
    return null;
  }

  const botMember = guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    logger.warn(`Bot sin permiso ManageRoles en guild ${guild.id}`);
    return null;
  }

  // Sin `force: true`: forzaba una petición HTTP a Discord por cada reacción.
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    logger.warn(`Member ${user.id} no encontrado en guild ${guild.id}`);
    return null;
  }

  const role = guild.roles.cache.get(option.roleId)
    || await guild.roles.fetch(option.roleId).catch(() => null);
  if (!role) {
    logger.warn(`Rol ${option.roleId} no encontrado en guild ${guild.id}`);
    return null;
  }

  if (botMember.roles.highest.comparePositionTo(role) <= 0) {
    logger.warn(`Bot no puede gestionar el rol ${role.name} (jerarquía) en guild ${guild.id}`);
    return null;
  }

  return { menu, guild, member, role, option };
}

async function clearOtherReactions(reaction, menu, option, userId) {
  const message = reaction.message;

  for (const other of menu.options) {
    if (other.roleId === option.roleId) continue;

    const otherReaction = message.reactions.cache.find(r => {
      if (other.emojiId && r.emoji.id === other.emojiId) return true;
      if (!other.emojiId && r.emoji.name === other.emojiIdentifier) return true;

      const key = r.emoji.id ? `${r.emoji.name}:${r.emoji.id}` : r.emoji.name;
      return key === other.emojiIdentifier;
    });

    if (otherReaction) {
      await otherReaction.users.remove(userId).catch(err =>
        logger.warn(`No se pudo remover la reacción de ${userId}:`, err.message)
      );
    }
  }
}

export async function onRoleMenuReactionAdd(client, reaction, user) {
  try {
    const ctx = await resolveContext(client, reaction, user);
    if (!ctx) return;

    const { menu, guild, member, role, option } = ctx;

    await member.roles.add(role.id, `Autorole: ${menu.title}`);
    logger.info(`Rol ${role.name} agregado a ${user.tag} en guild ${guild.name}`);

    if (!menu.exclusive) return;

    // Una sola llamada a Discord para quitar todos los demás roles del menú,
    // en vez de un remove por opción.
    const toRemove = menu.options
      .filter(o => o.roleId !== option.roleId && member.roles.cache.has(o.roleId))
      .map(o => o.roleId);

    if (toRemove.length > 0) {
      await member.roles.remove(toRemove, `Autorole exclusivo: ${menu.title}`).catch(err =>
        logger.warn(`No se pudieron remover roles exclusivos de ${user.tag}:`, err.message)
      );
    }

    await clearOtherReactions(reaction, menu, option, user.id);
  } catch (e) {
    logger.error('Error en messageReactionAdd handler:', e);
  }
}

export async function onRoleMenuReactionRemove(client, reaction, user) {
  try {
    const ctx = await resolveContext(client, reaction, user);
    if (!ctx) return;

    const { menu, guild, member, role } = ctx;
    if (!member.roles.cache.has(role.id)) return;

    await member.roles.remove(role.id, `Autorole removido: ${menu.title}`);
    logger.info(`Rol ${role.name} removido de ${user.tag} en guild ${guild.name}`);
  } catch (e) {
    logger.error('Error en messageReactionRemove handler:', e);
  }
}

export function registerRoleMenuReactions(client) {
  client.on('messageReactionAdd', (reaction, user) => onRoleMenuReactionAdd(client, reaction, user));
  client.on('messageReactionRemove', (reaction, user) => onRoleMenuReactionRemove(client, reaction, user));
}

export default registerRoleMenuReactions;
