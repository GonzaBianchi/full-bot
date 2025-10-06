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
  
  // ========== NUEVO: Filtro de Multimedia ==========
  mediaFilter: {
    enabled: { type: Boolean, default: false },
    sourceChannels: [{ type: String }], // Canales de origen donde capturar multimedia
    targetChannelId: { type: String, default: null }, // Canal destino donde reenviar
    types: {
      images: { type: Boolean, default: true },
      videos: { type: Boolean, default: true },
      gifs: { type: Boolean, default: true }
    },
    includeEmbeds: { type: Boolean, default: false }, // Incluir embeds de links (YouTube, etc.)
    customMessage: { 
      type: String, 
      default: '📎 **{author}** compartió multimedia desde #{channel}' 
    }
  },
  // ================================================
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

GuildSchema.index({ guildId: 1 });

export default mongoose.models.Guild || mongoose.model('Guild', GuildSchema);