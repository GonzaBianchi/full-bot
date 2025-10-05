import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import RoleMenu from '../../models/RoleMenu.js';
import logger from '../../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

const router = express.Router({ mergeParams: true });

const MAX_OPTIONS = 20; // Límite de Discord para reacciones

// Listar role menus del guild
router.get('/:guildId/role-menus', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    const menus = await RoleMenu.find({ guildId }).sort({ createdAt: -1 }).lean();
    res.json({ menus });
  } catch (e) {
    logger.error('Error al listar role menus:', e);
    res.status(500).json({ error: 'Error al listar role menus' });
  }
});

// Crear role menu
router.post('/:guildId/role-menus', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  body('title').isString().isLength({ min: 1, max: 100 }),
  body('channelId').isString().isLength({ min: 1 }),
  body('exclusive').optional().isBoolean(),
  body('options').isArray().custom((options) => {
    if (options.length === 0) {
      throw new Error('Debe haber al menos una opción');
    }
    if (options.length > MAX_OPTIONS) {
      throw new Error(`Máximo ${MAX_OPTIONS} opciones permitidas`);
    }
    return true;
  }),
  body('options.*.roleId').isString().isLength({ min: 1 }),
  body('options.*.emojiIdentifier').isString().isLength({ min: 1 }),
  body('options.*.label').optional().isString().isLength({ max: 100 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { title, channelId, exclusive, options } = req.body;

    // Verificar que el bot está en el servidor
    const guild = req.discordClient ? await req.discordClient.guilds.fetch(guildId).catch(() => null) : null;
    if (!guild) {
      return res.status(404).json({ error: 'El bot no está en este servidor' });
    }

    // Verificar que el canal existe y es accesible
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({ error: 'Canal no válido o no es un canal de texto' });
    }

    // Verificar que todos los roles existen
    for (const opt of options) {
      const role = await guild.roles.fetch(opt.roleId).catch(() => null);
      if (!role) {
        return res.status(400).json({ error: `El rol ${opt.roleId} no existe en el servidor` });
      }
    }

    // Extraer emojiId de cada opción si aplica
    const processedOptions = options.map(opt => {
      const parts = opt.emojiIdentifier.split(':');
      let emojiId = null;
      
      // Formato "name:id" para emojis custom
      if (parts.length === 2 && /^\d+$/.test(parts[1])) {
        emojiId = parts[1];
      }
      
      return {
        emojiIdentifier: opt.emojiIdentifier,
        emojiId,
        roleId: opt.roleId,
        label: opt.label || ''
      };
    });

    const menu = await RoleMenu.create({ 
      guildId, 
      title, 
      channelId, 
      exclusive: !!exclusive, 
      options: processedOptions 
    });

    logger.info(`Role menu creado: ${menu._id} en guild ${guildId} por usuario ${req.user.id}`);
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
  body('title').optional().isString().isLength({ min: 1, max: 100 }),
  body('channelId').optional().isString().isLength({ min: 1 }),
  body('exclusive').optional().isBoolean(),
  body('options').optional().isArray().custom((options) => {
    if (options && options.length > MAX_OPTIONS) {
      throw new Error(`Máximo ${MAX_OPTIONS} opciones permitidas`);
    }
    return true;
  }),
  body('options.*.roleId').optional().isString().isLength({ min: 1 }),
  body('options.*.emojiIdentifier').optional().isString().isLength({ min: 1 }),
  body('options.*.label').optional().isString().isLength({ max: 100 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
], async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const update = { ...req.body };

    // Si hay opciones, procesarlas
    if (update.options && Array.isArray(update.options)) {
      update.options = update.options.map(opt => {
        const parts = opt.emojiIdentifier.split(':');
        let emojiId = null;
        
        if (parts.length === 2 && /^\d+$/.test(parts[1])) {
          emojiId = parts[1];
        }
        
        return {
          emojiIdentifier: opt.emojiIdentifier,
          emojiId,
          roleId: opt.roleId,
          label: opt.label || ''
        };
      });
    }

    const menu = await RoleMenu.findOneAndUpdate(
      { _id: id, guildId }, 
      update, 
      { new: true }
    );
    
    if (!menu) return res.status(404).json({ error: 'Role menu no encontrado' });
    
    logger.info(`Role menu actualizado: ${id} en guild ${guildId}`);
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
    
    // Buscar el menú antes de eliminarlo
    const menu = await RoleMenu.findOne({ _id: id, guildId });
    if (!menu) return res.status(404).json({ error: 'Role menu no encontrado' });

    // Si el menú fue publicado, intentar eliminar el mensaje
    if (menu.messageId && req.discordClient) {
      try {
        const guild = await req.discordClient.guilds.fetch(guildId).catch(() => null);
        if (guild) {
          const channel = await guild.channels.fetch(menu.channelId).catch(() => null);
          if (channel && channel.isTextBased()) {
            const message = await channel.messages.fetch(menu.messageId).catch(() => null);
            if (message) {
              await message.delete().catch(err => {
                logger.warn(`No se pudo eliminar mensaje de role menu: ${err.message}`);
              });
            }
          }
        }
      } catch (e) {
        logger.warn('Error eliminando mensaje de role menu:', e);
      }
    }

    await RoleMenu.findByIdAndDelete(id);
    
    logger.info(`Role menu eliminado: ${id} de guild ${guildId}`);
    res.json({ ok: true });
  } catch (e) {
    logger.error('Error eliminando role menu:', e);
    res.status(500).json({ error: 'Error eliminando role menu' });
  }
});

// Publicar (publish) - el bot envía el mensaje al canal con embed y reacciona con los emojis
router.post('/:guildId/role-menus/:id/publish', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  param('id').isString()
], async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const menu = await RoleMenu.findOne({ _id: id, guildId });
    
    if (!menu) return res.status(404).json({ error: 'Role menu no encontrado' });
    
    if (!menu.options || menu.options.length === 0) {
      return res.status(400).json({ error: 'El menú debe tener al menos una opción' });
    }

    // Obtener guild y canal
    const guild = req.discordClient ? await req.discordClient.guilds.fetch(guildId).catch(() => null) : null;
    if (!guild) return res.status(404).json({ error: 'El bot no está en este servidor' });

    const channel = await guild.channels.fetch(menu.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({ error: 'Canal no válido o no es un canal de texto' });
    }

    // Verificar permisos del bot
    const botMember = guild.members.me;
    if (!botMember) {
      return res.status(500).json({ error: 'No se pudo obtener información del bot en el servidor' });
    }

    const permissions = channel.permissionsFor(botMember);
    if (!permissions || !permissions.has(['SendMessages', 'AddReactions', 'EmbedLinks'])) {
      return res.status(403).json({ 
        error: 'El bot necesita permisos de: Enviar Mensajes, Agregar Reacciones y Incrustar Enlaces en este canal' 
      });
    }

    // Construir el embed
    const embed = new EmbedBuilder()
      .setTitle(menu.title)
      .setColor(0x5865F2) // Color Discord blurple
      .setDescription('Reacciona con los emojis para obtener o quitar roles')
      .setTimestamp()
      .setFooter({ text: menu.exclusive ? '⚠️ Modo Exclusivo: Solo puedes tener un rol de este menú' : 'Puedes tener múltiples roles de este menú' });

    // Agregar campos con las opciones
    const fields = [];
    for (const opt of menu.options) {
      const role = await guild.roles.fetch(opt.roleId).catch(() => null);
      const roleName = role ? role.name : 'Rol desconocido';
      
      // Determinar el emoji display
      let emojiDisplay = opt.emojiIdentifier;
      if (opt.emojiId) {
        // Es un emoji custom
        const emojiParts = opt.emojiIdentifier.split(':');
        const emojiName = emojiParts[0] || 'emoji';
        emojiDisplay = `<:${emojiName}:${opt.emojiId}>`;
      }
      
      const fieldValue = opt.label ? `${opt.label}` : `Obtén el rol ${roleName}`;
      fields.push({
        name: `${emojiDisplay} ${roleName}`,
        value: fieldValue,
        inline: false
      });
    }

    embed.addFields(fields);

    // Enviar mensaje
    let sent;
    try {
      sent = await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('Error enviando mensaje de role menu:', err);
      return res.status(500).json({ error: `Error enviando mensaje: ${err.message}` });
    }

    // Reaccionar con cada emoji
    const failedReactions = [];
    for (const opt of menu.options) {
      try {
        let emojiToReact = opt.emojiIdentifier;
        
        // Si tiene emojiId, es un emoji custom
        if (opt.emojiId) {
          emojiToReact = opt.emojiId;
        } else {
          // Si no tiene ID pero contiene ':', tomar la parte del nombre
          const parts = opt.emojiIdentifier.split(':');
          if (parts.length > 1) {
            emojiToReact = parts[0];
          }
        }
        
        await sent.react(emojiToReact);
        
        // Pequeño delay para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        logger.warn(`Error reaccionando con emoji ${opt.emojiIdentifier}:`, e.message);
        failedReactions.push(opt.emojiIdentifier);
      }
    }

    // Guardar messageId y marcar como publicado
    menu.messageId = sent.id;
    menu.published = true;
    await menu.save();

    logger.info(`Role menu publicado: ${id} en canal ${menu.channelId} del guild ${guildId}`);
    
    const response = { 
      menu, 
      messageId: sent.id,
      messageUrl: sent.url
    };
    
    if (failedReactions.length > 0) {
      response.warning = `No se pudieron agregar algunas reacciones: ${failedReactions.join(', ')}`;
    }

    res.json(response);
  } catch (e) {
    logger.error('Error publicando role menu:', e);
    res.status(500).json({ error: 'Error publicando role menu: ' + e.message });
  }
});

export default router;