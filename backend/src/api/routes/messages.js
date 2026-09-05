import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import { EmbedBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Enviar mensaje como el bot
router.post('/:guildId/messages/send', 
  isAuthenticated, 
  hasGuildPermission,
  [
    param('guildId').exists(),
    body('channelId').isString().notEmpty(),
    body('type').isIn(['text', 'embed']),
    body('content').optional().isString().isLength({ max: 2000 }),
    
    // Validaciones para embed
    body('embed.title').optional().isString().isLength({ max: 256 }),
    body('embed.description').optional().isString().isLength({ max: 4096 }),
    body('embed.color').optional().isString(),
    body('embed.footer').optional().isString().isLength({ max: 2048 }),
    body('embed.thumbnail').optional().isURL(),
    body('embed.image').optional().isURL(),
    body('embed.author.name').optional().isString().isLength({ max: 256 }),
    body('embed.author.iconUrl').optional().isURL(),
    body('embed.fields').optional().isArray({ max: 25 }),
    body('embed.fields.*.name').optional().isString().isLength({ min: 1, max: 256 }),
    body('embed.fields.*.value').optional().isString().isLength({ min: 1, max: 1024 }),
    body('embed.fields.*.inline').optional().isBoolean(),
    
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { channelId, type, content, embed } = req.body;

      // Verificar que el bot está en el servidor
      const guild = await req.discordClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        return res.status(404).json({ error: 'El bot no está en este servidor' });
      }

      // Verificar que el canal existe
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }

      // Verificar que es un canal de texto
      if (!channel.isTextBased()) {
        return res.status(400).json({ error: 'El canal debe ser un canal de texto' });
      }

      // Verificar permisos del bot
      const botMember = guild.members.me;
      if (!botMember.permissionsIn(channel).has('SendMessages')) {
        return res.status(403).json({ error: 'El bot no tiene permisos para enviar mensajes en este canal' });
      }

      const messagePayload = {};

      if (type === 'text') {
        // Mensaje de texto simple
        if (!content || content.trim().length === 0) {
          return res.status(400).json({ error: 'El contenido del mensaje no puede estar vacío' });
        }
        messagePayload.content = content;
      } else if (type === 'embed') {
        // Mensaje embed
        if (!embed || (!embed.title && !embed.description)) {
          return res.status(400).json({ error: 'El embed debe tener al menos un título o descripción' });
        }

        const embedBuilder = new EmbedBuilder();

        if (embed.title) embedBuilder.setTitle(embed.title);
        if (embed.description) embedBuilder.setDescription(embed.description);
        if (embed.color) {
          // Convertir color hex a decimal
          const colorHex = embed.color.replace('#', '');
          embedBuilder.setColor(parseInt(colorHex, 16));
        }
        if (embed.footer) embedBuilder.setFooter({ text: embed.footer });
        if (embed.thumbnail) embedBuilder.setThumbnail(embed.thumbnail);
        if (embed.image) embedBuilder.setImage(embed.image);
        if (embed.author?.name) {
          const authorData = { name: embed.author.name };
          if (embed.author.iconUrl) authorData.iconURL = embed.author.iconUrl;
          embedBuilder.setAuthor(authorData);
        }
        if (embed.fields && Array.isArray(embed.fields)) {
          for (const field of embed.fields) {
            if (field.name && field.value) {
              embedBuilder.addFields({
                name: field.name,
                value: field.value,
                inline: field.inline || false
              });
            }
          }
        }

        embedBuilder.setTimestamp();
        messagePayload.embeds = [embedBuilder];

        // Si hay contenido adicional (fuera del embed)
        if (content && content.trim().length > 0) {
          messagePayload.content = content;
        }
      }

      // Enviar el mensaje
      const sentMessage = await channel.send(messagePayload);

      logger.info(`Mensaje enviado por ${req.user.username} en guild ${guildId}, canal ${channel.name}`);

      res.json({
        success: true,
        message: {
          id: sentMessage.id,
          channelId: sentMessage.channelId,
          url: sentMessage.url
        }
      });
    } catch (error) {
      logger.error('Error enviando mensaje:', error);
      res.status(500).json({ 
        error: 'Error al enviar el mensaje',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;