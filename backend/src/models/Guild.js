import mongoose from 'mongoose';

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  
  // XP y niveles
  xpMultiplier: { type: Number, default: 1.0 },
  ignoredChannels: [{ type: String }],
  
  // Notificaciones de level up
  levelUpEnabled: { type: Boolean, default: true },
  levelUpChannelId: { type: String, default: null },
  levelUpMessage: { type: String, default: '🎉 {mention} ha subido al nivel **{level}**!' },
  
  // Roles de nivel
  levelRoles: [{
    level: { type: Number, required: true },
    roleId: { type: String, required: true }
  }],
  stackRoles: { type: Boolean, default: false },

  autoRoles: {
    enabled: { type: Boolean, default: false },
    roles: [{ type: String }],
    restoreLevelRoles: { type: Boolean, default: true },
    welcomeChannelId: { type: String, default: null },
    welcomeMessage: { 
      type: String, 
      default: '👋 ¡Bienvenido {mention} al servidor!' 
    }
  },
  
  // Configuración de imágenes
  images: {
    rankCard: {
      url: { type: String, default: null },
      blur: { type: Number, default: 8, min: 0, max: 20 },
      opacity: { type: Number, default: 0.5, min: 0, max: 1 }
    },
    achievementNotification: {
      url: { type: String, default: null },
      blur: { type: Number, default: 6, min: 0, max: 20 },
      opacity: { type: Number, default: 0.7, min: 0, max: 1 }
    }
  },
  
  // ========== Filtro de Multimedia ==========
  mediaFilter: {
    enabled: { type: Boolean, default: false },
    sourceChannels: [{ type: String }],
    targetChannelId: { type: String, default: null },
    types: {
      images: { type: Boolean, default: true },
      videos: { type: Boolean, default: true },
      gifs: { type: Boolean, default: true }
    },
    includeEmbeds: { type: Boolean, default: false },
    customMessage: { 
      type: String, 
      default: '📎 **{author}** compartió multimedia desde #{channel}' 
    }
  },
  
  // ========== Configuración Global de Logros ==========
  achievementsConfig: {
    notificationChannelId: { type: String, default: null },
    defaultMessage: { 
      type: String, 
      default: '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!' 
    }
  },
  
  // ========== NUEVO: Configuración de Cumpleaños ==========
  birthdays: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { 
      type: String, 
      default: '🎂 ¡Feliz cumpleaños {mention}! 🎉 ¡Que tengas un día increíble!' 
    },
    mentionRole: { type: String, default: null }, // roleId, @everyone, @here, o null
    embedEnabled: { type: Boolean, default: true },
    embedColor: { type: String, default: '#FF69B4' }
  },
  // ======================================================
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

GuildSchema.index({ guildId: 1 });

export default mongoose.models.Guild || mongoose.model('Guild', GuildSchema);