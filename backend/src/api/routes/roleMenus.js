import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import RoleMenu from '../../models/RoleMenu.js';
import logger from '../../utils/logger.js';

const router = express.Router({ mergeParams: true });

// Listar role menus del guild
router.get('/:guildId/role-menus', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    const menus = await RoleMenu.find({ guildId }).lean();
    res.json({ menus });
  } catch (e) {
    logger.error('Error al listar role menus:', e);
    res.status(500).json({ error: 'Error al listar role menus' });
  }
});

// Crear role menu
router.post('/:guildId/role-menus', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  body('title').isString().isLength({ min: 1 }),
  body('channelId').isString().isLength({ min: 1 }),
  body('exclusive').optional().isBoolean(),
  body('options').isArray(),
  body('options.*.roleId').isString().isLength({ min: 1 }),
  body('options.*.emojiIdentifier').isString().isLength({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { title, channelId, exclusive, options } = req.body;
    const menu = await RoleMenu.create({ guildId, title, channelId, exclusive: !!exclusive, options });
    res.json({ menu });
  } catch (e) {
    logger.error('Error creando role menu:', e);
    res.status(500).json({ error: 'Error creando role menu' });
  }
});

// Editar role menu
router.put('/:guildId/role-menus/:id', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  param('id').isString(),
  body('title').optional().isString().isLength({ min: 1 }),
  body('channelId').optional().isString().isLength({ min: 1 }),
  body('exclusive').optional().isBoolean(),
  body('options').optional().isArray(),
  body('options.*.roleId').optional().isString().isLength({ min: 1 }),
  body('options.*.emojiIdentifier').optional().isString().isLength({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const update = req.body;
    const menu = await RoleMenu.findOneAndUpdate({ _id: id, guildId }, update, { new: true });
    if (!menu) return res.status(404).json({ error: 'Role menu no encontrado' });
    res.json({ menu });
  } catch (e) {
    logger.error('Error actualizando role menu:', e);
    res.status(500).json({ error: 'Error actualizando role menu' });
  }
});

// Eliminar role menu
router.delete('/:guildId/role-menus/:id', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  param('id').isString()
], async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const deleted = await RoleMenu.findOneAndDelete({ _id: id, guildId });
    if (!deleted) return res.status(404).json({ error: 'Role menu no encontrado' });
    res.json({ ok: true });
  } catch (e) {
    logger.error('Error eliminando role menu:', e);
    res.status(500).json({ error: 'Error eliminando role menu' });
  }
});

// Publicar (publish) - el bot envía el mensaje al canal y reacciona con los emojis
router.post('/:guildId/role-menus/:id/publish', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  param('id').isString()
], async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const menu = await RoleMenu.findOne({ _id: id, guildId });
    if (!menu) return res.status(404).json({ error: 'Role menu no encontrado' });

    // Obtener guild y canal
    const guild = req.discordClient ? await req.discordClient.guilds.fetch(guildId).catch(() => null) : null;
    if (!guild) return res.status(404).json({ error: 'El bot no está en este servidor' });

    const channel = await guild.channels.fetch(menu.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return res.status(400).json({ error: 'Canal no válido' });

    // Construir embed/descripcion
    const description = menu.options.map(opt => `${opt.emojiIdentifier} — <@&${opt.roleId}> ${opt.label ? `- ${opt.label}` : ''}`).join('\n');
    const sent = await channel.send({ content: `**${menu.title}**\n\n${description}` });

    // Reaccionar con cada emoji. Para custom emoji debemos usar identifier "name:id" -> <:{name}:{id}>
    for (const opt of menu.options) {
      try {
        // If emojiIdentifier contains ':' and ends with digits, assume custom and use `<:name:id>` format
        if (opt.emojiIdentifier.includes(':') && /:\d+$/.test(opt.emojiIdentifier)) {
          const [name, id] = opt.emojiIdentifier.split(':');
          await sent.react(id).catch(err => { logger.warn('Failed to react with custom emoji id', id, err); });
        } else {
          // unicode emoji or name
          await sent.react(opt.emojiIdentifier).catch(err => { logger.warn('Failed to react with emoji', opt.emojiIdentifier, err); });
        }
      } catch (e) {
        logger.warn('Error reaccionando al mensaje de role menu:', e);
      }
    }

    // Guardar messageId y marcar como publicado
    menu.messageId = sent.id;
    menu.published = true;
    await menu.save();

    res.json({ menu, messageId: sent.id });
  } catch (e) {
    logger.error('Error publicando role menu:', e);
    res.status(500).json({ error: 'Error publicando role menu' });
  }
});

export default router;
