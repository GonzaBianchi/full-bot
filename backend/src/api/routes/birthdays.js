// backend/src/api/routes/birthday.js
import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import GuildModel from '../../models/Guild.js';
import logger from '../../utils/logger.js';
import { invalidateGuildConfig } from '../../utils/guildConfigCache.js';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();

// ========== Obtener configuración de cumpleaños ==========
router.get('/:guildId/config/birthdays', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Un GET no debe escribir: si el servidor aún no tiene documento,
    
    // devolvemos los defaults del esquema sin crearlo.
    
    const cfg = await GuildModel.findOne({ guildId }).lean()
    
      || new GuildModel({ guildId }).toObject();

    res.json({ 
      birthdays: cfg.birthdays || {
        enabled: false,
        channelId: null,
        message: '🎂 ¡Feliz cumpleaños {mention}! 🎉 ¡Que tengas un día increíble!',
        mentionRole: null,
        embedEnabled: true,
        embedColor: '#FF69B4'
      }
    });
  } catch (error) {
    logger.error('Error al obtener configuración de cumpleaños:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// ========== Actualizar configuración de cumpleaños ==========
router.post('/:guildId/config/birthdays', 
  isAuthenticated, 
  hasGuildPermission,
  [
    param('guildId').exists(),
    body('enabled').optional().isBoolean(),
    body('channelId')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim().length >= 1) return true;
        throw new Error('channelId debe ser un ID de canal válido o null');
      }),
    body('message').optional().isString().isLength({ min: 1, max: 1000 }),
    body('mentionRole')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === undefined) return true;
        if (value === '@everyone' || value === '@here') return true;
        if (typeof value === 'string' && value.trim().length >= 1) return true;
        throw new Error('mentionRole debe ser un ID de rol válido, @everyone, @here o null');
      }),
    body('embedEnabled').optional().isBoolean(),
    body('embedColor').optional().isString().matches(/^#[0-9A-Fa-f]{6}$/),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('❌ Errores de validación en /birthdays:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { enabled, channelId, message, mentionRole, embedEnabled, embedColor } = req.body;

      const update = {};
      if (typeof enabled !== 'undefined') update['birthdays.enabled'] = enabled;
      if (typeof channelId !== 'undefined') update['birthdays.channelId'] = channelId;
      if (typeof message !== 'undefined') update['birthdays.message'] = message;
      if (typeof mentionRole !== 'undefined') update['birthdays.mentionRole'] = mentionRole;
      if (typeof embedEnabled !== 'undefined') update['birthdays.embedEnabled'] = embedEnabled;
      if (typeof embedColor !== 'undefined') update['birthdays.embedColor'] = embedColor;

      const cfg = await GuildModel.findOneAndUpdate(
        { guildId },
        { $set: update },
        { new: true, upsert: true }
      );

      logger.info(`✅ Configuración de cumpleaños actualizada para guild ${guildId}`);
      invalidateGuildConfig(guildId);
      res.json({ birthdays: cfg.birthdays });
    } catch (error) {
      logger.error('Error actualizando configuración de cumpleaños:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }
);

// ========== Resetear configuración de cumpleaños ==========
router.delete('/:guildId/config/birthdays', 
  isAuthenticated, 
  hasGuildPermission,
  async (req, res) => {
    try {
      const { guildId } = req.params;

      const update = {
        'birthdays.enabled': false,
        'birthdays.channelId': null,
        'birthdays.message': '🎂 ¡Feliz cumpleaños {mention}! 🎉 ¡Que tengas un día increíble!',
        'birthdays.mentionRole': null,
        'birthdays.embedEnabled': true,
        'birthdays.embedColor': '#FF69B4'
      };

      const cfg = await GuildModel.findOneAndUpdate(
        { guildId },
        { $set: update },
        { new: true, upsert: true }
      );

      logger.info(`✅ Configuración de cumpleaños reseteada para guild ${guildId}`);
      invalidateGuildConfig(guildId);
      res.json({ birthdays: cfg.birthdays });
    } catch (error) {
      logger.error('Error reseteando configuración de cumpleaños:', error);
      res.status(500).json({ error: 'Error al resetear configuración' });
    }
  }
);

export default router;