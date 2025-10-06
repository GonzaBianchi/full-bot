// backend/src/api/routes/autoRoles.js
import express from 'express';
import { isAuthenticated, hasGuildPermission } from '../middleware/auth.js';
import GuildModel from '../../models/Guild.js';
import logger from '../../utils/logger.js';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();

// Obtener configuración de auto-roles
router.get('/:guildId/config/auto-roles', isAuthenticated, hasGuildPermission, async (req, res) => {
  try {
    const { guildId } = req.params;
    let cfg = await GuildModel.findOne({ guildId });
    
    if (!cfg) {
      cfg = await GuildModel.create({ guildId });
    }
    
    res.json({ 
      autoRoles: cfg.autoRoles || {
        enabled: false,
        roles: [],
        restoreLevelRoles: true,
        welcomeChannelId: null,
        welcomeMessage: '👋 ¡Bienvenido {mention} al servidor!'
      }
    });
  } catch (e) {
    logger.error('Error al obtener config de auto-roles:', e);
    res.status(500).json({ error: 'Error al obtener configuración de auto-roles' });
  }
});

// Actualizar configuración completa de auto-roles
router.post('/:guildId/config/auto-roles', isAuthenticated, hasGuildPermission, [
  param('guildId').exists(),
  body('enabled').optional().isBoolean(),
  body('roles').optional().isArray(),
  body('roles.*').isString(),
  body('restoreLevelRoles').optional().isBoolean(),
  body('welcomeChannelId').optional(),
  body('welcomeMessage').optional().isString().isLength({ min: 1, max: 1000 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { enabled, roles, restoreLevelRoles, welcomeChannelId, welcomeMessage } = req.body;

    // Usar notación de punto para campos anidados
    const update = {};
    
    if (typeof enabled !== 'undefined') update['autoRoles.enabled'] = enabled;
    if (Array.isArray(roles)) update['autoRoles.roles'] = roles;
    if (typeof restoreLevelRoles !== 'undefined') update['autoRoles.restoreLevelRoles'] = restoreLevelRoles;
    if (typeof welcomeChannelId !== 'undefined') update['autoRoles.welcomeChannelId'] = welcomeChannelId;
    if (typeof welcomeMessage !== 'undefined') update['autoRoles.welcomeMessage'] = welcomeMessage;

    const cfg = await GuildModel.findOneAndUpdate(
      { guildId },
      { $set: update }, // ← Importante: usar $set
      { new: true, upsert: true }
    );
    
    logger.info(`✅ Auto-roles config updated for guild ${guildId}`);
    res.json({ autoRoles: cfg.autoRoles });
  } catch (e) {
    logger.error('Error al actualizar config de auto-roles:', e);
    res.status(500).json({ error: 'Error al actualizar configuración de auto-roles' });
  }
});

export default router;