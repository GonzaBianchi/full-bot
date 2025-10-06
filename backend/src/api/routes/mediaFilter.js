// backend/src/api/routes/mediaFilter.js
import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import GuildModel from '../../models/Guild.js';
import logger from '../../utils/logger.js';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();

// Obtener configuración del filtro multimedia
router.get('/:guildId/config/media-filter', 
  isAuthenticated, 
  hasGuildPermission, 
  async (req, res) => {
    try {
      const { guildId } = req.params;
      
      let cfg = await GuildModel.findOne({ guildId }).lean();
      if (!cfg) {
        cfg = await GuildModel.create({ guildId });
      }

      res.json({ 
        mediaFilter: cfg.mediaFilter || {
          enabled: false,
          sourceChannels: [],
          targetChannelId: null,
          types: {
            images: true,
            videos: true,
            gifs: true
          },
          includeEmbeds: false,
          customMessage: '📎 **{author}** compartió multimedia desde #{channel}'
        }
      });
    } catch (error) {
      logger.error('Error al obtener config de media filter:', error);
      res.status(500).json({ error: 'Error al obtener configuración' });
    }
  }
);

// Actualizar configuración del filtro multimedia
router.post('/:guildId/config/media-filter',
  isAuthenticated,
  hasGuildPermission,
  [
    param('guildId').exists(),
    body('enabled').optional().isBoolean(),
    body('sourceChannels').optional().isArray(),
    body('targetChannelId').optional({ nullable: true }).isString(),
    body('types').optional().isObject(),
    body('types.images').optional().isBoolean(),
    body('types.videos').optional().isBoolean(),
    body('types.gifs').optional().isBoolean(),
    body('includeEmbeds').optional().isBoolean(),
    body('customMessage').optional().isString().isLength({ min: 1, max: 500 }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('❌ Errores de validación en media-filter:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { enabled, sourceChannels, targetChannelId, types, includeEmbeds, customMessage } = req.body;

      const update = {};
      if (typeof enabled !== 'undefined') update['mediaFilter.enabled'] = enabled;
      if (typeof sourceChannels !== 'undefined') update['mediaFilter.sourceChannels'] = sourceChannels;
      if (typeof targetChannelId !== 'undefined') update['mediaFilter.targetChannelId'] = targetChannelId;
      if (typeof includeEmbeds !== 'undefined') update['mediaFilter.includeEmbeds'] = includeEmbeds;
      if (typeof customMessage !== 'undefined') update['mediaFilter.customMessage'] = customMessage;
      
      // Actualizar tipos individuales
      if (types) {
        if (typeof types.images !== 'undefined') update['mediaFilter.types.images'] = types.images;
        if (typeof types.videos !== 'undefined') update['mediaFilter.types.videos'] = types.videos;
        if (typeof types.gifs !== 'undefined') update['mediaFilter.types.gifs'] = types.gifs;
      }

      const cfg = await GuildModel.findOneAndUpdate(
        { guildId },
        { $set: update },
        { new: true, upsert: true }
      );

      logger.info(`✅ Configuración de media filter actualizada para guild ${guildId}`);
      res.json({ mediaFilter: cfg.mediaFilter });
    } catch (error) {
      logger.error('Error actualizando media filter:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }
);

// Resetear configuración del filtro multimedia
router.delete('/:guildId/config/media-filter',
  isAuthenticated,
  hasGuildPermission,
  async (req, res) => {
    try {
      const { guildId } = req.params;

      const cfg = await GuildModel.findOneAndUpdate(
        { guildId },
        {
          $set: {
            'mediaFilter.enabled': false,
            'mediaFilter.sourceChannels': [],
            'mediaFilter.targetChannelId': null,
            'mediaFilter.types.images': true,
            'mediaFilter.types.videos': true,
            'mediaFilter.types.gifs': true,
            'mediaFilter.includeEmbeds': false,
            'mediaFilter.customMessage': '📎 **{author}** compartió multimedia desde #{channel}'
          }
        },
        { new: true, upsert: true }
      );

      logger.info(`✅ Configuración de media filter reseteada para guild ${guildId}`);
      res.json({ mediaFilter: cfg.mediaFilter });
    } catch (error) {
      logger.error('Error reseteando media filter:', error);
      res.status(500).json({ error: 'Error al resetear configuración' });
    }
  }
);

export default router;